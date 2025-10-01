import { supabase } from '../supabase';

export interface SearchFilters {
  query?: string;
  status?: string;
  difficulty?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'updated_at' | 'created_at' | 'title' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  recipes: any[];
  total: number;
  hasMore: boolean;
  suggestions?: string[];
}

export class SearchService {
  /**
   * 搜尋食譜
   */
  static async searchRecipes(filters: SearchFilters = {}): Promise<SearchResult> {
    try {
      let query = supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(*),
          recipe_steps(*),
          recipe_tags(tags(name)),
          notes(rating)
        `);

      // 全文檢索搜尋
      if (filters.query) {
        query = query.textSearch('title', filters.query);
      }

      // 狀態篩選
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // 難度篩選
      if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }

      // 標籤篩選
      if (filters.tags && filters.tags.length > 0) {
        query = query.in('recipe_tags.tag_id', filters.tags);
      }

      // 排序
      const sortBy = filters.sortBy || 'updated_at';
      const sortOrder = filters.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // 分頁
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`搜尋失敗: ${error.message}`);
      }

      // 處理資料格式
      const recipes = data?.map(recipe => ({
        ...recipe,
        tags: recipe.recipe_tags?.map((rt: any) => rt.tags.name) || [],
        ingredients: recipe.recipe_ingredients || [],
        steps: recipe.recipe_steps?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
        averageRating: this.calculateAverageRating(recipe.notes)
      })) || [];

      return {
        recipes,
        total: count || 0,
        hasMore: recipes.length === limit,
        suggestions: filters.query ? await this.getSearchSuggestions(filters.query) : undefined
      };

    } catch (error) {
      console.error('SearchService.searchRecipes:', error);
      throw error;
    }
  }

  /**
   * 取得搜尋建議
   */
  static async getSearchSuggestions(query: string): Promise<string[]> {
    try {
      // 搜尋標題包含查詢字串的食譜
      const { data: titleMatches } = await supabase
        .from('recipes')
        .select('title')
        .ilike('title', `%${query}%`)
        .limit(5);

      // 搜尋標籤包含查詢字串的標籤
      const { data: tagMatches } = await supabase
        .from('tags')
        .select('name')
        .ilike('name', `%${query}%`)
        .limit(5);

      const suggestions = new Set<string>();

      // 從標題中提取建議
      titleMatches?.forEach(recipe => {
        const words = recipe.title.split(/\s+/);
        words.forEach(word => {
          if (word.toLowerCase().includes(query.toLowerCase()) && word.length > 1) {
            suggestions.add(word);
          }
        });
      });

      // 從標籤中提取建議
      tagMatches?.forEach(tag => {
        suggestions.add(tag.name);
      });

      return Array.from(suggestions).slice(0, 8);

    } catch (error) {
      console.error('SearchService.getSearchSuggestions:', error);
      return [];
    }
  }

  /**
   * 取得熱門搜尋關鍵字
   */
  static async getPopularKeywords(): Promise<string[]> {
    try {
      // 這裡可以實作更複雜的邏輯，例如根據搜尋頻率排序
      // 目前先返回一些預設的熱門關鍵字
      return [
        '義大利麵',
        '家常菜',
        '簡單',
        '下飯菜',
        '甜點',
        '湯品',
        '素食',
        '快速料理'
      ];

    } catch (error) {
      console.error('SearchService.getPopularKeywords:', error);
      return [];
    }
  }

  /**
   * 取得相關食譜
   */
  static async getRelatedRecipes(recipeId: string, limit: number = 5): Promise<any[]> {
    try {
      // 先取得目標食譜的標籤
      const { data: recipe } = await supabase
        .from('recipes')
        .select(`
          recipe_tags(tags(name))
        `)
        .eq('id', recipeId)
        .single();

      if (!recipe?.recipe_tags?.length) {
        return [];
      }

      const tags = recipe.recipe_tags.map((rt: any) => rt.tags.name);

      // 搜尋有相同標籤的其他食譜
      const { data: relatedRecipes } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_tags(tags(name))
        `)
        .neq('id', recipeId)
        .in('recipe_tags.tag_id', tags)
        .limit(limit);

      return relatedRecipes?.map(recipe => ({
        ...recipe,
        tags: recipe.recipe_tags?.map((rt: any) => rt.tags.name) || []
      })) || [];

    } catch (error) {
      console.error('SearchService.getRelatedRecipes:', error);
      return [];
    }
  }

  /**
   * 取得標籤雲
   */
  static async getTagCloud(): Promise<Array<{ name: string; count: number }>> {
    try {
      const { data, error } = await supabase
        .from('recipe_tags')
        .select(`
          tags(name)
        `);

      if (error) {
        throw new Error(`取得標籤雲失敗: ${error.message}`);
      }

      // 計算標籤使用次數
      const tagCounts = new Map<string, number>();
      data?.forEach(item => {
        const tagName = item.tags.name;
        tagCounts.set(tagName, (tagCounts.get(tagName) || 0) + 1);
      });

      // 轉換為陣列並排序
      return Array.from(tagCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20); // 只返回前 20 個最常用的標籤

    } catch (error) {
      console.error('SearchService.getTagCloud:', error);
      return [];
    }
  }

  /**
   * 儲存搜尋歷史
   */
  static async saveSearchHistory(query: string): Promise<void> {
    try {
      if (!query.trim()) return;

      // 取得目前使用者
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 這裡可以實作搜尋歷史的儲存邏輯
      // 例如儲存到 localStorage 或後端資料庫
      const history = this.getSearchHistory();
      const newHistory = [query, ...history.filter(item => item !== query)].slice(0, 10);
      localStorage.setItem('search_history', JSON.stringify(newHistory));

    } catch (error) {
      console.error('SearchService.saveSearchHistory:', error);
    }
  }

  /**
   * 取得搜尋歷史
   */
  static getSearchHistory(): string[] {
    try {
      const history = localStorage.getItem('search_history');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('SearchService.getSearchHistory:', error);
      return [];
    }
  }

  /**
   * 清除搜尋歷史
   */
  static clearSearchHistory(): void {
    try {
      localStorage.removeItem('search_history');
    } catch (error) {
      console.error('SearchService.clearSearchHistory:', error);
    }
  }

  /**
   * 計算平均評分
   */
  private static calculateAverageRating(notes: any[]): number {
    if (!notes || notes.length === 0) return 0;

    const totalRating = notes.reduce((sum, note) => sum + (note.rating || 0), 0);
    return Math.round((totalRating / notes.length) * 10) / 10; // 保留一位小數
  }

  /**
   * 高亮搜尋關鍵字
   */
  static highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200">$1</mark>');
  }

  /**
   * 分析搜尋查詢
   */
  static analyzeQuery(query: string): {
    keywords: string[];
    hasQuotes: boolean;
    hasMinus: boolean;
    hasPlus: boolean;
  } {
    const keywords = query.trim().split(/\s+/).filter(word => word.length > 0);
    const hasQuotes = query.includes('"');
    const hasMinus = keywords.some(word => word.startsWith('-'));
    const hasPlus = keywords.some(word => word.startsWith('+'));

    return {
      keywords,
      hasQuotes,
      hasMinus,
      hasPlus
    };
  }
}
