import type { GitHubCommit, GitHubRepo } from '@/types';

const GITHUB_API_BASE = 'https://api.github.com';

// Files to exclude from diffs (not worth analyzing)
const EXCLUDED_FILE_PATTERNS = [
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
  /\.lock$/,
  /\.md$/i,
  /\.txt$/i,
  /\.svg$/i,
  /\.png$/i,
  /\.jpg$/i,
  /\.ico$/i,
  /dist\//,
  /build\//,
  /\.next\//,
  /node_modules\//,
];

function createGithubHeaders(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

// Max diff size to prevent huge Gemini payloads (in characters)
const MAX_DIFF_LENGTH = 50_000;

/**
 * Fetches all repositories for the authenticated GitHub user.
 */
export async function fetchUserRepositories(accessToken: string): Promise<GitHubRepo[]> {
  const response = await fetch(
    `${GITHUB_API_BASE}/user/repos?per_page=100&sort=updated&affiliation=owner`,
    { headers: createGithubHeaders(accessToken) }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  const repos: GitHubRepo[] = await response.json();
  return repos;
}

/**
 * Fetches recent commits for a specific repository.
 */
export async function fetchRepoCommits(
  accessToken: string,
  repoFullName: string,
  limit = 20
): Promise<GitHubCommit[]> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${repoFullName}/commits?per_page=${limit}`,
    { headers: createGithubHeaders(accessToken) }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error fetching commits: ${response.status}`);
  }

  const commits: GitHubCommit[] = await response.json();
  return commits;
}

/**
 * Fetches the raw diff for a specific commit SHA.
 * Filters out non-code files and truncates if too large.
 */
export async function fetchCommitDiff(
  accessToken: string,
  repoFullName: string,
  commitSha: string
): Promise<string> {
  const response = await fetch(
    `${GITHUB_API_BASE}/repos/${repoFullName}/commits/${commitSha}`,
    {
      headers: {
        ...createGithubHeaders(accessToken),
        Accept: 'application/vnd.github.diff',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error fetching diff: ${response.status}`);
  }

  const rawDiff = await response.text();
  return filterAndTruncateDiff(rawDiff);
}

/**
 * Removes excluded files from the diff and truncates if too long.
 */
function filterAndTruncateDiff(rawDiff: string): string {
  // Split by "diff --git" sections
  const sections = rawDiff.split(/(?=^diff --git )/m);

  const filteredSections = sections.filter((section) => {
    // Extract filename from diff header line
    const match = section.match(/^diff --git a\/(.*?) b\//m);
    if (!match) return false;
    const filename = match[1];
    return !EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(filename));
  });

  let result = filteredSections.join('');

  if (result.length > MAX_DIFF_LENGTH) {
    result = result.slice(0, MAX_DIFF_LENGTH) + '\n\n[DIFF_TRUNCATED: Too large to display fully]';
  }

  return result;
}

/**
 * Checks GitHub rate limit remaining.
 */
export async function checkRateLimit(accessToken: string): Promise<{
  remaining: number;
  reset: Date;
}> {
  const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, {
    headers: createGithubHeaders(accessToken),
  });
  const data = await response.json();
  return {
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000),
  };
}
