# SyndicPro — Backend Setup & Railway Deployment

## Project Structure

```
syndicpro/
├── app/
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts       # POST /api/auth/login
│       │   └── register/route.ts    # POST /api/auth/register
│       ├── buildings/route.ts       # GET, POST /api/buildings
│       ├── payments/
│       │   ├── route.ts             # GET, POST /api/payments
│       │   └── [id]/route.ts        # PATCH /api/payments/:id
│       ├── residents/route.ts       # GET, POST /api/residents
│       └── reminders/route.ts       # POST /api/reminders
├── lib/
│   ├── prisma.ts                    # Prisma singleton
│   └── auth.ts                      # JWT helpers
├── prisma/
│   ├── schema.prisma                # Full DB schema
│   └── seed.ts                      # Test data seed
├── .env.example                     # Copy to .env.local
└── package.json
```

---

## 1. Local Setup

```bash
# Clone / init project
git init syndicpro && cd syndicpro

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# → Edit .env.local with your values

# Generate Prisma client
npm run db:generate

# Push schema to your DB
npm run db:push

# Seed with test data
npm run db:seed

# Start dev server
npm run dev
```

---

## 2. Deploy to Railway (Step by Step)

### Step 1 — Create Railway account
Go to https://railway.app and sign up (free tier available).

### Step 2 — Create a new project
- Click **New Project**
- Select **Deploy from GitHub repo** (push your code to GitHub first)
- Or use **Empty Project** and deploy via CLI

### Step 3 — Add PostgreSQL database
- Inside your Railway project, click **New**
- Select **Database → PostgreSQL**
- Railway auto-creates `DATABASE_URL` — copy it

### Step 4 — Set environment variables
In Railway → your service → **Variables**, add:
```
DATABASE_URL        = (auto-filled from Railway PostgreSQL)
JWT_SECRET          = (run: openssl rand -base64 32)
TWILIO_ACCOUNT_SID  = (from Twilio console)
TWILIO_AUTH_TOKEN   = (from Twilio console)
TWILIO_WHATSAPP_NUMBER = +14155238886
NEXT_PUBLIC_APP_URL = https://your-app.up.railway.app
```

### Step 5 — Add build command
In Railway → Settings → Build:
```
npm run db:generate && npm run build
```

### Step 6 — Run migrations on deploy
Add to Railway → Settings → Deploy:
```
npm run db:push && npm start
```

### Step 7 — Deploy!
Push to GitHub → Railway auto-deploys. Your API is live at:
`https://your-project.up.railway.app`

---

## 3. API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new syndic |
| POST | `/api/auth/login` | Login, returns JWT token |

### Buildings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/buildings` | List all buildings |
| POST | `/api/buildings` | Create building + auto-generate units |

### Residents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/residents?buildingId=xxx` | List residents |
| POST | `/api/residents` | Add resident to unit |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments?month=3&year=2026` | List payments |
| POST | `/api/payments` | Generate monthly payments for a building |
| PATCH | `/api/payments/:id` | Mark payment as paid |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reminders` | Send WhatsApp reminders to unpaid residents |

---

## 4. Authentication

All protected routes require a Bearer token in the header:
```
Authorization: Bearer <token>
```

Token is returned on login/register and also set as an httpOnly cookie.

---

## 5. Test Credentials (after seed)
```
Email:    admin@syndicpro.ma
Password: syndic123
```

---

## 6. Next Steps
- [ ] Connect React frontend to these API routes
- [ ] Add Twilio WhatsApp sandbox for testing reminders
- [ ] Build mobile app with Expo (React Native)
- [ ] Integrate Payzone payment gateway (Phase 2)
- [ ] Add PDF lease/receipt generation
