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
