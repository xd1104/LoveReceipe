import { supabase } from '../supabase';

// 全域認證狀態
export class AuthManager {
  private static instance: AuthManager;
  private user: any = null;
  private profile: any = null;
  private listeners: Array<(user: any, profile: any) => void> = [];
  private isInitialized: boolean = false;
  private initPromise: Promise<void> | null = null;

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
    if (this.isInitialized) return;
    
    this.initPromise = this.initializeAuth();
    await this.initPromise;
  }

  private async initializeAuth() {
    try {
      // 檢查現有登入狀態
      await this.checkAuthState();
      
      // 監聽登入狀態變化
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('認證狀態變化:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session?.user) {
          this.user = session.user;
          await this.loadUserProfile();
          this.notifyListeners();
        } else if (event === 'SIGNED_OUT') {
          this.user = null;
          this.profile = null;
          this.notifyListeners();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          this.user = session.user;
          this.notifyListeners();
        }
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('認證初始化失敗:', error);
      this.isInitialized = true; // 即使失敗也標記為已初始化
    }
  }

  // 確保認證已初始化
  public async ensureInitialized() {
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }
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
  public async getUser() {
    await this.ensureInitialized();
    return this.user;
  }

  public async getProfile() {
    await this.ensureInitialized();
    return this.profile;
  }

  public async isLoggedIn() {
    await this.ensureInitialized();
    return !!this.user;
  }

  // 強制刷新認證狀態
  public async refreshAuthState() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        this.user = session.user;
        await this.loadUserProfile();
        this.notifyListeners();
        return true;
      } else {
        this.user = null;
        this.profile = null;
        this.notifyListeners();
        return false;
      }
    } catch (error) {
      console.error('刷新認證狀態失敗:', error);
      return false;
    }
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
