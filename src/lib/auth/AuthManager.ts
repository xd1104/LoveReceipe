import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubhpjrfwyzlzueduvypt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViaHBqcmZ3eXpsenVlZHV2eXB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3ODY0NDYsImV4cCI6MjA3NDM2MjQ0Nn0.44gSR2Ujk4kaQEw91HxCm3h6vVEdJRQ7b9kwvGXx6Ok';

// 全域 Supabase 客戶端實例
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { 
    persistSession: true, 
    detectSessionInUrl: true,
    autoRefreshToken: true
  }
});

// 全域認證狀態
export class AuthManager {
  private static instance: AuthManager;
  private user: any = null;
  private profile: any = null;
  private listeners: Array<(user: any, profile: any) => void> = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): AuthManager {
    if (!AuthManager.instance) {
      AuthManager.instance = new AuthManager();
    }
    return AuthManager.instance;
  }

  private async init() {
    // 檢查現有登入狀態
    await this.checkAuthState();
    
    // 監聽登入狀態變化
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.user = session.user;
        await this.loadUserProfile();
        this.notifyListeners();
      } else if (event === 'SIGNED_OUT') {
        this.user = null;
        this.profile = null;
        this.notifyListeners();
      }
    });
  }

  private async checkAuthState() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        this.user = session.user;
        await this.loadUserProfile();
      } else {
        this.user = null;
        this.profile = null;
      }
    } catch (error) {
      console.error('檢查登入狀態失敗:', error);
      this.user = null;
      this.profile = null;
    }
  }

  private async loadUserProfile() {
    if (!this.user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', this.user.id)
        .single();

      this.profile = profile;
    } catch (error) {
      console.error('載入使用者資料失敗:', error);
      this.profile = null;
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.user, this.profile);
    });
  }

  // 公共方法
  public getUser() {
    return this.user;
  }

  public getProfile() {
    return this.profile;
  }

  public isLoggedIn() {
    return !!this.user;
  }

  public addListener(listener: (user: any, profile: any) => void) {
    this.listeners.push(listener);
  }

  public removeListener(listener: (user: any, profile: any) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public async signOut() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('登出失敗:', error);
    }
  }

  public async refreshProfile() {
    await this.loadUserProfile();
    this.notifyListeners();
  }
}

// 匯出單例實例
export const authManager = AuthManager.getInstance();
