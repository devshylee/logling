'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { motion, AnimatePresence } from 'motion/react';
import {
  Link2, Github, ShieldCheck, Trash2, Loader2,
  CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff,
  User, Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';
import { getLevelFromXP, getLevelProgress, XP_PER_LEVEL } from '@/features/leveling/xpCalculator';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/Toggle';
import { Toast } from '@/components/ui/Toast';

// ── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'neural' | 'sovereignty';


// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('neural');
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);

  // Neural Link form state
  const [nickname, setNickname] = useState('');

  // Sovereignty toggle state
  const [publicProfile, setPublicProfile] = useState(false);
  const [telemetrySharing, setTelemetrySharing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const userId = session?.user?.id;
  const githubUsername = session?.user?.githubUsername as string | undefined;

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);

  const showToast = useCallback((message: string, ok: boolean) => {
    setToast({ message, ok });
  }, []);

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
      showToast('프로필을 불러오는데 실패했습니다.', false);
    }

    if (data) {
      const p = data as UserProfile;
      setProfile(p);
      setNickname(p.nickname);
      setPublicProfile(p.public_profile);
      setTelemetrySharing(p.telemetry_sharing);
    }
    setLoading(false);
  }, [userId, showToast]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);



  // ── Save neural link settings ────────────────────────────────────────────

  const saveNeuralLink = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ nickname: nickname.trim() })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      showToast('저장에 실패했습니다.', false);
      setNickname(profile?.nickname || ''); // Revert nickname to previous profile's nickname
    } else {
      setProfile(prev => prev ? { ...prev, nickname: nickname.trim() } : prev);
      showToast('프로필이 업데이트됐습니다.', true);
    }
  };

  // ── Save sovereignty settings ────────────────────────────────────────────

  const saveSovereignty = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_profiles')
      .update({ public_profile: publicProfile, telemetry_sharing: telemetrySharing })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      showToast('설정 저장에 실패했습니다.', false);
      setPublicProfile(profile?.public_profile ?? false); // Revert toggle to previous profile's value
      setTelemetrySharing(profile?.telemetry_sharing ?? false); // Revert toggle to previous profile's value
    } else {
      setProfile(prev => prev ? { ...prev, public_profile: publicProfile, telemetry_sharing: telemetrySharing } : prev);
      showToast('권한 설정이 저장됐습니다.', true);
    }
  };

  // ── Delete account ────────────────────────────────────────────────────────

  const deleteAccount = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) throw error;

      await signOut({ callbackUrl: '/' });
    } catch (err) {
      console.error('계정 삭제 실패:', err);
      showToast('계정 삭제에 실패했습니다.', false);
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex min-h-screen bg-surface items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary-container" />
      </div>
    );
  }

  const level = getLevelFromXP(profile?.xp ?? 0);
  const xpProgress = getLevelProgress(profile?.xp ?? 0);
  const xpInLevel = (profile?.xp ?? 0) % XP_PER_LEVEL;

  const tabs: { id: Tab; label: string; icon: typeof Link2 }[] = [
    { id: 'neural', label: '정보', icon: Link2 },
    { id: 'sovereignty', label: '권한', icon: ShieldCheck },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar activeId="settings" profile={profile} />

      <main className="flex-1 ml-64 overflow-y-auto">
        <TopBar />

        <div className="p-10 max-w-3xl mx-auto space-y-8">

          {/* ── Header ── */}
          <div>
            <h1 className="font-headline text-4xl font-black tracking-tighter text-[#e5e2e1]">설정</h1>
            <p className="text-outline text-sm mt-1">신원 및 데이터 권한을 관리합니다</p>
          </div>

          {/* ── Tabs ── */}
          <div role="tablist" aria-label="설정 탭" className="flex gap-1 bg-surface-low border border-outline-variant/10 p-1 rounded-2xl w-fit">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                id={`tab-${id}`}
                role="tab"
                aria-selected={activeTab === id}
                aria-controls={`tabpanel-${id}`}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all',
                  activeTab === id
                    ? 'bg-surface-high text-[#e5e2e1] shadow'
                    : 'text-outline hover:text-[#e5e2e1]'
                )}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {/* ══════════════════════ NEURAL LINK TAB ══════════════════════ */}
            {activeTab === 'neural' && (
              <motion.div
                key="neural"
                id="tabpanel-neural"
                role="tabpanel"
                aria-labelledby="tab-neural"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Profile card */}
                <div className="bg-surface-low border border-outline-variant/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <User size={14} className="text-outline" />
                    <span className="text-sm font-bold text-[#e5e2e1]">프로필 정보</span>
                  </div>

                  {/* Avatar + Level */}
                  <div className="flex items-center gap-5 mb-6">
                    <img
                      src={profile?.avatar_url ?? `https://avatars.githubusercontent.com/u/0`}
                      alt="Avatar"
                      className="w-16 h-16 rounded-2xl border-2 border-outline-variant/20 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-headline font-black text-lg text-[#e5e2e1] truncate">
                          {profile?.nickname}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#2ff801] bg-[#2ff801]/10 px-2 py-0.5 rounded-full uppercase">
                          Lv.{level}
                        </span>
                      </div>
                      {/* XP Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-outline">
                          <span>XP</span>
                          <span>{xpInLevel.toLocaleString()} / {XP_PER_LEVEL.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 bg-surface-highest rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#2ff801] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${xpProgress * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nickname field */}
                  <div className="space-y-2">
                    <label htmlFor="nickname" className="text-xs font-mono text-outline uppercase tracking-wider">닉네임</label>
                    <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      maxLength={20}
                      className="w-full bg-surface-high border border-outline-variant/20 rounded-xl py-3 px-4 text-sm text-[#e5e2e1] focus:outline-none focus:ring-2 focus:ring-primary-container transition-all placeholder:text-outline/40"
                      placeholder="닉네임을 입력하세요"
                    />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      id="save-nickname"
                      onClick={saveNeuralLink}
                      disabled={saving || nickname.trim() === profile?.nickname}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-white rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(0,112,243,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                      변경 저장
                    </button>
                  </div>
                </div>

                {/* GitHub Integration card */}
                <div className="bg-surface-low border border-outline-variant/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <Github size={14} className="text-outline" />
                    <span className="text-sm font-bold text-[#e5e2e1]">GitHub 연동</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
                        <Github size={20} className="text-black" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#e5e2e1]">
                          {githubUsername ? `@${githubUsername}` : session?.user?.name ?? '연동된 계정'}
                        </p>
                        <p className="text-[11px] text-outline mt-0.5">읽기 전용 · 커밋 분석 전용</p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2ff801]/10 text-[#2ff801] rounded-full text-[10px] font-bold uppercase">
                      <span className="w-1.5 h-1.5 bg-[#2ff801] rounded-full animate-pulse" />
                      연결됨
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-surface-high rounded-xl border border-outline-variant/10">
                    <p className="text-[11px] text-outline leading-relaxed">
                      Logling은 분석을 위한 <span className="text-[#e5e2e1] font-semibold">읽기 전용 권한</span>만 사용합니다. 코드 수정 · 삭제 · 푸시는 절대 불가합니다.
                    </p>
                  </div>
                </div>

                {/* Account info read-only */}
                <div className="bg-surface-low border border-outline-variant/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={14} className="text-outline" />
                    <span className="text-sm font-bold text-[#e5e2e1]">계정 정보</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: '이메일', value: session?.user?.email ?? '—' },
                      { label: '가입일', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between text-sm">
                        <span className="text-outline">{label}</span>
                        <span className="text-[#e5e2e1] font-mono text-xs">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </motion.div>
            )}

            {/* ══════════════════════ SOVEREIGNTY TAB ══════════════════════ */}
            {activeTab === 'sovereignty' && (
              <motion.div
                key="sovereignty"
                id="tabpanel-sovereignty"
                role="tabpanel"
                aria-labelledby="tab-sovereignty"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.18 }}
                className="space-y-4"
              >
                {/* Privacy toggles */}
                <div className="bg-surface-low border border-outline-variant/10 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <ShieldCheck size={14} className="text-outline" />
                    <span className="text-sm font-bold text-[#e5e2e1]">공개 설정</span>
                  </div>

                  <div className="space-y-3">
                    {/* Public Profile */}
                    <div className="flex items-center justify-between p-4 bg-surface-high rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          publicProfile ? 'bg-primary-container/20' : 'bg-surface-highest'
                        )}>
                          {publicProfile ? <Eye size={14} className="text-primary-container" /> : <EyeOff size={14} className="text-outline" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#e5e2e1]">프로필 공개</p>
                          <p className="text-[11px] text-outline mt-0.5">다른 사용자가 내 레벨과 통계를 볼 수 있습니다</p>
                        </div>
                      </div>
                      <Toggle id="public-profile-toggle" enabled={publicProfile} onChange={setPublicProfile} />
                    </div>

                    {/* Telemetry */}
                    <div className="flex items-center justify-between p-4 bg-surface-high rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          telemetrySharing ? 'bg-tertiary/20' : 'bg-surface-highest'
                        )}>
                          <RefreshCw size={14} className={telemetrySharing ? 'text-tertiary' : 'text-outline'} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#e5e2e1]">익명 텔레메트리 공유</p>
                          <p className="text-[11px] text-outline mt-0.5">서비스 개선을 위한 익명 사용 데이터를 공유합니다</p>
                        </div>
                      </div>
                      <Toggle id="telemetry-sharing-toggle" enabled={telemetrySharing} onChange={setTelemetrySharing} />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      id="save-sovereignty"
                      onClick={saveSovereignty}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-white rounded-xl text-sm font-bold hover:shadow-[0_0_20px_rgba(0,112,243,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                      설정 저장
                    </button>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="bg-surface-low border border-red-500/15 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <AlertCircle size={14} className="text-red-500" />
                    <span className="text-sm font-bold text-red-400">위험 구역</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#e5e2e1]">계정 영구 삭제</p>
                      <p className="text-[11px] text-outline mt-0.5">
                        모든 분석 기록, XP, 저장소 연동 정보가 삭제됩니다. 되돌릴 수 없습니다.
                      </p>
                    </div>
                    <button
                      id="delete-account-btn"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 border border-red-500/30 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/10 hover:border-red-500/50 transition-all flex-shrink-0 ml-4"
                    >
                      <Trash2 size={14} />
                      삭제
                    </button>
                  </div>
                </div>

                {/* Delete confirm dialog */}
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        className="bg-surface-low border border-red-500/20 rounded-2xl p-8 max-w-md w-full"
                      >
                        <div className="w-12 h-12 bg-red-500/15 rounded-xl flex items-center justify-center mb-5">
                          <Trash2 size={22} className="text-red-400" />
                        </div>
                        <h3 className="font-headline font-black text-xl text-[#e5e2e1] mb-2">정말 삭제하시겠습니까?</h3>
                        <p className="text-outline text-sm leading-relaxed mb-6">
                          계정과 함께 모든 분석 기록, 획득한 XP, 레벨 데이터가 <span className="text-red-400 font-semibold">영구 삭제</span>됩니다. 이 작업은 취소할 수 없습니다.
                        </p>
                        <div className="flex gap-3">
                          <button
                            id="cancel-delete"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 py-3 bg-surface-high border border-outline-variant/20 text-[#e5e2e1] rounded-xl text-sm font-bold hover:bg-surface-highest transition-all"
                          >
                            취소
                          </button>
                          <button
                            id="confirm-delete"
                            onClick={deleteAccount}
                            disabled={saving}
                            className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                            영구 삭제
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast.message} ok={toast.ok} />}
      </AnimatePresence>
    </div>
  );
}
