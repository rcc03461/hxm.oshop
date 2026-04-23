# 首頁模組化（含草稿/發佈）實作計畫

**目標**  
在租戶子站首頁建立可配置的模組化版面系統，支援 `nav / banner / category / products / footer` 模組，並提供後台「草稿/發佈」兩版管理，確保前台僅渲染已發佈版本。

**範圍**
- 前台首頁：由固定內容改為依模組配置動態渲染
- 後台管理：模組排序、啟用切換、模組內容設定、草稿儲存、發佈
- 後端 API：store 端讀 published，admin 端編輯 draft 並可 publish
- 非本期：版本歷史回溯、多人協作衝突解決、A/B 測試

---

## 一、資料模型與檔案切分

### 1) 資料表（建議）
- Create: `server/database/migrations/0015_homepage_modules.sql`
- Modify: `server/database/schema.ts`
- Modify: `server/database/migrations/meta/_journal.json`
- Create/Modify: `server/database/migrations/meta/0015_snapshot.json`

建議新增 `tenant_homepage_modules`：
- `id` uuid pk
- `tenant_id` uuid not null
- `version_state` varchar(16) not null（`draft | published`）
- `module_key` varchar(64) not null（同租戶同版本唯一）
- `module_type` varchar(32) not null（`nav | banner | category | products | footer`）
- `sort_order` integer not null default 0
- `is_enabled` boolean not null default true
- `config_json` jsonb not null default '{}'
- `created_at` / `updated_at` timestamptz not null default now

索引與約束：
- unique：`(tenant_id, version_state, module_key)`
- index：`(tenant_id, version_state, sort_order)`
- check：`version_state in ('draft','published')`
- check：`module_type in ('nav','banner','category','products','footer')`

> 備註：首版直接使用「每個模組一行 + config_json」可快速落地；若後續有複雜查詢再拆正規化欄位。

### 2) 型別與模組契約
- Create: `app/types/homepage.ts`
- Create: `server/utils/homepageSchemas.ts`

內容：
- `HomepageModuleType`
- `HomepageVersionState`
- 各模組 config 型別（banner/category/products/nav/footer）
- zod 驗證（admin PUT 與 publish 前驗證共用）

---

## 二、API 設計（先 MVP 可落地）

### 1) Store 端（只讀 published）
- Create: `server/api/store/homepage/modules.get.ts`

行為：
- 用 `requireTenantStoreContext`
- 固定讀取 `version_state='published'`
- 回傳 `items`（已按 `sort_order` 排序）

回應範例：
```json
{
  "version": "published",
  "items": [
    { "moduleKey": "main-nav", "moduleType": "nav", "sortOrder": 0, "isEnabled": true, "config": {} }
  ]
}
```

### 2) Admin 端（讀 draft / 存 draft）
- Create: `server/api/admin/homepage/modules.get.ts`
- Create: `server/api/admin/homepage/modules.put.ts`

`GET /api/admin/homepage/modules`：
- 預設回傳 draft
- 若 draft 不存在，自動以 published 複製一份 draft（或初始化預設模組）

`PUT /api/admin/homepage/modules`：
- 接收整包 `items`
- 全量覆蓋 draft（transaction）
- 僅更新 draft，不影響 published

### 3) Admin 發佈
- Create: `server/api/admin/homepage/modules/publish.post.ts`

`POST /api/admin/homepage/modules/publish`：
- 先驗證 draft 全部模組 config
- transaction：
  1. 清空目前 published
  2. 將 draft 複製為 published
  3. 更新 `updated_at`
- 回傳 `publishedAt`

### 4)（可選）Admin 還原
- Create: `server/api/admin/homepage/modules/reset-draft.post.ts`

`POST /api/admin/homepage/modules/reset-draft`：
- 將 published 覆蓋回 draft（提供「放棄草稿改動」能力）

---

## 三、前端（租戶首頁）改造

### Task A：首頁改為動態模組渲染
**Files**
- Modify: `app/pages/index.vue`
- Create: `app/components/homepage/HomeModuleRenderer.vue`
- Create: `app/components/homepage/modules/HomeNavModule.vue`
- Create: `app/components/homepage/modules/HomeBannerModule.vue`
- Create: `app/components/homepage/modules/HomeCategoryModule.vue`
- Create: `app/components/homepage/modules/HomeProductsModule.vue`
- Create: `app/components/homepage/modules/HomeFooterModule.vue`

