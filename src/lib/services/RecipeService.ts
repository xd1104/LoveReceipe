import { supabase } from '../supabase';

export interface Recipe {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  cover_url?: string;
  difficulty: 'easy' | 'normal' | 'hard';
  minutes?: number;
  servings?: number;
  status: 'to_try' | 'done' | 'favorite';
  public_id?: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  ingredients?: RecipeIngredient[];
  steps?: RecipeStep[];
  notes?: RecipeNote[];
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  name: string;
  amount?: string;
  unit?: string;
  note?: string;
  order_index?: number;
}

export interface RecipeStep {
  id?: string;
  recipe_id?: string;
  order_index: number;
  content: string;
  image_url?: string;
}

export interface RecipeNote {
  id: string;
  recipe_id: string;
  author_id: string;
  content: string;
  rating: number;
  images: string[];
  created_at: string;
}

export interface RecipeFilters {
  search?: string;
  status?: string;
  difficulty?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}

export class RecipeService {
  /**
   * 取得食譜列表
   */
  static async getRecipes(filters: RecipeFilters = {}): Promise<{ data: Recipe[]; hasMore: boolean }> {
    try {
      let query = supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(*),
          recipe_steps(*),
          recipe_tags(tags(name))
        `)
        .order('updated_at', { ascending: false });

      // 搜尋條件
      if (filters.search) {
        query = query.textSearch('title', filters.search);
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

      // 分頁
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      query = query.range(from, to);

      const { data, error } = await query;

      if (error) {
        throw new Error(`取得食譜列表失敗: ${error.message}`);
      }

      // 處理資料格式
      const recipes = data?.map(recipe => ({
        ...recipe,
        tags: recipe.recipe_tags?.map((rt: any) => rt.tags.name) || [],
        ingredients: recipe.recipe_ingredients || [],
        steps: recipe.recipe_steps?.sort((a: any, b: any) => a.order_index - b.order_index) || []
      })) || [];

      return {
        data: recipes,
        hasMore: recipes.length === limit
      };

    } catch (error) {
      console.error('RecipeService.getRecipes:', error);
      throw error;
    }
  }

  /**
   * 取得單一食譜
   */
  static async getRecipe(id: string): Promise<Recipe | null> {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(*),
          recipe_steps(*),
          recipe_tags(tags(name)),
          notes(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // 找不到食譜
        }
        throw new Error(`取得食譜失敗: ${error.message}`);
      }

      // 處理資料格式
      const recipe = {
        ...data,
        tags: data.recipe_tags?.map((rt: any) => rt.tags.name) || [],
        ingredients: data.recipe_ingredients?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
        steps: data.recipe_steps?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
        notes: data.notes || []
      };

      return recipe;

    } catch (error) {
      console.error('RecipeService.getRecipe:', error);
      throw error;
    }
  }

  /**
   * 建立食譜
   */
  static async createRecipe(recipeData: Partial<Recipe>): Promise<Recipe> {
    try {
      // 取得目前使用者
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      // 建立食譜主記錄
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          owner_id: user.id,
          title: recipeData.title,
          description: recipeData.description,
          cover_url: recipeData.cover_url,
          difficulty: recipeData.difficulty,
          minutes: recipeData.minutes,
          servings: recipeData.servings,
          status: recipeData.status
        })
        .select()
        .single();

      if (recipeError) {
        throw new Error(`建立食譜失敗: ${recipeError.message}`);
      }

      // 建立食材記錄
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        const ingredients = recipeData.ingredients.map((ingredient, index) => ({
          recipe_id: recipe.id,
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
          note: ingredient.note,
          order_index: index
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(ingredients);

        if (ingredientsError) {
          console.error('建立食材失敗:', ingredientsError);
        }
      }

      // 建立步驟記錄
      if (recipeData.steps && recipeData.steps.length > 0) {
        const steps = recipeData.steps.map((step, index) => ({
          recipe_id: recipe.id,
          order_index: index,
          content: step.content,
          image_url: step.image_url
        }));

        const { error: stepsError } = await supabase
          .from('recipe_steps')
          .insert(steps);

        if (stepsError) {
          console.error('建立步驟失敗:', stepsError);
        }
      }

      // 建立標籤關聯
      if (recipeData.tags && recipeData.tags.length > 0) {
        await this.updateRecipeTags(recipe.id, recipeData.tags);
      }

      return recipe;

    } catch (error) {
      console.error('RecipeService.createRecipe:', error);
      throw error;
    }
  }

  /**
   * 更新食譜
   */
  static async updateRecipe(id: string, recipeData: Partial<Recipe>): Promise<Recipe> {
    try {
      // 更新食譜主記錄
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .update({
          title: recipeData.title,
          description: recipeData.description,
          cover_url: recipeData.cover_url,
          difficulty: recipeData.difficulty,
          minutes: recipeData.minutes,
          servings: recipeData.servings,
          status: recipeData.status
        })
        .eq('id', id)
        .select()
        .single();

      if (recipeError) {
        throw new Error(`更新食譜失敗: ${recipeError.message}`);
      }

      // 更新食材記錄
      if (recipeData.ingredients) {
        // 刪除現有食材
        await supabase
          .from('recipe_ingredients')
          .delete()
          .eq('recipe_id', id);

        // 新增食材
        if (recipeData.ingredients.length > 0) {
          const ingredients = recipeData.ingredients.map((ingredient, index) => ({
            recipe_id: id,
            name: ingredient.name,
            amount: ingredient.amount,
            unit: ingredient.unit,
            note: ingredient.note,
            order_index: index
          }));

          await supabase
            .from('recipe_ingredients')
            .insert(ingredients);
        }
      }

      // 更新步驟記錄
      if (recipeData.steps) {
        // 刪除現有步驟
        await supabase
          .from('recipe_steps')
          .delete()
          .eq('recipe_id', id);

        // 新增步驟
        if (recipeData.steps.length > 0) {
          const steps = recipeData.steps.map((step, index) => ({
            recipe_id: id,
            order_index: index,
            content: step.content,
            image_url: step.image_url
          }));

          await supabase
            .from('recipe_steps')
            .insert(steps);
        }
      }

      // 更新標籤關聯
      if (recipeData.tags) {
        await this.updateRecipeTags(id, recipeData.tags);
      }

      return recipe;

    } catch (error) {
      console.error('RecipeService.updateRecipe:', error);
      throw error;
    }
  }

  /**
   * 刪除食譜
   */
  static async deleteRecipe(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error(`刪除食譜失敗: ${error.message}`);
      }

    } catch (error) {
      console.error('RecipeService.deleteRecipe:', error);
      throw error;
    }
  }

  /**
   * 更新食譜標籤
   */
  private static async updateRecipeTags(recipeId: string, tags: string[]): Promise<void> {
    try {
      // 刪除現有標籤關聯
      await supabase
        .from('recipe_tags')
        .delete()
        .eq('recipe_id', recipeId);

      if (tags.length === 0) return;

      // 取得或建立標籤
      const tagIds: string[] = [];
      for (const tagName of tags) {
        // 檢查標籤是否存在
        let { data: existingTag } = await supabase
          .from('tags')
          .select('id')
          .eq('name', tagName)
          .single();

        if (!existingTag) {
          // 建立新標籤
          const { data: newTag, error } = await supabase
            .from('tags')
            .insert({ name: tagName })
            .select()
            .single();

          if (error) {
            console.error('建立標籤失敗:', error);
            continue;
          }
          existingTag = newTag;
        }

        tagIds.push(existingTag.id);
      }

      // 建立標籤關聯
      if (tagIds.length > 0) {
        const recipeTags = tagIds.map(tagId => ({
          recipe_id: recipeId,
          tag_id: tagId
        }));

        await supabase
          .from('recipe_tags')
          .insert(recipeTags);
      }

    } catch (error) {
      console.error('RecipeService.updateRecipeTags:', error);
      throw error;
    }
  }

  /**
   * 新增心得
   */
  static async addNote(recipeId: string, noteData: {
    content: string;
    rating: number;
    images?: string[];
  }): Promise<RecipeNote> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('請先登入');
      }

      const { data: note, error } = await supabase
        .from('notes')
        .insert({
          recipe_id: recipeId,
          author_id: user.id,
          content: noteData.content,
          rating: noteData.rating,
          images: noteData.images || []
        })
        .select()
        .single();

      if (error) {
        throw new Error(`新增心得失敗: ${error.message}`);
      }

      return note;

    } catch (error) {
      console.error('RecipeService.addNote:', error);
      throw error;
    }
  }

  /**
   * 取得所有標籤
   */
  static async getTags(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('name')
        .order('name');

      if (error) {
        throw new Error(`取得標籤失敗: ${error.message}`);
      }

      return data?.map(tag => tag.name) || [];

    } catch (error) {
      console.error('RecipeService.getTags:', error);
      throw error;
    }
  }
}
