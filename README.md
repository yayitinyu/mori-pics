# mori-pics 🍊

Private image hosting powered by CloudFlare Workers + D1 + R2.

English | [简体中文](./README.zh-CN.md)

## Features

- 🔐 **Authentication** - Simple admin login with JWT
- 📤 **Image Upload** - Direct upload to CloudFlare R2
- 🖼️ **Gallery** - Browse all images with pagination, search, and batch operations
- 👁️ **Public Gallery** - Guest mode with public image waterfall layout
- 📊 **Statistics** - Upload counts, views, and daily charts
- 🗜️ **WebP Compression** - Client-side compression before upload
- 🔒 **Visibility Control** - Public/private toggle for each image
- 📱 **Responsive** - Works on desktop and mobile

## Quick Start

### Prerequisites

1. [Node.js](https://nodejs.org/) 18+
2. CloudFlare account with:
   - R2 bucket created
   - D1 database (will be created during setup)

### Deployment (Wrangler CLI)

> ⚠️ **Note**: GitHub Pages direct deployment is NOT supported because D1 and R2 bindings must be configured in `wrangler.toml`. You need to use Wrangler CLI for deployment.

#### 1. Clone the repository

```bash
git clone https://github.com/SuiMori-Workspoace/mori-pics.git
cd mori-pics
npm install
```

#### 2. Login to CloudFlare

```bash
npx wrangler login
```

#### 3. Create R2 Bucket

```bash
npx wrangler r2 bucket create mori-pics
```

#### 4. Create D1 Database

```bash
npx wrangler d1 create mori-pics-db
```

Note the `database_id` from the output.

#### 5. Configure wrangler.toml

```bash
# Copy the example config
cp wrangler.toml.example wrangler.toml

# Edit wrangler.toml and replace:
# - YOUR_DATABASE_ID_HERE with your actual database_id
# - CUSTOM_DOMAIN with your R2 custom domain
```

#### 6. Initialize Database

```bash
npx wrangler d1 execute mori-pics-db --remote --file=./src/db/schema.sql
```

#### 7. Deploy

```bash
npm run deploy
```

#### 8. Configure JWT Secret

After deployment, go to CloudFlare Dashboard:

1. Navigate to **Workers & Pages** → Your project → **Settings**
2. Go to **Environment variables** tab
3. Add:

| Variable | Value | Encrypt |
|----------|-------|---------|
| `JWT_SECRET` | Random strong password (32+ chars) | ✅ Yes |

#### 9. Trigger Redeployment

After setting the environment variable, redeploy:

```bash
npm run deploy
```

---

## Local Development

```bash
npm install

# Initialize local database
npm run db:init

# Create .dev.vars file
echo "JWT_SECRET=local-dev-secret" > .dev.vars

# Start dev server
npm run dev
```

Open http://localhost:8788

---

## Configuration Options

The settings modal provides the following options:

| Option | Description | Default |
|--------|-------------|---------|
| WebP Compression | Convert images to WebP before upload | On |
| Compression Quality | WebP quality (10-100%) | 80% |
| Keep Original Filename | Use original filename instead of random | Off |
| Default Public | New uploads are public by default | On |
| Gallery Click Copy | Click image to copy link (off = preview) | On |

---

## Project Structure

```
mori-pics/
├── public/                 # Frontend (static files)
│   └── index.html
├── functions/              # CloudFlare Pages Functions (API)
│   └── api/
│       ├── auth/          # Authentication endpoints
│       ├── images/        # Image CRUD endpoints
│       └── stats/         # Statistics endpoints
├── src/                   # Shared utilities
│   ├── db/
│   │   └── schema.sql     # Database schema
│   ├── utils/
│   │   ├── auth.ts        # JWT & password utilities
│   │   ├── r2.ts          # R2 storage utilities
│   │   └── response.ts    # API response helpers
│   └── types.ts           # TypeScript types
├── wrangler.toml.example  # CloudFlare config template
└── package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/auth/setup` | Check if setup needed |
| POST | `/api/auth/setup` | Create admin account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/images` | List images (paginated) |
| GET | `/api/images/public` | List public images (guest) |
| POST | `/api/images` | Upload image |
| GET | `/api/images/:id` | Get image details |
| PATCH | `/api/images/:id` | Update image metadata |
| DELETE | `/api/images/:id` | Delete image |
| GET | `/api/stats/overview` | Get statistics overview |
| GET | `/api/stats/daily` | Get daily stats |

## Migrating from localStorage

If you have existing images in localStorage from the old version:

1. Login to the new version
2. Open browser console (F12)
3. Run:

```javascript
const oldHistory = JSON.parse(localStorage.getItem('nebula_r2_history') || '[]');
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

## License

MIT
