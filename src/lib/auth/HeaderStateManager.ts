import { authStateManager } from './AuthStateManager';

/**
 * Header 狀態管理器
 * 負責監聽認證狀態變化並更新 Header 顯示
 */
export class HeaderStateManager {
  private static instance: HeaderStateManager;
  private isInitialized: boolean = false;
  private updateCallbacks: Array<() => void> = [];

  private constructor() {
    this.init();
  }

  public static getInstance(): HeaderStateManager {
    if (!HeaderStateManager.instance) {
      HeaderStateManager.instance = new HeaderStateManager();
    }
    return HeaderStateManager.instance;
  }

  private async init() {
    if (this.isInitialized) return;
    
    try {
      // 監聽認證狀態變化
      authStateManager.addListener('header', (isLoggedIn, user, profile) => {
        console.log('Header 狀態管理器收到認證狀態變化:', { 
          isLoggedIn, 
          userId: user?.id, 
          profileNickname: profile?.nickname 
        });
        
        // 通知所有註冊的更新回調
        this.updateCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Header 更新回調執行失敗:', error);
          }
        });
      });
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Header 狀態管理器初始化失敗:', error);
    }
  }

  /**
   * 註冊 Header 更新回調
   * @param callback 更新回調函數
   * @returns 回調 ID，用於取消註冊
   */
  public registerUpdateCallback(callback: () => void): string {
    const id = `callback_${Date.now()}_${Math.random()}`;
    this.updateCallbacks.push(callback);
    return id;
  }

  /**
   * 取消註冊 Header 更新回調
   * @param id 回調 ID
   */
  public unregisterUpdateCallback(id: string) {
    // 這裡簡化處理，實際可以維護 ID 映射
    console.log('取消註冊 Header 更新回調:', id);
  }

  /**
   * 強制刷新 Header 狀態
   */
  public async refreshHeaderState() {
    try {
      await authStateManager.refreshAuthState();
    } catch (error) {
      console.error('刷新 Header 狀態失敗:', error);
    }
  }
}

// 匯出單例實例
export const headerStateManager = HeaderStateManager.getInstance();
