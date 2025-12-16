# mori-pics 🍊

基于 CloudFlare Workers + D1 + R2 的私人图床系统。

[English](./README.md) | 简体中文

## ✨ 功能特性

- 🔐 **用户认证** - 简单的管理员登录系统，JWT 令牌验证
- 📤 **图片上传** - 直传 CloudFlare R2，支持拖拽/粘贴/点击
- 🖼️ **图片管理** - 浏览所有图片，支持分页和搜索
- 📊 **数据统计** - 上传次数、查看次数、每日趋势图表
- 🗜️ **WebP 压缩** - 客户端自动压缩，节省存储空间
- 🔒 **密钥安全** - R2 密钥存储在服务端，不暴露到前端
- 📱 **响应式设计** - 桌面和移动端完美适配

## 🚀 快速开始

### 前置要求

1. [Node.js](https://nodejs.org/) 18+
2. CloudFlare 账号，并已创建：
   - 一个 R2 存储桶
   - 可选：自定义域名绑定到 R2

### 部署方式一：GitHub 集成部署（推荐）

#### 1. Fork 或 Clone 仓库

```bash
git clone https://github.com/你的用户名/mori-pics.git
cd mori-pics
```

#### 2. 创建 D1 数据库

```bash
# 登录 CloudFlare
npx wrangler login

# 创建数据库
npx wrangler d1 create mori-pics-db

# 初始化表结构
npx wrangler d1 execute mori-pics-db --remote --file=./src/db/schema.sql
```

#### 3. 连接 GitHub 到 CloudFlare Pages

1. 登录 [CloudFlare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. 选择你的 `mori-pics` 仓库
4. 构建设置：
   - **Framework preset**: `None`
   - **Build command**: 留空（或填 `npm install`）
   - **Build output directory**: `public`

#### 4. 配置绑定和环境变量

部署完成后，进入项目 **Settings**：

**Functions 标签页：**

| 绑定类型 | Variable name | 选择 |
|----------|---------------|------|
| D1 database | `DB` | 选择 `mori-pics-db` |
| R2 bucket | `R2` | 选择你的存储桶 |

**Environment variables 标签页：**

| 变量名 | 值 | 加密 |
|--------|-----|------|
| `CUSTOM_DOMAIN` | `https://你的域名` | 否 |
| `JWT_SECRET` | 随机强密码（32位以上） | ✅ 是 |

#### 5. 重新部署

配置完成后，需要触发一次新部署：
- 推送一个新 commit，或
- 在 Dashboard 点击 **Retry deployment**

---

### 部署方式二：Wrangler CLI 部署

```bash
# 安装依赖
npm install

# 更新 wrangler.toml 中的配置

# 初始化数据库
npm run db:init:remote

# 部署
npm run deploy
```

然后在 Dashboard 设置 `JWT_SECRET` 环境变量。

---

## 🛠️ 本地开发

```bash
# 安装依赖
npm install

# 初始化本地数据库
npm run db:init

# 创建 .dev.vars 文件
echo "JWT_SECRET=local-dev-secret-change-me" > .dev.vars

# 启动开发服务器
npm run dev
```

打开 http://localhost:8788

> ⚠️ 本地开发需要先在 `wrangler.toml` 中配置正确的 `database_id`

---

## 📁 项目结构

```
mori-pics/
├── public/                 # 前端静态文件
│   └── index.html          # 主应用（React）
├── functions/              # CloudFlare Pages Functions (后端 API)
│   └── api/
│       ├── auth/           # 认证接口
│       │   ├── login.ts    # 登录
│       │   ├── me.ts       # 获取当前用户
│       │   └── setup.ts    # 初始化管理员
│       ├── images/         # 图片接口
│       │   ├── index.ts    # 列表 / 上传
│       │   ├── [id].ts     # 详情 / 更新 / 删除
│       │   └── import.ts   # 批量导入
│       └── stats/          # 统计接口
│           ├── overview.ts # 总览
│           ├── daily.ts    # 每日统计
│           └── popular.ts  # 热门图片
├── src/                    # 共享代码
│   ├── db/
│   │   └── schema.sql      # 数据库表结构
│   ├── utils/
│   │   ├── auth.ts         # JWT 认证工具
│   │   ├── r2.ts           # R2 存储操作
│   │   └── response.ts     # API 响应格式化
│   └── types.ts            # TypeScript 类型
├── wrangler.toml           # CloudFlare 配置
└── package.json
```

---

## 📡 API 接口

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/auth/setup` | 检查是否需要初始化 |
| POST | `/api/auth/setup` | 创建管理员账号 |
| POST | `/api/auth/login` | 登录获取 token |
| GET | `/api/auth/me` | 获取当前用户信息 |

### 图片

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/images` | 获取图片列表（支持分页、搜索） |
| POST | `/api/images` | 上传图片 |
| GET | `/api/images/:id` | 获取图片详情 |
| PATCH | `/api/images/:id` | 更新图片信息 |
| DELETE | `/api/images/:id` | 删除图片 |
| POST | `/api/images/import` | 批量导入历史数据 |

### 统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/overview` | 获取总览统计 |
| GET | `/api/stats/daily?days=30` | 获取每日统计 |
| GET | `/api/stats/popular?limit=10` | 获取热门图片 |

---

## 🔄 数据迁移

如果你之前使用旧版本（localStorage 存储），可以迁移历史数据：

1. 登录新系统
2. 打开浏览器开发者工具（F12）
3. 在控制台运行：

```javascript
// 读取旧版本数据
const oldHistory = JSON.parse(localStorage.getItem('nebula_r2_history') || '[]');
console.log(`发现 ${oldHistory.length} 条记录`);

// 导入到新系统
const result = await fetch('/api/images/import', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('mori_token')}`
  },
  body: JSON.stringify({ items: oldHistory })
}).then(r => r.json());

console.log(result);
```

---

## 💡 常见问题

### Q: 首次访问显示什么？
A: 首次访问会显示「创建管理员账号」界面，设置用户名和密码后即可使用。

### Q: 忘记密码怎么办？
A: 目前需要直接操作 D1 数据库重置。在 Dashboard 的 D1 页面执行：
```sql
DELETE FROM users WHERE username = '你的用户名';
```
然后重新访问网站创建新账号。

### Q: 上传的图片存在哪里？
A: 存储在 CloudFlare R2 存储桶中，元数据（文件名、日期等）存储在 D1 数据库。

### Q: 支持哪些图片格式？
A: 支持 JPG、PNG、GIF、WebP。非 GIF 图片可以选择自动转换为 WebP 压缩。

---

## 📜 许可证

MIT
