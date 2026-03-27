'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import type { GitHubRepo, GitHubCommit } from '@/types';

export function useGithubIntegration() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [branches, setBranches] = useState<{ name: string }[]>([]);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);

  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedCommit, setSelectedCommit] = useState<GitHubCommit | null>(null);

  const [loadingRepos, setLoadingRepos] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchRepos = async (force = false) => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`/api/repositories\${force ? '?force=true' : ''}`);
      const data = await res.json();
      if (data.repos) setRepos(data.repos);
    } catch {
      setErrorMsg('저장소를 불러오는데 실패했습니다.');
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchCommits = async (repoFullName: string, branchName: string) => {
    setLoadingCommits(true);
    try {
      const params = new URLSearchParams({ repo: repoFullName, sha: branchName, per_page: '30' });
      const res = await fetch(`/api/github/commits?\${params}`);
      const data = await res.json();
      setCommits(Array.isArray(data) ? data : []);
    } catch {
      setCommits([]);
      setErrorMsg('커밋 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleRepoChange = async (repoId: string) => {
    const repo = repos.find(r => r.id.toString() === repoId) || null;
    setSelectedRepo(repo);
    setSelectedBranch('');
    setBranches([]);
    setCommits([]);
    setSelectedCommit(null);

    if (!repo) return;

    setLoadingBranches(true);
    try {
      const res = await fetch(`/api/github/branches?repo=\${encodeURIComponent(repo.full_name)}`);
      const data = await res.json();
      const branchList = Array.isArray(data) ? data : [];
      setBranches(branchList);

      const defaultBranch = repo.default_branch || (branchList.find((b: { name: string }) => b.name === 'main' || b.name === 'master')?.name) || branchList[0]?.name || '';
      if (defaultBranch) {
        setSelectedBranch(defaultBranch);
        fetchCommits(repo.full_name, defaultBranch);
      }
    } catch {
      setBranches([]);
      setErrorMsg('브랜치 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleBranchChange = (branchName: string) => {
    setSelectedBranch(branchName);
    setSelectedCommit(null);
    if (selectedRepo && branchName) {
      fetchCommits(selectedRepo.full_name, branchName);
    }
  };

  useEffect(() => {
    if (session && repos.length === 0) {
      fetchRepos();
    }
  }, [session, repos.length]);

  return {
    repos, branches, commits,
    selectedRepo, selectedBranch, selectedCommit,
    loadingRepos, loadingBranches, loadingCommits,
    errorMsg, setErrorMsg,
    setSelectedRepo, setSelectedBranch, setSelectedCommit,
    handleRepoChange, handleBranchChange, fetchRepos
  };
}
