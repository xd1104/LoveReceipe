import { supabase } from '../lib/supabase';

function select<T extends HTMLElement>(id: string) {
  return document.getElementById(id) as T | null;
}

function setMsg(text: string) {
  const el = select<HTMLElement>('auth-msg');
  if (el) el.textContent = text;
}

async function init() {
  const form = select<HTMLFormElement>('auth-form');
  const emailInput = select<HTMLInputElement>('auth-email');
  const signoutBtn = select<HTMLButtonElement>('signout-btn');

  try {
    const { data } = await supabase.auth.getSession();
    setMsg(data?.session ? '已登入' : '就緒');
  } catch { setMsg('就緒'); }

  supabase.auth.onAuthStateChange((_e, session) => {
    setMsg(session ? '已登入' : '已登出');
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput?.value?.trim();
    if (!email) { setMsg('請輸入 Email'); return; }
    setMsg('正在寄送登入連結…');
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      setMsg(error ? `登入失敗：${error.message}` : '請至信箱點擊登入連結');
    } catch { setMsg('登入失敗，請稍後再試'); }
  });

  signoutBtn?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    setMsg('已登出');
  });
}

document.addEventListener('DOMContentLoaded', init);
