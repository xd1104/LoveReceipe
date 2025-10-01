/**
 * 路徑工具函數
 * 統一處理 GitHub Pages 基礎路徑
 */

// 使用 Astro 的 import.meta.env.BASE_URL
const BASE_PATH = import.meta.env.BASE_URL;

/**
 * 生成完整的 URL 路徑
 * @param path 相對路徑，例如 '/recipes' 或 'recipes'
 * @returns 完整的路徑，例如 '/LoveReceipe/recipes'
 */
export function getFullPath(path: string): string {
  // 確保路徑以 / 開頭
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  // 如果已經是完整路徑，直接返回
  if (normalizedPath.startsWith(BASE_PATH)) {
    return normalizedPath;
  }
  
  // 組合基礎路徑和相對路徑
  return `${BASE_PATH}${normalizedPath}`.replace(/\/+/g, '/');
}

/**
 * 生成相對路徑（用於 Astro 內部路由）
 * @param path 相對路徑，例如 '/recipes' 或 'recipes'
 * @returns 相對路徑，例如 '/recipes'
 */
export function getRelativePath(path: string): string {
  // 移除基礎路徑前綴
  if (path.startsWith(BASE_PATH)) {
    return path.substring(BASE_PATH.length) || '/';
  }
  
  // 確保路徑以 / 開頭
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * 檢查是否為外部連結
 * @param url URL 字串
 * @returns 是否為外部連結
 */
export function isExternalLink(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

/**
 * 生成安全的導航 URL
 * @param path 路徑
 * @returns 安全的導航 URL
 */
export function getNavigationUrl(path: string): string {
  if (isExternalLink(path)) {
    return path;
  }
  
  return getFullPath(path);
}

/**
 * 獲取基礎路徑
 * @returns 基礎路徑字串
 */
export function getBasePath(): string {
  return BASE_PATH;
}
