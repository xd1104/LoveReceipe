# 資料庫設定說明

## 設定步驟

### 1. 建立 Supabase 專案
1. 前往 [Supabase](https://supabase.com) 建立新專案
2. 記錄專案的 URL 和 anon key

### 2. 設定環境變數
在 `web/.env` 檔案中設定：
```env
PUBLIC_SUPABASE_URL=your_supabase_url_here
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 3. 執行資料庫腳本
在 Supabase Dashboard 的 SQL Editor 中依序執行：

1. **schema.sql** - 建立所有資料表、索引和觸發器
2. **rls_policies.sql** - 設定行級安全策略
3. **storage_setup.sql** - 設定檔案儲存空間

### 4. 驗證設定
執行以下查詢確認設定正確：
```sql
-- 檢查所有表格是否建立
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 檢查 RLS 是否啟用
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- 檢查 Storage buckets
SELECT * FROM storage.buckets;
```

## 資料表說明

### 核心表格
- **profiles**: 使用者個人資料
- **recipes**: 食譜主表
- **recipe_ingredients**: 食材清單
- **recipe_steps**: 烹飪步驟
- **notes**: 心得記錄

### 關聯表格
- **tags**: 標籤
- **recipe_tags**: 食譜標籤關聯
- **collaborators**: 共同編輯者

### 權限設計
- 食譜擁有者：完整權限
- 編輯者：可編輯內容
- 查看者：僅可查看
- 公開食譜：透過 public_id 分享

## 注意事項

1. **中文全文檢索**：已設定中文分詞索引
2. **圖片上傳**：使用私有 Storage bucket
3. **權限控制**：透過 RLS 確保資料安全
4. **效能優化**：已建立必要索引
