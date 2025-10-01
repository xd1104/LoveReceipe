-- RLS 策略設定
-- 適用於 Supabase PostgreSQL

-- 啟用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;

-- 1. profiles 表策略
-- 僅本人可讀寫自己的 profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. recipes 表策略
-- 擁有者、共編者、或公開食譜可讀取
CREATE POLICY "Recipes are viewable by owner, collaborators, or public" ON recipes
    FOR SELECT USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM collaborators 
            WHERE recipe_id = recipes.id 
            AND user_id = auth.uid()
        ) OR
        public_id IS NOT NULL
    );

-- 擁有者或編輯者可以新增/更新/刪除
CREATE POLICY "Recipes are manageable by owner and editors" ON recipes
    FOR ALL USING (
        auth.uid() = owner_id OR
        EXISTS (
            SELECT 1 FROM collaborators 
            WHERE recipe_id = recipes.id 
            AND user_id = auth.uid() 
            AND role = 'editor'
        )
    );

-- 3. recipe_ingredients 表策略
-- 與對應的 recipe 權限相同
CREATE POLICY "Recipe ingredients follow recipe permissions" ON recipe_ingredients
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE id = recipe_ingredients.recipe_id 
            AND (
                auth.uid() = owner_id OR
                EXISTS (
                    SELECT 1 FROM collaborators 
                    WHERE recipe_id = recipes.id 
                    AND user_id = auth.uid()
                ) OR
                public_id IS NOT NULL
            )
        )
    );

-- 4. recipe_steps 表策略
-- 與對應的 recipe 權限相同
CREATE POLICY "Recipe steps follow recipe permissions" ON recipe_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE id = recipe_steps.recipe_id 
            AND (
                auth.uid() = owner_id OR
                EXISTS (
                    SELECT 1 FROM collaborators 
                    WHERE recipe_id = recipes.id 
                    AND user_id = auth.uid()
                ) OR
                public_id IS NOT NULL
            )
        )
    );

-- 5. tags 表策略
-- 所有已登入使用者可讀取，僅擁有者可管理
CREATE POLICY "Tags are viewable by authenticated users" ON tags
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Tags are manageable by authenticated users" ON tags
    FOR ALL USING (auth.role() = 'authenticated');

-- 6. recipe_tags 表策略
-- 與對應的 recipe 權限相同
CREATE POLICY "Recipe tags follow recipe permissions" ON recipe_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE id = recipe_tags.recipe_id 
            AND (
                auth.uid() = owner_id OR
                EXISTS (
                    SELECT 1 FROM collaborators 
                    WHERE recipe_id = recipes.id 
                    AND user_id = auth.uid()
                ) OR
                public_id IS NOT NULL
            )
        )
    );

-- 7. notes 表策略
-- 擁有者、共編者、或公開食譜可讀取
-- 僅擁有者、編輯者可新增/更新/刪除
CREATE POLICY "Notes are viewable by recipe access" ON notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE id = notes.recipe_id 
            AND (
                auth.uid() = owner_id OR
                EXISTS (
                    SELECT 1 FROM collaborators 
                    WHERE recipe_id = recipes.id 
                    AND user_id = auth.uid()
                ) OR
                public_id IS NOT NULL
            )
        )
    );

CREATE POLICY "Notes are manageable by recipe editors" ON notes
    FOR ALL USING (
        auth.uid() = author_id AND
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE id = notes.recipe_id 
            AND (
                auth.uid() = owner_id OR
                EXISTS (
                    SELECT 1 FROM collaborators 
                    WHERE recipe_id = recipes.id 
                    AND user_id = auth.uid() 
                    AND role = 'editor'
                )
            )
        )
    );

-- 8. collaborators 表策略
-- 僅食譜擁有者可管理共編者
CREATE POLICY "Collaborators are manageable by recipe owner" ON collaborators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE id = collaborators.recipe_id 
            AND auth.uid() = owner_id
        )
    );

-- 共編者可查看自己參與的食譜的共編者列表
CREATE POLICY "Collaborators are viewable by recipe participants" ON collaborators
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE id = collaborators.recipe_id 
            AND (
                auth.uid() = owner_id OR
                EXISTS (
                    SELECT 1 FROM collaborators c2
                    WHERE c2.recipe_id = recipes.id 
                    AND c2.user_id = auth.uid()
                )
            )
        )
    );
