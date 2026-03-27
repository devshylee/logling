// src/types/index.ts — Logling shared TypeScript types

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type UserProfile = {
  id: string;
  github_username: string;
  nickname: string;
  avatar_url: string;
  level: number;
  xp: number;
  public_profile: boolean;
  telemetry_sharing: boolean;
  created_at: string;
  updated_at: string;
};

export type Repository = {
  id: string;
  user_id: string;
  github_repo_id: number;
  full_name: string;
  description: string | null;
  language: string | null;
  private: boolean;
  last_synced_at: string | null;
  created_at: string;
};

export type AIResult = {
  title: string;
  impactScore: number;
  background: string;
  changes: string[];
  deepDive: string;
  mascotNote: string;
  techStack: string[];
  errorCode: string | null;
};

export type Analysis = {
  id: string;
  user_id: string;
  repository_id: string;
  commit_sha: string;
  commit_message: string | null;
  status: AnalysisStatus;
  impact_score: number | null;
  ai_result: AIResult | null;
  xp_awarded: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  // Joined fields:
  repository?: Repository;
};

export type TechSkill = {
  id: string;
  user_id: string;
  tech_name: string;
  xp: number;
  level: number;
  last_used_at: string | null;
};

// GitHub API types
export type GitHubRepo = {
  id: number;
  full_name: string;
  description: string | null;
  language: string | null;
  private: boolean;
  updated_at: string;
  stargazers_count: number;
  forks_count: number;
  default_branch: string;
};

export type GitHubCommit = {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
};

export type GitHubProfile = {
  login: string;
  name: string | null;
  avatar_url: string;
};
