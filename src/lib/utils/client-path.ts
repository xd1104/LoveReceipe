/**
 * 客戶端路徑工具函數
 * 用於在客戶端 JavaScript 中處理路徑
 */

// 從當前 URL 動態獲取基礎路徑
function getBasePathFromUrl(): string {
  const pathname = window.location.pathname;
  const parts = pathname.split('/');
  
  // 如果路徑包含 LoveReceipe，則使用它作為基礎路徑
  if (parts.includes('LoveReceipe')) {
    return '/LoveReceipe';
  }
  
  // 否則返回空字串（用於本地開發）
  return '';
}

/**
 * 生成完整的 URL 路徑（客戶端使用）
 * @param path 相對路徑，例如 '/recipes' 或 'recipes'
 * @returns 完整的路徑，例如 '/LoveReceipe/recipes'
 */
export function getClientFullPath(path: string): string {
  const basePath = getBasePathFromUrl();
  
  // 確保路徑以 / 開頭
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 如果已經是完整路徑，直接返回
  if (normalizedPath.startsWith(basePath)) {
    return normalizedPath;
  }
  
  // 組合基礎路徑和相對路徑
  return `${basePath}${normalizedPath}`;
}

/**
 * 生成完整的導航 URL（客戶端使用）
 * @param path 路徑
 * @returns 完整的導航 URL
 */
export function getClientNavigationUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
    return path;
  }
  
  return getClientFullPath(path);
}

/**
 * 獲取當前基礎路徑（客戶端使用）
 * @returns 基礎路徑字串
 */
export function getClientBasePath(): string {
  return getBasePathFromUrl();
}
