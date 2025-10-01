-- Supabase Storage 設定
-- 用於圖片上傳與管理

-- 建立私有 bucket 用於食譜圖片
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images', 
  false, -- 私有 bucket
  5242880, -- 5MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- 建立公開 bucket 用於頭像（可選）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true, -- 公開 bucket
  2097152, -- 2MB 限制
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS 策略
-- recipe-images bucket：僅擁有者與共編者可存取
CREATE POLICY "Recipe images are accessible by recipe participants" ON storage.objects
FOR ALL USING (
  bucket_id = 'recipe-images' AND
  (
    -- 擁有者
    EXISTS (
      SELECT 1 FROM recipes 
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    ) OR
    -- 共編者
    EXISTS (
      SELECT 1 FROM recipes r
      JOIN collaborators c ON c.recipe_id = r.id
      WHERE r.id::text = (storage.foldername(name))[1]
      AND c.user_id = auth.uid()
    )
  )
);

-- avatars bucket：公開讀取，僅本人可上傳
CREATE POLICY "Avatars are publicly readable" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
