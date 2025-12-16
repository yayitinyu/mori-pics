# mori-pics 🍊

基于 CloudFlare Workers + D1 + R2 的私人图床系统。

[English](./README.md) | 简体中文

## ✨ 功能特性

- 🔐 **用户认证** - 简单的管理员登录系统，JWT 令牌验证
- 📤 **图片上传** - 直传 CloudFlare R2，支持拖拽/粘贴/点击
- 🖼️ **图片管理** - 浏览所有图片，支持分页、搜索和批量操作
- 👁️ **访客画廊** - 游客模式，瀑布流展示公开图片
- 📊 **数据统计** - 上传次数、查看次数、每日趋势图表
- 🗜️ **WebP 压缩** - 客户端自动压缩，节省存储空间
- 🔒 **可见性控制** - 每张图片可独立设置公开/私有
- 📱 **响应式设计** - 桌面和移动端完美适配

## 🚀 快速开始

### 前置要求

1. [Node.js](https://nodejs.org/) 18+
2. CloudFlare 账号

### 部署方式（Wrangler CLI）

> ⚠️ **注意**：不支持 GitHub Pages 直接部署，因为 D1 和 R2 绑定必须在 `wrangler.toml` 中配置。请使用 Wrangler CLI 部署。

#### 1. Clone 仓库

```bash
git clone https://github.com/SuiMori-Workspace/mori-pics.git
cd mori-pics
npm install
```

#### 2. 登录 CloudFlare

```bash
npx wrangler login
```

#### 3. 创建 R2 存储桶

```bash
npx wrangler r2 bucket create mori-pics
```

#### 4. 创建 D1 数据库

```bash
npx wrangler d1 create mori-pics-db
```

记下输出中的 `database_id`。

#### 5. 配置 wrangler.toml

```bash
# 复制示例配置
cp wrangler.toml.example wrangler.toml

# 编辑 wrangler.toml，替换：
# - YOUR_DATABASE_ID_HERE 为你的实际 database_id
# - CUSTOM_DOMAIN 为你的 R2 自定义域名
```

#### 6. 初始化数据库

```bash
npx wrangler d1 execute mori-pics-db --remote --file=./src/db/schema.sql
```

#### 7. 部署

```bash
npm run deploy
```

#### 8. 配置 JWT Secret

部署完成后，进入 CloudFlare Dashboard：

1. 进入 **Workers & Pages** → 你的项目 → **Settings**
2. 进入 **Environment variables** 标签页
3. 添加：

| 变量名 | 值 | 加密 |
|--------|-----|------|
| `JWT_SECRET` | 随机强密码（32位以上） | ✅ 是 |

#### 9. 重新部署

设置环境变量后，再次部署：

```bash
npm run deploy
```

---

## 🛠️ 本地开发

```bash
npm install

# 初始化本地数据库
npm run db:init

# 创建 .dev.vars 文件
echo "JWT_SECRET=local-dev-secret-change-me" > .dev.vars

# 启动开发服务器
npm run dev
```

打开 http://localhost:8788

> ⚠️ 本地开发需要先配置好 `wrangler.toml`

---

## ⚙️ 设置选项

设置面板提供以下选项：

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 转换为 WebP | 上传前自动压缩为 WebP | 开启 |
| 压缩质量 | WebP 质量 (10-100%) | 80% |
| 保留原始文件名 | 使用原始文件名而非随机生成 | 关闭 |
| 默认公开图片 | 新上传图片默认公开 | 开启 |
| 图库点击复制链接 | 点击图片复制链接（关闭则进入预览） | 开启 |

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
│       │   └── public.ts   # 公开图片列表
│       └── stats/          # 统计接口
│           ├── overview.ts # 总览
│           └── daily.ts    # 每日统计
├── src/                    # 共享代码
│   ├── db/
│   │   └── schema.sql      # 数据库表结构
│   ├── utils/
│   │   ├── auth.ts         # JWT 认证工具
│   │   ├── r2.ts           # R2 存储操作
│   │   └── response.ts     # API 响应格式化
│   └── types.ts            # TypeScript 类型
├── wrangler.toml.example   # CloudFlare 配置模板
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
| GET | `/api/images/public` | 获取公开图片列表（游客） |
| POST | `/api/images` | 上传图片 |
| GET | `/api/images/:id` | 获取图片详情 |
| PATCH | `/api/images/:id` | 更新图片信息 |
| DELETE | `/api/images/:id` | 删除图片 |

### 统计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats/overview` | 获取总览统计 |
| GET | `/api/stats/daily?days=30` | 获取每日统计 |

---

## 🔄 数据迁移

如果你之前使用旧版本（localStorage 存储），可以迁移历史数据：

1. 登录新系统
2. 打开浏览器开发者工具（F12）
3. 在控制台运行：

```javascript
const oldHistory = JSON.parse(localStorage.getItem('nebula_r2_history') || '[]');
console.log(`发现 ${oldHistory.length} 条记录`);

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

### Q: 访客能看到什么？
A: 访客只能看到设置为「公开」的图片，以瀑布流形式展示。

---

## 📜 许可证

MIT