**實作要點**
- 在租戶首頁（`tenantSlug` 存在）呼叫 `/api/store/homepage/modules`
- 以 `v-for` 依 `sortOrder` 渲染啟用模組
- `HomeModuleRenderer` 使用 `moduleType -> component` 映射
- 單模組錯誤要降級（skip 該模組，不讓整頁 crash）
- 保留既有 skeleton 與 error retry UX 模式

**驗收**
- published 變更後前台刷新可見
- disabled 模組不渲染
- 未知 moduleType 被安全忽略並記錄 warning

---

## 四、後台（模組管理）頁面

### Task B：管理頁骨架與資料流
**Files**
- Create: `app/pages/admin/homepage.vue`
- Modify: `app/layouts/admin.vue`（加入「首頁模組」入口）

**實作要點**
- 頁面載入時抓 draft
- 顯示狀態：`草稿未發佈 / 已與發佈同步`
- 具備「儲存草稿」「發佈」「放棄草稿」按鈕

### Task C：模組列表編輯器
**Files**
- Create: `app/components/admin/homepage/AdminHomepageModuleList.vue`
- Create: `app/components/admin/homepage/AdminHomepageModuleItem.vue`
- Create: `app/components/admin/homepage/editors/*.vue`（依模組類型拆）

**實作要點**
- 支援拖曳排序（建議一層 list 即可）
- 啟用/停用切換
- 各模組欄位編輯：
  - `banner`：主標、副標、CTA 文字/連結
  - `category`：標題、顯示數量、排序策略
  - `products`：標題、來源（熱門/最新/指定分類）、顯示數量
  - `nav/footer`：可先最小欄位（是否顯示、樣式選項）
- 本地編輯狀態與 server draft 分離，按「儲存草稿」才送 PUT

### Task D：發佈流程
**Files**
- Modify: `app/pages/admin/homepage.vue`

**實作要點**
- 發佈前顯示確認 modal
- 發佈中禁用操作按鈕，避免重入
- 成功後提示「已發佈」，並更新本地同步狀態
- 失敗時保留草稿，不丟失編輯

---

## 五、草稿/發佈狀態機（明確規則）

- `GET admin/modules`：永遠給 draft（若無則從 published 建）
- `PUT admin/modules`：只改 draft
- `POST publish`：draft -> published（原子操作）
- `GET store/modules`：永遠讀 published
- store 不可讀 draft，避免未審核內容外露

邊界情境：
- published 為空：前台顯示 fallback（目前首頁簡版區塊）
- draft 非法：禁止 publish，回傳欄位錯誤列表
- 同時編輯：首版採最後寫入優先（後續可加 `updatedAt` 衝突檢查）

---

## 六、驗證與測試

### 1) API 測試（至少）
- draft 初次建立（無 draft 時可自動初始化）
- PUT draft 後，store 端仍舊讀舊 published
- publish 後，store 端切換到新內容
- tenant A 無法讀/改 tenant B 模組
- 非法 config publish 被拒（400）

### 2) 手動測試清單
- 後台改 banner 文字 -> 儲存草稿 -> 前台不變
- 點擊發佈 -> 前台刷新後更新
- 拖曳排序 -> 發佈 -> 前台順序一致
- 停用 products 模組 -> 發佈 -> 前台消失
- reset draft 後，編輯器內容回到 published

### 3) 建議命令
- `bun run db:migrate`
- `bun run dev`
- `bun run typecheck`（若有）

---

## 七、交付節奏（建議分 5 PR）

1. **PR-1 資料層與 schema**
   - migration + schema + 型別 + zod
2. **PR-2 後端 API**
   - admin/store modules API + publish/reset
3. **PR-3 前台首頁渲染**
   - renderer + 5 個 module component + index 接入
4. **PR-4 後台編輯器**
   - `admin/homepage` + 拖曳 + 模組欄位編輯 + 草稿儲存
5. **PR-5 發佈體驗與驗收**
   - publish UX、錯誤提示、手測文件、README/TODO 更新

---

## 八、風險與應對

- **config 結構快速膨脹**
  - 先以 module type 切分 editor 與 zod schema，避免單檔巨大
- **拖曳後資料錯序**
  - 前端永遠送全量 sort_order，後端 transaction 覆蓋
- **未發佈內容外露**
  - store API 僅查 published，且 server 端硬編碼，不接受版本參數
- **首頁模組 API 失敗**
  - `index.vue` 保留 fallback 區塊，不讓首頁空白

---

## 九、完成定義（DoD）

- 租戶首頁完全由 published 模組驅動
- 後台可編輯 draft、儲存、發佈、放棄草稿
- 發佈前後行為明確且可測
- tenant 隔離與基本驗證到位
- `docs/TODO.md` 的「首頁模組化」可勾選並附上草稿/發佈能力
