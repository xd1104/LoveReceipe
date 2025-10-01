// 版本檢查腳本
(function() {
  'use strict';
  
  const VERSION = '1.0.0';
  const STORAGE_KEY = 'recipe_app_version';
  const CHECK_INTERVAL = 5 * 60 * 1000; // 5分鐘檢查一次
  
  function checkVersion() {
    const currentVersion = document.querySelector('meta[name="version"]')?.content;
    const storedVersion = localStorage.getItem(STORAGE_KEY);
    
    if (currentVersion && currentVersion !== storedVersion) {
      // 版本不同，清除快取並重新載入
      if (storedVersion) {
        console.log('發現新版本，正在更新...');
        localStorage.setItem(STORAGE_KEY, currentVersion);
        
        // 清除所有快取
        if ('caches' in window) {
          caches.keys().then(function(names) {
            names.forEach(function(name) {
              caches.delete(name);
            });
          });
        }
        
        // 重新載入頁面
        window.location.reload(true);
      } else {
        // 首次訪問，記錄版本
        localStorage.setItem(STORAGE_KEY, currentVersion);
      }
    }
  }
  
  // 頁面載入時檢查
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkVersion);
  } else {
    checkVersion();
  }
  
  // 定期檢查版本更新
  setInterval(checkVersion, CHECK_INTERVAL);
  
  // 監聽 visibilitychange 事件（當使用者切換回頁面時）
  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
      checkVersion();
    }
  });
})();
