# Logling Database Schema (v1.0)
# DB: Supabase (PostgreSQL) | Migration: `supabase/migrations/20260323_initial_schema.ts`

## Tables

### `user_profiles`
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` | PK | Maps to NextAuth `token.sub` |
| `github_username` | `text` | UNIQUE | GitHub login handle |
| `nickname` | `text` | | Display name |
| `avatar_url` | `text` | | GitHub avatar |
| `level` | `int4` | 1 | Current RPG level |
| `xp` | `int8` | 0 | Total XP earned |
| `mascot_personality` | `text` | 'professional' | `witty/professional/aggressive` |
| `public_profile` | `bool` | true | Public leaderboard |
| `telemetry_sharing` | `bool` | false | Anonymous stats opt-in |
| `created_at` | `timestamptz` | now() | |
| `updated_at` | `timestamptz` | now() | Auto-updated via trigger |

### `repositories`
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` | gen_random_uuid() | Internal ID |
| `user_id` | `uuid` | FK→user_profiles | Owner |
| `github_repo_id` | `int8` | UNIQUE | GitHub Repository ID |
| `full_name` | `text` | | e.g. `user/my-repo` |
| `description` | `text` | NULL | Repo description |
| `language` | `text` | NULL | Primary language |
| `private` | `bool` | false | Is private? |
| `last_synced_at` | `timestamptz` | NULL | Last GitHub sync |
| `created_at` | `timestamptz` | now() | |

### `analyses`
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` | gen_random_uuid() | Job ID |
| `user_id` | `uuid` | FK→user_profiles | Owner |
| `repository_id` | `uuid` | FK→repositories | Source repo |
| `commit_sha` | `text` | | Analyzed commit SHA |
| `commit_message` | `text` | NULL | Original commit message |
| `status` | `text` | 'pending' | `pending/processing/completed/failed` |
| `impact_score` | `int2` | NULL | 0–100 AI score |
| `ai_result` | `jsonb` | NULL | Full AI response JSON |
| `xp_awarded` | `int4` | 0 | XP awarded for this commit |
| `error_message` | `text` | NULL | Error if failed |
| `created_at` | `timestamptz` | now() | |
| `completed_at` | `timestamptz` | NULL | When finished |

**UNIQUE constraint**: `(commit_sha, user_id)` — prevents duplicate analysis

### `tech_skills` — Per-user RPG Skill Tree
| Column | Type | Default | Description |
|---|---|---|---|
| `id` | `uuid` | gen_random_uuid() | |
| `user_id` | `uuid` | FK→user_profiles | Owner |
| `tech_name` | `text` | | e.g. `TypeScript`, `React` |
| `xp` | `int4` | 0 | XP in this tech |
| `level` | `int2` | 1 | Computed from XP |
| `last_used_at` | `timestamptz` | NULL | When last involved in a commit |

**UNIQUE constraint**: `(user_id, tech_name)`

---

## XP Formula
```
xp_awarded = impact_score * 10
Level = floor(total_xp / 10,000) + 1
```

## AI Result JSON Schema (`analyses.ai_result`)
```json
{
  "title": "string",
  "impactScore": 0,
  "background": "string",
  "changes": ["string"],
  "deepDive": "string",
  "mascotNote": "string",
  "techStack": ["string"],
  "errorCode": null
}
```