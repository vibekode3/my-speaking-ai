// src/lib/stores/auth.js
import { writable } from 'svelte/store';
import { supabase } from '../supabase.js';

// 사용자 정보 스토어
export const user = writable(null);

// 로딩 상태 스토어
export const loading = writable(true);

// 인증 상태 초기화 및 변경 감지
export function initAuth() {
  // 현재 세션 확인
  supabase.auth.getSession().then(({ data: { session } }) => {
    user.set(session?.user ?? null);
    loading.set(false);
  });

  // 인증 상태 변경 감지
  supabase.auth.onAuthStateChange((event, session) => {
    user.set(session?.user ?? null);
    loading.set(false);
  });
} 