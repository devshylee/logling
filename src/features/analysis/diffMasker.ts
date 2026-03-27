/**
 * diffMasker.ts
 * Masks PII, secrets, API keys, and other sensitive data from Git diffs
 * before sending to Gemini, as required by the Logling Security Protocol.
 */

type MaskingRule = {
  name: string;
  pattern: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
};

const MASKING_RULES: MaskingRule[] = [
  // API Keys & Secrets (generic patterns)
  {
    name: 'generic_secret',
    pattern: /(?:api[_-]?key|secret|token|apikey|access_token|auth_token)\s*[:=]\s*["']?([A-Za-z0-9+/=_\-.]{20,})["']?/gi,
    replacement: '[REDACTED:API_KEY]',
  },
  // AWS credentials
  {
    name: 'aws_access_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    replacement: '[REDACTED:AWS_KEY]',
  },
  {
    name: 'aws_secret',
    pattern: /(?:[A-Za-z0-9+/]{40})/g,
    replacement: (match: string) =>
      // Only mask if suspiciously high entropy (looks like base64 credential)
      hasHighEntropy(match, 4.5) ? '[REDACTED:AWS_SECRET]' : match,
  },
  // GitHub tokens
  {
    name: 'github_token',
    pattern: /gh[pousr]_[A-Za-z0-9_]{36}/g,
    replacement: '[REDACTED:GITHUB_TOKEN]',
  },
  // Google AI / Firebase keys
  {
    name: 'google_api_key',
    pattern: /AIza[0-9A-Za-z-_]{35}/g,
    replacement: '[REDACTED:GOOGLE_API_KEY]',
  },
  // JWT tokens
  {
    name: 'jwt',
    pattern: /ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
    replacement: '[REDACTED:JWT]',
  },
  // Private RSA/EC keys
  {
    name: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    replacement: '[REDACTED:PRIVATE_KEY]',
  },
  // .env style assignments (KEY=value) - handle optional git diff prefixes (+/-)
  {
    name: 'env_assignment',
    pattern: /^[+-]?\s*([A-Z_]+(?:KEY|SECRET|PASSWORD|PASS|TOKEN|AUTH|CREDENTIAL))\s*=\s*(.+)$/gm,
    replacement: '$1=[REDACTED]',
  },
  // Email addresses (PII)
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[MASKED_DATA:EMAIL]',
  },
  // Phone numbers (basic PII)
  {
    name: 'phone',
    pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    replacement: '[MASKED_DATA:PHONE]',
  },
  // Database connection strings
  {
    name: 'connection_string',
    pattern: /(?:postgres|mysql|mongodb|redis):\/\/[^@\s]+:[^@\s]+@[^\s'",)]+/gi,
    replacement: '[REDACTED:CONNECTION_STRING]',
  },
  // IP addresses in sensitive context
  {
    name: 'localhost_ip',
    pattern: /(?:host|server|endpoint|url|address)\s*[:=]\s*["']?((?:\d{1,3}\.){3}\d{1,3})["']?/gi,
    replacement: (match: string, ip: string) => match.replace(ip, '[MASKED_DATA:IP]'),
  },
  // Korean Resident Registration Number (주민등록번호)
  {
    name: 'korean_rrn',
    pattern: /\b\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[-.\s]?[1-8]\d{6}\b/g,
    replacement: '[MASKED_DATA:RRN]',
  },
  // Korean Driver's License (운전면허면허: 보통 11-11-111111-11 등)
  {
    name: 'korean_drivers_license',
    pattern: /\b\d{2}[-\s]?\d{2}[-\s]?\d{6}[-\s]?\d{2}\b/g,
    replacement: '[MASKED_DATA:DRIVERS_LICENSE]',
  },
  // Passport Numbers (여권번호 - 한국은 M,S,R,O,G,D 로 시작하고 뒤에 숫자 8자리, 혹은 영문자 2개 숫자 7자리)
  {
    name: 'korean_passport',
    pattern: /\b[a-zA-Z]{1,2}[-\s]?\d{7,8}\b/g,
    replacement: '[MASKED_DATA:PASSPORT]',
  },
  // Credit Card Numbers (기본적인 16자리 형태: 1234-1234-1234-1234)
  {
    name: 'credit_card',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[MASKED_DATA:CREDIT_CARD]',
  },
  // Slack Tokens
  {
    name: 'slack_token',
    pattern: /xox[baprs]-[0-9a-zA-Z]{10,48}/g,
    replacement: '[REDACTED:SLACK_TOKEN]',
  },
  // Stripe Keys
  {
    name: 'stripe_key',
    pattern: /(?:sk|pk)_(?:test|live)_[0-9a-zA-Z]{24}/g,
    replacement: '[REDACTED:STRIPE_KEY]',
  },
];

/**
 * Calculates Shannon entropy of a string to detect high-entropy secrets.
 */
function hasHighEntropy(str: string, threshold: number): boolean {
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy > threshold;
}

/**
 * Masks sensitive data in a Git diff string.
 * Returns the masked diff and a count of how many items were redacted.
 */
export function maskSensitiveDiff(diff: string): { masked: string; redactionCount: number } {
  let masked = diff;
  let totalRedactions = 0;

  for (const rule of MASKING_RULES) {
    const replacement = rule.replacement;
    
    // Use replace with a callback to count actual replacements
    masked = masked.replace(rule.pattern, (...args) => {
      totalRedactions++;
      if (typeof replacement === 'function') {
        return replacement(...args);
      }
      return replacement;
    });
  }

  return { masked, redactionCount: totalRedactions };
}
