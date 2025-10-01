import { authManager } from './AuthManager';

/**
 * 全域認證狀態管理器
 * 負責監聽認證狀態變化並通知所有頁面
 */
export class AuthStateManager {
  private static instance: AuthStateManager;
  private listeners: Map<string, (isLoggedIn: boolean, user: any, profile: any) => void> = new Map();
  private isListening: boolean = false;

  private constructor() {
    this.init();
  }

  public static getInstance(): AuthStateManager {
    if (!AuthStateManager.instance) {
      AuthStateManager.instance = new AuthStateManager();
    }
    return AuthStateManager.instance;
  }

  private async init() {
    if (this.isListening) return;
    
    try {
      // 確保認證管理器已初始化
      await authManager.ensureInitialized();
      
      // 監聽認證狀態變化
      authManager.addListener((user, profile) => {
        const isLoggedIn = !!user;
        console.log('全域認證狀態變化:', { isLoggedIn, userId: user?.id });
        
        // 通知所有監聽器
        this.listeners.forEach((listener) => {
          try {
            listener(isLoggedIn, user, profile);
          } catch (error) {
            console.error('認證狀態監聽器錯誤:', error);
          }
        });
      });
      
      this.isListening = true;
    } catch (error) {
      console.error('認證狀態管理器初始化失敗:', error);
    }
  }

  /**
   * 添加認證狀態監聽器
   * @param id 監聽器唯一標識
   * @param listener 監聽器函數
   */
  public addListener(id: string, listener: (isLoggedIn: boolean, user: any, profile: any) => void) {
    this.listeners.set(id, listener);
    
    // 如果已經有認證狀態，立即通知
    this.notifyCurrentState(id, listener);
  }

  /**
   * 移除認證狀態監聽器
   * @param id 監聽器唯一標識
   */
  public removeListener(id: string) {
    this.listeners.delete(id);
  }

  /**
   * 通知當前認證狀態
   */
  private async notifyCurrentState(id: string, listener: (isLoggedIn: boolean, user: any, profile: any) => void) {
    try {
      const user = await authManager.getUser();
      const profile = await authManager.getProfile();
      const isLoggedIn = !!user;
      
      listener(isLoggedIn, user, profile);
    } catch (error) {
      console.error('通知當前認證狀態失敗:', error);
      listener(false, null, null);
    }
  }

  /**
   * 強制刷新認證狀態
   */
  public async refreshAuthState() {
    try {
      await authManager.ensureInitialized();
      return await authManager.refreshAuthState();
    } catch (error) {
      console.error('刷新認證狀態失敗:', error);
      return false;
    }
  }

  /**
   * 檢查是否已登入
   */
  public async isLoggedIn() {
    try {
      await authManager.ensureInitialized();
      return await authManager.isLoggedIn();
    } catch (error) {
      console.error('檢查登入狀態失敗:', error);
      return false;
    }
  }
}

// 匯出單例實例
export const authStateManager = AuthStateManager.getInstance();
