import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  nickname: string;
  level: number;
  xp: number;
  avatar_url: string;
  github_username: string;
  mascot_personality: 'witty' | 'professional' | 'aggressive';
  public_profile: boolean;
  telemetry_sharing: boolean;
};

export type Achievement = {
  id: string;
  user_id: string;
  title: string;
  impact_score: number;
  category: string;
  diff_summary: string;
  content: any; // JSON from Gemini
  repository: string;
  created_at: string;
};
