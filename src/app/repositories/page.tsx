'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion } from 'motion/react';
import { Github, ShieldCheck, Code2, Search, Loader2, RefreshCw, Zap, Star, GitFork } from 'lucide-react';
import type { GitHubRepo, GitHubCommit, UserProfile } from '@/types';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export default function RepositoriesPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [analyzeMsg, setAnalyzeMsg] = useState('');

  const userId = (session?.user as any)?.id as string | undefined;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.repos) setRepos(data.repos);
    } catch (e) {
      console.error('Failed to fetch repos', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchRepos();
      supabase.from('user_profiles').select('*').eq('id', userId).single().then(({ data }) => {
        if (data) setProfile(data as UserProfile);
      });
    }
  }, [userId, fetchRepos]);

  const handleSelectRepo = async (repo: GitHubRepo) => {
    if (selectedRepo?.id === repo.id) {
      setSelectedRepo(null);
      setCommits([]);
      return;
    }
    setSelectedRepo(repo);
    setLoadingCommits(true);
    setCommits([]);
    try {
      const accessToken = (session as any)?.accessToken;
      const res = await fetch(
        `https://api.github.com/repos/${repo.full_name}/commits?per_page=10`,
        { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' } }
      );
      const data: GitHubCommit[] = await res.json();
      setCommits(Array.isArray(data) ? data : []);
    } catch {
      setCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleAnalyzeCommit = async (repo: GitHubRepo, commit: GitHubCommit) => {
    setAnalyzingRepo(commit.sha);
    setAnalyzeMsg('');

    // Get or create repo record in DB
    const { data: dbRepo } = await supabase
      .from('repositories')
      .select('id')
      .eq('github_repo_id', repo.id)
      .maybeSingle();

    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoFullName: repo.full_name,
        commitSha: commit.sha,
        commitMessage: commit.commit.message,
        repositoryId: dbRepo?.id ?? null,
      }),
    });
    const data = await res.json();
    setAnalyzeMsg(data.message ?? data.error ?? '');
    setAnalyzingRepo(null);
  };

  const filtered = repos.filter((r) =>
    r.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (r.language ?? '').toLowerCase().includes(search.toLowerCase())
  );

  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen bg-surface items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-container" />
      </div>
    );
  }

  if (repos.length === 0 && !loading) {
    return (
      <div className="flex min-h-screen bg-surface">
        <Sidebar activeId="repos" profile={profile} />
        <main className="flex-1 ml-64 flex flex-col">
          <TopBar />
          <div className="flex-1 flex items-center justify-center p-10 bg-[#0e0e0e]">
            <div className="max-w-4xl w-full flex flex-col items-center text-center">
              <div className="relative mb-12">
                <div className="absolute inset-0 bg-primary-container/10 blur-[100px] rounded-full" />
                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="relative z-10 w-64 h-64 flex items-center justify-center"
                >
                  <div className="w-48 h-48 bg-tertiary/20 backdrop-blur-xl border-4 border-tertiary rounded-[3rem] shadow-[0_0_60px_rgba(205,189,255,0.2)] flex items-center justify-center">
                    <Code2 size={80} className="text-tertiary" />
                  </div>
                </motion.div>
              </div>
              <h1 className="font-headline text-5xl font-black tracking-tighter text-[#e5e2e1] mb-4">No repositories connected yet!</h1>
              <p className="text-outline text-xl mb-8">Let&apos;s find your code on GitHub. Your Logling Unit is ready.</p>
              <button
                onClick={fetchRepos}
                className="px-10 py-5 bg-primary-container text-white rounded-2xl font-headline text-lg font-bold uppercase tracking-tight flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,112,243,0.3)]"
              >
                <Github />
                Load GitHub Repositories
              </button>
              <div className="flex items-center gap-2 mt-4">
                <ShieldCheck size={14} className="text-[#79ff5b]" />
                <span className="text-[10px] font-mono text-[#79ff5b] uppercase tracking-widest">Read-only Access Guaranteed</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="repos" profile={profile} />
      <main className="flex-1 ml-64">
        <TopBar />
        <div className="p-10 max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-headline text-4xl font-black tracking-tighter text-[#e5e2e1]">Repositories</h1>
              <p className="text-outline mt-1">{repos.length} repositories synced from GitHub</p>
            </div>
            <button
              onClick={fetchRepos}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-surface-high border border-outline-variant/20 rounded-lg text-outline hover:text-[#e5e2e1] transition-colors text-sm font-bold disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Sync
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input
              className="w-full bg-surface-low border border-outline-variant/20 rounded-xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/50"
              placeholder="Search by name or language..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {analyzeMsg && (
            <div className="p-4 bg-primary-container/10 border border-primary-container/20 rounded-xl text-primary-container text-sm font-medium">
              {analyzeMsg}
            </div>
          )}

          {/* Repository Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((repo) => (
              <motion.div key={repo.id} layout className="space-y-0">
                <motion.div
                  className={`bg-surface-low rounded-2xl p-6 border cursor-pointer transition-all hover:border-primary-container/30 ${selectedRepo?.id === repo.id ? 'border-primary-container/50 bg-surface-high' : 'border-outline-variant/10'}`}
                  onClick={() => handleSelectRepo(repo)}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-headline font-bold text-[#e5e2e1]">{repo.full_name.split('/')[1]}</h3>
                      <p className="text-outline text-xs font-mono">{repo.full_name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-outline text-xs font-mono">
                      <span className="flex items-center gap-1"><Star size={12} />{repo.stargazers_count}</span>
                      <span className="flex items-center gap-1"><GitFork size={12} />{repo.forks_count}</span>
                    </div>
                  </div>
                  {repo.description && <p className="text-outline text-sm line-clamp-2 mb-3">{repo.description}</p>}
                  <div className="flex items-center justify-between">
                    {repo.language && (
                      <span className="px-2 py-1 bg-surface-highest rounded text-[10px] font-mono text-tertiary">{repo.language}</span>
                    )}
                    <span className="text-[10px] text-outline ml-auto">
                      {formatDistanceToNow(new Date(repo.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </motion.div>

                {/* Commit List (expanded when selected) */}
                {selectedRepo?.id === repo.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-[#0e0e0e] border border-primary-container/20 border-t-0 rounded-b-2xl overflow-hidden"
                  >
                    {loadingCommits ? (
                      <div className="p-6 flex items-center gap-3 text-outline text-sm">
                        <Loader2 size={16} className="animate-spin" /> Loading commits...
                      </div>
                    ) : commits.length === 0 ? (
                      <div className="p-6 text-outline text-sm">No commits found.</div>
                    ) : (
                      <div className="divide-y divide-outline-variant/10">
                        {commits.map((commit) => (
                          <div key={commit.sha} className="p-4 flex items-center justify-between gap-4 hover:bg-surface-low/50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[#e5e2e1] font-medium line-clamp-1">{commit.commit.message.split('\n')[0]}</p>
                              <p className="text-[10px] text-outline font-mono mt-1">
                                {commit.sha.slice(0, 8)} · {commit.commit.author.name} · {new Date(commit.commit.author.date).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleAnalyzeCommit(repo, commit)}
                              disabled={analyzingRepo === commit.sha}
                              className="flex items-center gap-2 px-4 py-2 bg-primary-container text-white text-xs font-bold rounded-lg hover:shadow-[0_0_15px_rgba(0,112,243,0.3)] transition-all disabled:opacity-50 whitespace-nowrap"
                            >
                              {analyzingRepo === commit.sha ? (
                                <><Loader2 size={12} className="animate-spin" /> Queuing...</>
                              ) : (
                                <><Zap size={12} /> Analyze</>
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
