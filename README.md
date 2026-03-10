# Orvane

Property management platform for Moroccan syndics (building managers). Handles residents, payments, expenses, WhatsApp reminders, and a resident self-service portal — all in one.

---

## What's Built

### User Roles
| Role | Access |
|------|--------|
| **Super Admin** | Full platform access — manage syndics, buildings, demo requests |
| **Syndic** | Manage their own buildings, residents, payments, expenses |
| **Resident** | Read-only portal — view payment history, community info |

### Pages

| Route | Description |
|-------|-------------|
| `/` | Public landing page |
| `/login` | Syndic login (JWT, remember me) |
| `/forgot-password` | Password reset flow |
| `/dashboard` | Syndic dashboard — buildings, residents, payments, expenses, reminders |
| `/admin` | Super admin panel — syndic accounts, buildings, demo requests |
| `/admin/setup` | First-run setup wizard to create the initial admin account |
| `/portal` | Resident portal login (phone + WhatsApp/SMS OTP) |
| `/portal/verify` | OTP verification |
| `/portal/home` | Resident home — payment history, community info |

### Key Features
- **Multi-building management** — syndics manage one or more buildings, each with auto-generated units
- **Payment tracking** — generate monthly charges per building, mark as paid/late/waived
- **Expense tracking** — log building expenses with categories and amounts
- **WhatsApp reminders** — send payment reminders via Twilio to unpaid residents (per-resident, per-building, or all)
- **Automated cron reminders** — CRON_SECRET-protected endpoint for scheduled bulk reminders
- **Resident portal** — passwordless login via phone OTP (WhatsApp or SMS), residents view their own payments and community members
- **Super admin panel** — create/delete syndic accounts and buildings, track demo requests
- **i18n** — French/English toggle across all pages
- **Remember me** — persistent (localStorage) vs session-only (sessionStorage) auth

---

## Project Structure

```
syndicpro/
├── app/
│   ├── page.tsx                          # Landing page
│   ├── globals.css
│   ├── login/                            # Syndic login
│   ├── forgot-password/                  # Password reset
│   ├── dashboard/                        # Syndic dashboard
│   ├── admin/                            # Super admin panel
│   │   └── setup/                        # First-run admin setup
│   ├── portal/                           # Resident portal
│   │   ├── verify/                       # OTP verification
│   │   └── home/                         # Resident home
│   └── api/
│       ├── auth/
│       │   ├── login/                    # POST — syndic login
│       │   └── register/                 # POST — syndic register
│       ├── buildings/                    # GET, POST
│       ├── residents/                    # GET, POST
│       ├── payments/
│       │   ├── route.ts                  # GET, POST
│       │   └── [id]/                     # PATCH
│       ├── expenses/
│       │   ├── route.ts                  # GET, POST
│       │   └── [id]/                     # PATCH, DELETE
│       ├── reminders/
│       │   ├── route.ts                  # POST — legacy endpoint
│       │   └── send/                     # POST — send reminders (syndic-scoped)
│       ├── cron/
│       │   └── reminders/               # POST — bulk cron (CRON_SECRET protected)
│       ├── admin/
│       │   ├── syndics/                  # GET, POST, DELETE
│       │   ├── buildings/                # GET, POST, DELETE
│       │   ├── demo-requests/            # GET, PATCH
│       │   └── bootstrap/               # POST — create first admin
│       │       └── check/               # GET — check if admin exists
│       ├── portal/
│       │   ├── auth/
│       │   │   ├── request/             # POST — send OTP
│       │   │   └── verify/              # POST — verify OTP, return token
│       │   ├── me/                      # GET — resident profile
│       │   ├── payments/                # GET — resident payment history
│       │   └── community/               # GET — building community list
│       └── demo/                        # POST — submit demo request (public)
├── lib/
│   ├── auth.ts                          # JWT sign/verify for syndics
│   ├── portal-auth.ts                   # JWT sign/verify for residents
│   ├── prisma.ts                        # Prisma singleton
│   ├── i18n.tsx                         # FR/EN translations + LangToggle component
│   ├── reminders.ts                     # WhatsApp message builder + sender
│   └── twilio.ts                        # Twilio REST client
├── prisma/
│   ├── schema.prisma                    # Full DB schema
│   └── seed.ts                          # Dev seed data
└── .env.example
```

---

## Local Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local

