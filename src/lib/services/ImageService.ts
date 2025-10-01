import { supabase } from '../supabase';

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class ImageService {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  /**
   * 驗證圖片檔案
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    // 檢查檔案類型
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: '不支援的檔案格式，請上傳 JPG、PNG、WebP 或 GIF 格式的圖片'
      };
    }

    // 檢查檔案大小
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `檔案大小超過限制，請上傳小於 ${this.MAX_FILE_SIZE / 1024 / 1024}MB 的圖片`
      };
    }

    return { valid: true };
  }

  /**
   * 壓縮圖片
   */
  static async compressImage(file: File, maxWidth: number = 1920, quality: number = 0.8): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 計算新尺寸
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // 設定 canvas 尺寸
        canvas.width = width;
        canvas.height = height;

        // 繪製壓縮後的圖片
        ctx?.drawImage(img, 0, 0, width, height);

        // 轉換為 Blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('圖片壓縮失敗'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 上傳圖片到 Supabase Storage
   */
  static async uploadImage(
    file: File,
    bucket: 'recipe-images' | 'avatars' = 'recipe-images',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // 驗證檔案
      const validation = this.validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 壓縮圖片
      const compressedFile = await this.compressImage(file);

      // 取得目前使用者
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      // 產生唯一檔名
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = compressedFile.name.split('.').pop();
      const fileName = `${user.id}/${timestamp}-${randomString}.${fileExtension}`;

      // 上傳檔案
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`上傳失敗: ${error.message}`);
      }

      // 取得公開 URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path
      };

    } catch (error) {
      console.error('ImageService.uploadImage:', error);
      throw error;
    }
  }

  /**
   * 上傳多張圖片
   */
  static async uploadImages(
    files: File[],
    bucket: 'recipe-images' | 'avatars' = 'recipe-images',
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const totalFiles = files.length;

    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadImage(files[i], bucket, (progress) => {
          // 計算整體進度
          const overallProgress = {
            loaded: (i * 100) + progress.percentage,
            total: totalFiles * 100,
            percentage: Math.round(((i * 100) + progress.percentage) / totalFiles)
          };
          onProgress?.(overallProgress);
        });

        results.push(result);
      } catch (error) {
        console.error(`上傳第 ${i + 1} 張圖片失敗:`, error);
        // 繼續上傳其他圖片，不中斷整個流程
      }
    }

    return results;
  }

  /**
   * 刪除圖片
   */
  static async deleteImage(
    path: string,
    bucket: 'recipe-images' | 'avatars' = 'recipe-images'
  ): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw new Error(`刪除圖片失敗: ${error.message}`);
      }

    } catch (error) {
      console.error('ImageService.deleteImage:', error);
      throw error;
    }
  }

  /**
   * 取得圖片 URL（支援私有 bucket）
   */
  static async getImageUrl(
    path: string,
    bucket: 'recipe-images' | 'avatars' = 'recipe-images',
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      if (bucket === 'avatars') {
        // 頭像使用公開 URL
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(path);
        return data.publicUrl;
      } else {
        // 食譜圖片使用簽名 URL
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, expiresIn);

        if (error) {
          throw new Error(`取得圖片 URL 失敗: ${error.message}`);
        }

        return data.signedUrl;
      }

    } catch (error) {
      console.error('ImageService.getImageUrl:', error);
      throw error;
    }
  }

  /**
   * 預覽圖片
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * 清理預覽 URL
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * 檢查圖片是否為正方形（用於頭像）
   */
  static async isSquareImage(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(img.width === img.height);
      };
      img.onerror = () => resolve(false);
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * 裁切圖片為正方形（用於頭像）
   */
  static async cropToSquare(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;

        canvas.width = size;
        canvas.height = size;

        ctx?.drawImage(img, x, y, size, size, 0, 0, size, size);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const croppedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });
              resolve(croppedFile);
            } else {
              reject(new Error('圖片裁切失敗'));
            }
          },
          file.type,
          0.9
        );
      };

      img.onerror = () => reject(new Error('圖片載入失敗'));
      img.src = URL.createObjectURL(file);
    });
  }
}
