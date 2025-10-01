import { supabase } from '../supabase';

export interface Profile {
  id: string;
  nickname?: string;
  avatar_url?: string;
  created_at: string;
}

export class ProfileService {
  /**
   * 取得使用者個人資料
   */
  static async getProfile(userId?: string): Promise<Profile | null> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('請先登入');
        }
        targetUserId = user.id;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 找不到個人資料
        }
        throw new Error(`取得個人資料失敗: ${error.message}`);
      }

      return profile;

    } catch (error) {
      console.error('ProfileService.getProfile:', error);
      throw error;
    }
  }

  /**
   * 建立或更新個人資料
   */
  static async upsertProfile(profileData: {
    nickname?: string;
    avatar_url?: string;
  }): Promise<Profile> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          nickname: profileData.nickname,
          avatar_url: profileData.avatar_url
        })
        .select()
        .single();

      if (error) {
        throw new Error(`更新個人資料失敗: ${error.message}`);
      }

      return profile;

    } catch (error) {
      console.error('ProfileService.upsertProfile:', error);
      throw error;
    }
  }

  /**
   * 更新暱稱
   */
  static async updateNickname(nickname: string): Promise<Profile> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      if (!nickname.trim()) {
        throw new Error('暱稱不能為空');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          nickname: nickname.trim()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`更新暱稱失敗: ${error.message}`);
      }

      return profile;

    } catch (error) {
      console.error('ProfileService.updateNickname:', error);
      throw error;
    }
  }

  /**
   * 更新頭像
   */
  static async updateAvatar(avatarUrl: string): Promise<Profile> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      if (!avatarUrl.trim()) {
        throw new Error('頭像 URL 不能為空');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: avatarUrl.trim()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`更新頭像失敗: ${error.message}`);
      }

      return profile;

    } catch (error) {
      console.error('ProfileService.updateAvatar:', error);
      throw error;
    }
  }

  /**
   * 刪除個人資料
   */
  static async deleteProfile(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (error) {
        throw new Error(`刪除個人資料失敗: ${error.message}`);
      }

    } catch (error) {
      console.error('ProfileService.deleteProfile:', error);
      throw error;
    }
  }

  /**
   * 取得使用者統計資料
   */
  static async getUserStats(): Promise<{
    recipeCount: number;
    noteCount: number;
    favoriteCount: number;
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      // 取得食譜數量
      const { count: recipeCount } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      // 取得心得數量
      const { count: noteCount } = await supabase
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', user.id);

      // 取得收藏數量
      const { count: favoriteCount } = await supabase
        .from('recipes')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('status', 'favorite');

      return {
        recipeCount: recipeCount || 0,
        noteCount: noteCount || 0,
        favoriteCount: favoriteCount || 0
      };

    } catch (error) {
      console.error('ProfileService.getUserStats:', error);
      throw error;
    }
  }
}
