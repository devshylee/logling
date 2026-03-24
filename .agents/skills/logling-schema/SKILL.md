---
name: logling-schema
description: Logling database schema reference. All tables, columns, relationships, and TypeScript types for the Supabase PostgreSQL database.
---

# Logling Database Schema

## Overview

Migration tool: **Supabase TypeScript migrations** (files in `supabase/migrations/`)

---

## Tables

### `user_profiles` — User data and RPG stats
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `auth.uid()` | Maps to NextAuth user ID |
| `github_username` | `text` | UNIQUE, NOT NULL | GitHub login handle |
| `nickname` | `text` | NOT NULL | Display name |
| `avatar_url` | `text` | | GitHub avatar URL |
| `level` | `int4` | NOT NULL, default 1 | Current RPG level |
| `xp` | `int8` | NOT NULL, default 0 | Total earned XP |
| `mascot_personality` | `text` | default 'professional' | `witty \| professional \| aggressive` |
| `public_profile` | `bool` | default true | Public leaderboard visibility |
| `telemetry_sharing` | `bool` | default false | Anonymous stats opt-in |
| `created_at` | `timestamptz` | default `now()` | Account creation time |
| `updated_at` | `timestamptz` | default `now()` | Last update time |

### `repositories` — Connected GitHub repos
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Internal ID |
| `user_id` | `uuid` | FK → `user_profiles.id` | Owner |
| `github_repo_id` | `int8` | UNIQUE, NOT NULL | GitHub Repository ID |
| `full_name` | `text` | NOT NULL | e.g. `octocat/Hello-World` |
| `description` | `text` | | Repo description |
| `language` | `text` | | Primary language |
| `private` | `bool` | default false | Is the repo private? |
| `last_synced_at` | `timestamptz` | | Last time commits were fetched |
| `created_at` | `timestamptz` | default `now()` | |

### `analyses` — AI analysis jobs
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Job ID |
| `user_id` | `uuid` | FK → `user_profiles.id` | Owner |
| `repository_id` | `uuid` | FK → `repositories.id` | Source repo |
| `commit_sha` | `text` | NOT NULL | The analyzed commit SHA |
| `commit_message` | `text` | | Original commit message |
| `status` | `text` | NOT NULL, default `'pending'` | `pending \| processing \| completed \| failed` |
| `impact_score` | `int2` | | 0–100 AI-generated score |
| `ai_result` | `jsonb` | | Full structured AI response (title, summary, changes, deepDive, mascotNote, techStack) |
| `xp_awarded` | `int4` | default 0 | XP granted for this analysis |
| `error_message` | `text` | | Error details if `status = 'failed'` |
| `created_at` | `timestamptz` | default `now()` | Job created time |
| `completed_at` | `timestamptz` | | When analysis finished |

**UNIQUE constraint**: `(commit_sha, user_id)` — prevents duplicate analysis of the same commit

### `tech_skills` — Per-user technology skill levels (RPG Skill Tree)
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK → `user_profiles.id` | Owner |
| `tech_name` | `text` | NOT NULL | e.g. `TypeScript`, `React`, `Docker` |
| `xp` | `int4` | NOT NULL, default 0 | XP in this specific tech |
| `level` | `int2` | NOT NULL, default 1 | Calculated from XP |
| `last_used_at` | `timestamptz` | | Last commit that used this tech |

**UNIQUE constraint**: `(user_id, tech_name)`

---

## XP Calculation Rules

```
xp_awarded = impact_score * 10

impact_score 0   → 0 XP
impact_score 50  → 500 XP  
impact_score 100 → 1000 XP

Level threshold = level * 10,000 XP
Level 1→2: 10,000 XP total
Level 2→3: 20,000 XP total
...
```

---

## AI Result JSON Schema (`analyses.ai_result`)

```jsonc
{
  "title": "string",           // Catchy RPG-style title
  "impactScore": 0,            // 0-100
  "background": "string",      // Why this change was made
  "changes": ["string"],       // Bullet point list of changes
  "deepDive": "string",        // Expert technical insight
  "mascotNote": "string",      // Logling mascot comment
  "techStack": ["string"],     // Technologies detected (for skill tree)
  "errorCode": "string|null"   // Null on success
}
```

---

## TypeScript Types (`src/types/index.ts`)

```typescript
export type UserProfile = { /* see table */ };
export type Repository = { /* see table */ };
export type Analysis = { /* see table */ };
export type TechSkill = { /* see table */ };
export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type MascotPersonality = 'witty' | 'professional' | 'aggressive';
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
```
