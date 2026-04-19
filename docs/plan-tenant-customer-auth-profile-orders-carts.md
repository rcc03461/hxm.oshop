# 計畫：租戶會員（註冊 / 登入 / Profile / Orders / Carts）DB、API、UI

## 目標

在不影響既有後台與前台商品/結帳流程前提下，補齊租戶子站會員體系，讓顧客可在子網域完成：

1. 會員註冊與登入
2. 維護個人資料（Profile）
3. 查看個人訂單（Orders）
4. 跨訪問維持購物車（Carts）

---

## 範圍與邊界

### 本計畫範圍（MVP）
- 子網域會員註冊 / 登入 / 登出
- 會員 Session（Cookie）與當前 cart 綁定
- `/profile`、`/profile/orders`、`/profile/orders/[order_uuid]`
- cart 持久化：訪客 cart 與會員 cart 合併策略

### 非本計畫範圍
- 社交登入（Google / Apple）
- 忘記密碼 / 重設密碼 Email 流程
- 多裝置即時同步 cart
- 會員地址簿多筆管理

---

## 資料庫設計（DB）

## 1) 新增 / 調整資料表

- `customers`
  - 關鍵欄位：`id`、`tenant_id`、`email`、`password_hash`、`full_name`、`phone`、`status`、`created_at`、`updated_at`
  - 唯一鍵：`(tenant_id, email)`（同 email 可存在不同租戶）

- `carts`（若既有欄位不足需補齊）
  - 關鍵欄位：`id`、`tenant_id`、`customer_id`（nullable）、`session_key`（nullable）、`status`（active/ordered/abandoned）、`created_at`、`updated_at`
  - 索引：
    - `(tenant_id, customer_id, status)`：快速取會員 active cart
    - `(tenant_id, session_key, status)`：快速取訪客 active cart

- `orders`（若既有欄位不足需補齊）
  - 關鍵欄位：`id`、`tenant_id`、`customer_id`（nullable, MVP 建議改為 non-null）、`order_uuid`、`status`、`total_amount`、`currency`、`created_at`
  - 索引：
    - `(tenant_id, customer_id, created_at desc)`：會員訂單列表
    - `(tenant_id, order_uuid)` unique：前台查單

## 2) 遷移策略

- migration A：建立/補強 `customers`
- migration B：補齊 `carts.customer_id`、`session_key`、索引
- migration C：補齊 `orders.customer_id`、`order_uuid`、索引
- 每次 migration 後跑 smoke query，確認不破壞既有 checkout

---

## API 設計（Server）

## 1) Auth API（store/customer）

- `POST /api/store/auth/register`
  - 入參：`email`、`password`、`fullName?`、`phone?`
  - 行為：建立 customer、寫入 customer session cookie、觸發 cart merge

- `POST /api/store/auth/login`
  - 入參：`email`、`password`
  - 行為：驗證密碼、寫入 customer session cookie、觸發 cart merge

- `POST /api/store/auth/logout`
  - 行為：清除 customer session cookie（不刪 cart 資料）

- `GET /api/store/auth/me`
  - 回傳：當前 customer 基本資訊（不含敏感欄位）

## 2) Profile API

- `GET /api/store/profile`
  - 回傳：`fullName`、`email`、`phone`

- `PATCH /api/store/profile`
  - 入參：`fullName`、`phone`
  - 備註：`email` 暫不開放修改（避免驗證流程擴張）

## 3) Orders API

- `GET /api/store/orders`
  - 支援分頁（`page`、`pageSize`）與預設按 `created_at desc`

- `GET /api/store/orders/:orderUuid`
  - 僅允許讀取「當前 customer 且同 tenant」的訂單
  - 回傳訂單主檔 + 明細 + 付款摘要

## 4) Cart API（會員整合）

- `GET /api/store/cart`
  - 優先讀取會員 active cart；未登入則讀 session cart

- `POST /api/store/cart/items`
- `PATCH /api/store/cart/items/:itemId`
- `DELETE /api/store/cart/items/:itemId`
  - 三個 API 都要走同一層 cart resolver（member/session）

- `POST /api/store/cart/merge`（可內部呼叫，不一定暴露前端）
  - 登入/註冊後將 session cart 合併至 customer active cart

## 5) 安全與租戶隔離（所有 API）

- 從 host 解析 `shopSlug`，再映射 `tenant_id`
- Session 解析出 `customer_id`，查詢條件強制包含 `tenant_id`
- 禁止僅靠前端傳入 `customer_id` / `tenant_id`

---

## UI 設計（Nuxt Pages）

## 1) 新增頁面

- `app/pages/register.vue`（租戶會員註冊）
- `app/pages/login.vue`（租戶會員登入）
- `app/pages/profile/index.vue`
- `app/pages/profile/orders/index.vue`
- `app/pages/profile/orders/[order_uuid].vue`

> 若主站已使用同路由，建議以 middleware 判斷 host：主站顯示平台 auth；子站顯示會員 auth。

## 2) 互動規格

- Auth 頁
  - 成功後導回前頁；若無前頁則導 `/profile`
  - 顯示常見錯誤：帳號已存在、帳密錯誤、欄位格式錯誤

- Profile 頁
  - 讀取 `GET /profile` 初始化
  - 更新成功 toast，失敗保留表單值

- Orders 頁
  - 列表頁顯示：訂單號、建立時間、金額、狀態
  - 詳情頁顯示：收件資訊、商品明細、付款摘要

- Cart 與登入狀態
  - Header 顯示登入者名稱/Email 縮寫
  - 登入前後 cart badge 數量應連續（合併後不歸零）

---

## 實作順序（建議 5 個里程碑）

## M1：會員基礎與 Session
- 建立 `customers` schema + migration
- 完成 register/login/logout/me API
- 完成 password hash / verify、cookie 寫入與清除

## M2：Cart 與會員綁定
- 完成 cart resolver（member/session）
- 完成登入後 cart merge（含重複商品數量合併規則）
- 回歸測試既有 `/cart`、`/payment`

## M3：Profile
- `GET/PATCH /profile`
- `/profile` 頁面與表單驗證

## M4：Orders
- `/orders`、`/orders/:orderUuid` API
- `/profile/orders`、`/profile/orders/[order_uuid]` UI

## M5：整合與防呆
- middleware / route guard（未登入導 `/login`）
- 錯誤文案、空狀態、loading skeleton
- 手動測試腳本 + 文件同步（PRD/TODO/README）

---

## 驗收清單（Definition of Done）

- [ ] 子網域可完成會員註冊、登入、登出
- [ ] 會員可查看與更新 `/profile`（email 除外）
- [ ] 會員可在 `/profile/orders` 查看自身訂單，且無法存取他人訂單
- [ ] 訪客加入 cart 後登入，商品仍存在（已合併）
- [ ] 所有 store API 都以 `tenant_id` + `customer_id` 雙重限制
- [ ] 文件同步完成：`docs/PRD.md`、`docs/TODO.md`

---

## 參考與依賴

- `docs/PRD.md`
- `docs/TODO.md`
- `docs/plan-main-site-landing-auth.md`
- `docs/plan-tenant-admin-and-platform-login-redirect.md`
