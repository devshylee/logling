'use client';

import React from 'react';
import { Shield, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

export default function TopBar() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="flex justify-between items-center w-full px-8 py-4 sticky top-0 z-50 bg-[#1c1b1b]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(0,112,243,0.08)]">
      <div className="flex items-center gap-8">
        <h1 className="text-2xl font-black tracking-tighter text-[#e5e2e1] font-headline uppercase">Logling</h1>
        <nav className="hidden md:flex gap-6 items-center font-headline font-bold tracking-tight text-sm uppercase">
          <a className="text-[#8b90a0] hover:text-[#e5e2e1] transition-colors" href="/">홈</a>
          <a className="text-[#8b90a0] hover:text-[#e5e2e1] transition-colors" href="/repositories">내 저장소</a>
          <a className="text-[#8b90a0] hover:text-[#e5e2e1] transition-colors" href="/archive">도감</a>
          <a className="text-[#8b90a0] hover:text-[#e5e2e1] transition-colors" href="/settings">설정</a>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-low rounded-full border border-outline-variant/10">
          <Shield size={14} className="text-[#d7ffc5] fill-current" />
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider">AES-256 보안 통신 중</span>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-primary-container p-0.5">
              <img
                alt={user.name ?? '유저 아바타'}
                className="w-full h-full rounded-full"
                src={user.image ?? `https://ui-avatars.com/api/?name=${user.name}`}
                referrerPolicy="no-referrer"
              />
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="p-2 text-outline hover:bg-[#2a2a2a] rounded-lg transition-all"
              title="로그아웃"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="px-4 py-2 bg-primary-container text-white rounded-lg text-sm font-bold hover:shadow-[0_0_15px_rgba(0,112,243,0.3)] transition-all"
          >
            로그인
          </a>
        )}
      </div>
    </header>
  );
}
