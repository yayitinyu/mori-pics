# mori-pics 🍊

Private image hosting powered by CloudFlare Workers + D1 + R2.

English | [简体中文](./README.zh-CN.md)

## Features

- 🔐 **Authentication** - Simple admin login with JWT
- 📤 **Image Upload** - Direct upload to CloudFlare R2
- 🖼️ **Gallery** - Browse all images with pagination and search
- 📊 **Statistics** - Upload counts, views, and daily charts
- 🗜️ **WebP Compression** - Client-side compression before upload
- 🔒 **Secure Keys** - R2 credentials stored server-side
- 📱 **Responsive** - Works on desktop and mobile

## Quick Start

### Prerequisites

1. [Node.js](https://nodejs.org/) 18+
2. CloudFlare account with:
   - R2 bucket created
   - D1 database will be created during setup

### Deploy via GitHub Integration (Recommended)

#### 1. Fork/Clone this repository

```bash
git clone https://github.com/your-username/mori-pics.git
cd mori-pics
```

#### 2. Create D1 Database

```bash
# Login to CloudFlare
npx wrangler login

# Create the database
npx wrangler d1 create mori-pics-db

# Initialize tables
npx wrangler d1 execute mori-pics-db --remote --file=./src/db/schema.sql
```

#### 3. Connect GitHub to CloudFlare Pages

1. Go to [CloudFlare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
3. Select your `mori-pics` repository
4. Build settings:
   - **Framework preset**: `None`
   - **Build command**: leave empty (or `npm install`)
   - **Build output directory**: `public`

#### 4. Configure Bindings & Environment Variables

After deployment, go to project **Settings**:

**Functions tab:**

| Binding Type | Variable name | Value |
|--------------|---------------|-------|
| D1 database | `DB` | Select `mori-pics-db` |
| R2 bucket | `R2` | Select your bucket |

**Environment variables tab:**

| Variable | Value | Encrypt |
|----------|-------|---------|
| `CUSTOM_DOMAIN` | `https://your-domain.com` | No |
| `JWT_SECRET` | Random strong password (32+ chars) | ✅ Yes |

#### 5. Trigger Redeployment

After configuring bindings, trigger a new deployment:
- Push a new commit, or
- Click **Retry deployment** in Dashboard

---

### Deploy via Wrangler CLI

```bash
npm install

# Update wrangler.toml with your config

npm run db:init:remote
npm run deploy
```

Then set `JWT_SECRET` in Dashboard environment variables.

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
├── wrangler.toml          # CloudFlare configuration
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
| POST | `/api/images` | Upload image |
| GET | `/api/images/:id` | Get image details |
| PATCH | `/api/images/:id` | Update image metadata |
| DELETE | `/api/images/:id` | Delete image |
| POST | `/api/images/import` | Import from localStorage |
| GET | `/api/stats/overview` | Get statistics overview |
| GET | `/api/stats/daily` | Get daily stats |
| GET | `/api/stats/popular` | Get popular images |

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
