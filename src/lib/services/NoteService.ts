import { supabase } from '../supabase';

export interface Note {
  id: string;
  recipe_id: string;
  author_id: string;
  content: string;
  rating: number;
  images: string[];
  created_at: string;
  recipe?: {
    id: string;
    title: string;
    cover_url?: string;
  };
  author?: {
    id: string;
    nickname?: string;
    avatar_url?: string;
  };
}

export interface NoteFilters {
  recipe_id?: string;
  author_id?: string;
  rating?: number;
  page?: number;
  limit?: number;
}

export class NoteService {
  /**
   * 取得心得列表
   */
  static async getNotes(filters: NoteFilters = {}): Promise<{ data: Note[]; hasMore: boolean }> {
    try {
      let query = supabase
        .from('notes')
        .select(`
          *,
          recipe:recipes(id, title, cover_url),
          author:profiles!notes_author_id_fkey(id, nickname, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // 食譜篩選
      if (filters.recipe_id) {
        query = query.eq('recipe_id', filters.recipe_id);
      }

      // 作者篩選
      if (filters.author_id) {
        query = query.eq('author_id', filters.author_id);
      }

      // 評分篩選
      if (filters.rating) {
        query = query.eq('rating', filters.rating);
      }

      // 分頁
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        throw new Error(`取得心得列表失敗: ${error.message}`);
      }

      return {
        data: data || [],
        hasMore: (data?.length || 0) === limit
      };

    } catch (error) {
      console.error('NoteService.getNotes:', error);
      throw error;
    }
  }

  /**
   * 取得單一心得
   */
  static async getNote(id: string): Promise<Note | null> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          recipe:recipes(id, title, cover_url),
          author:profiles!notes_author_id_fkey(id, nickname, avatar_url)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 找不到心得
        }
        throw new Error(`取得心得失敗: ${error.message}`);
      }

      return data;

    } catch (error) {
      console.error('NoteService.getNote:', error);
      throw error;
    }
  }

  /**
   * 新增心得
   */
  static async createNote(noteData: {
    recipe_id: string;
    content: string;
    rating: number;
    images?: string[];
  }): Promise<Note> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      const { data: note, error } = await supabase
        .from('notes')
        .insert({
          recipe_id: noteData.recipe_id,
          author_id: user.id,
          content: noteData.content,
          rating: noteData.rating,
          images: noteData.images || []
        })
        .select(`
          *,
          recipe:recipes(id, title, cover_url),
          author:profiles!notes_author_id_fkey(id, nickname, avatar_url)
        `)
        .single();

      if (error) {
        throw new Error(`新增心得失敗: ${error.message}`);
      }

      return note;

    } catch (error) {
      console.error('NoteService.createNote:', error);
      throw error;
    }
  }

  /**
   * 更新心得
   */
  static async updateNote(id: string, noteData: {
    content?: string;
    rating?: number;
    images?: string[];
  }): Promise<Note> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      // 檢查權限（只有作者可以更新）
      const { data: existingNote } = await supabase
        .from('notes')
        .select('author_id')
        .eq('id', id)
        .single();

      if (!existingNote || existingNote.author_id !== user.id) {
        throw new Error('無權限更新此心得');
      }

      const { data: note, error } = await supabase
        .from('notes')
        .update({
          content: noteData.content,
          rating: noteData.rating,
          images: noteData.images
        })
        .eq('id', id)
        .select(`
          *,
          recipe:recipes(id, title, cover_url),
          author:profiles!notes_author_id_fkey(id, nickname, avatar_url)
        `)
        .single();

      if (error) {
        throw new Error(`更新心得失敗: ${error.message}`);
      }

      return note;

    } catch (error) {
      console.error('NoteService.updateNote:', error);
      throw error;
    }
  }

  /**
   * 刪除心得
   */
  static async deleteNote(id: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      // 檢查權限（只有作者可以刪除）
      const { data: existingNote } = await supabase
        .from('notes')
        .select('author_id')
        .eq('id', id)
        .single();

      if (!existingNote || existingNote.author_id !== user.id) {
        throw new Error('無權限刪除此心得');
      }

      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`刪除心得失敗: ${error.message}`);
      }

    } catch (error) {
      console.error('NoteService.deleteNote:', error);
      throw error;
    }
  }

  /**
   * 取得使用者的所有心得
   */
  static async getUserNotes(userId?: string): Promise<Note[]> {
    try {
      let targetUserId = userId;
      
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('請先登入');
        }
        targetUserId = user.id;
      }

      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          recipe:recipes(id, title, cover_url),
          author:profiles!notes_author_id_fkey(id, nickname, avatar_url)
        `)
        .eq('author_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`取得使用者心得失敗: ${error.message}`);
      }

      return data || [];

    } catch (error) {
      console.error('NoteService.getUserNotes:', error);
      throw error;
    }
  }
}