# Generate Prisma client
npm run db:generate

# Push schema to DB
npm run db:push

# (Optional) Seed with test data
npm run db:seed

# Start dev server
npm run dev
```

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=                        # openssl rand -base64 32

# Twilio (WhatsApp reminders)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_NUMBER=+14155238886   # Twilio sandbox number

# Cron (automated reminders)
CRON_SECRET=                       # Any random secret string

# App URL (used in API calls from client)
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app
```

---

## Deploy to Railway

### 1. Create project
- Railway → **New Project** → Deploy from GitHub repo

### 2. Add PostgreSQL
- Railway → **New** → **Database → PostgreSQL**
- `DATABASE_URL` is auto-injected

### 3. Set environment variables
Add all variables from the section above in Railway → service → **Variables**

### 4. Build command
```
npm run db:generate && npm run build
```

### 5. Start command
```
npm run db:push && npm start
```

### 6. First-run admin setup
After first deploy, visit `/admin/setup` to create the super admin account. This route is only available before any admin exists.

---

## API Reference

### Syndic Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/auth/register` | — | Register new syndic |

### Buildings
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/buildings` | Syndic JWT | List syndic's buildings |
| POST | `/api/buildings` | Syndic JWT | Create building + auto-generate units |

### Residents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/residents?buildingId=` | Syndic JWT | List residents for a building |
| POST | `/api/residents` | Syndic JWT | Add resident to a unit |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments?month=&year=&buildingId=` | Syndic JWT | List payments |
| POST | `/api/payments` | Syndic JWT | Generate monthly payments for a building |
| PATCH | `/api/payments/:id` | Syndic JWT | Update payment status |

### Expenses
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/expenses?buildingId=` | Syndic JWT | List expenses |
| POST | `/api/expenses` | Syndic JWT | Log an expense |
| PATCH | `/api/expenses/:id` | Syndic JWT | Edit expense |
| DELETE | `/api/expenses/:id` | Syndic JWT | Delete expense |

### Reminders & Cron
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/reminders/send` | Syndic JWT | Send WhatsApp reminders (filter by residentId or buildingId, or all) |
| POST | `/api/cron/reminders` | `CRON_SECRET` | Bulk reminders across all syndics — runs 5th of month 09:00 UTC |
| POST | `/api/cron/generate-charges` | `CRON_SECRET` | Generate monthly PENDING charges for all occupied units — runs 1st of month 00:00 UTC |

### Admin
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/admin/syndics` | Admin JWT | List all syndic accounts |
| POST | `/api/admin/syndics` | Admin JWT | Create syndic account |
| DELETE | `/api/admin/syndics/:id` | Admin JWT | Delete syndic + all data |
| GET | `/api/admin/buildings` | Admin JWT | List all buildings |
| POST | `/api/admin/buildings` | Admin JWT | Create building for a syndic |
| DELETE | `/api/admin/buildings/:id` | Admin JWT | Delete building |
| GET | `/api/admin/demo-requests` | Admin JWT | List demo requests |
| PATCH | `/api/admin/demo-requests` | Admin JWT | Mark as contacted |
| POST | `/api/admin/bootstrap` | — | Create first admin (one-time) |
| GET | `/api/admin/bootstrap/check` | — | Check if admin exists |

### Resident Portal
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/portal/auth/request` | — | Send OTP to phone (WhatsApp or SMS) |
| POST | `/api/portal/auth/verify` | — | Verify OTP, return resident JWT |
| GET | `/api/portal/me` | Resident JWT | Get resident profile |
| GET | `/api/portal/payments` | Resident JWT | Get own payment history |
| GET | `/api/portal/community` | Resident JWT | Get building community list |

### Public
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/demo` | — | Submit demo request from landing page |

---

## Authentication

**Syndics** authenticate via email + password → receive a 30-day JWT stored in `localStorage` (remember me) or `sessionStorage` (session only).

**Residents** authenticate via phone number → receive a 6-digit OTP via WhatsApp or SMS → receive a separate resident JWT.

All protected routes require:
```
Authorization: Bearer <token>
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Railway) |
| ORM | Prisma |
| Auth | JWT (jsonwebtoken) |
| Messaging | Twilio (WhatsApp + SMS) |
| Styling | Inline styles + route-scoped CSS |
| i18n | Custom FR/EN context |
| Deployment | Railway |
