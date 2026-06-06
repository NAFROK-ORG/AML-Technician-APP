<div align="center">

# 🔧 AML Motors
### Technician Performance & Incentive Tracking System

**Built and Deployed by [NAFROK](https://github.com/nafrok)**

> ⚠️ **This project is not intended for commercial use. It was built as an internal operational tool exclusively for AML Motors (Ashok Leyland multi-branch service centers).**

---

![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

</div>

---

## 📖 Table of Contents

1. [The Problem](#-the-problem)
2. [What This System Solves](#-what-this-system-solves)
3. [Features by Role](#-features-by-role)
4. [Tech Stack](#-tech-stack)
5. [Project Structure](#-project-structure)
6. [Database Design](#-database-design)
7. [User Roles & Access Control](#-user-roles--access-control)
8. [Authentication & JWT](#-authentication--jwt)
9. [Incentive Engine](#-incentive-engine)
10. [Attendance System](#-attendance-system)
11. [API Reference](#-api-reference)
12. [Environment Setup](#-environment-setup)
13. [Deployment](#-deployment)
14. [Known Constraints & Future Roadmap](#-known-constraints--future-roadmap)

---

## 🚨 The Problem

**AML Motors** operates multiple Ashok Leyland vehicle service branches across different locations. Each branch employs dozens of technicians who perform jobs daily — engine repairs, electrical work, gearbox services, and more — and log these as **job card entries**.

At the end of each quarter, technicians are eligible for **performance-based incentives** calculated from their total hours worked, total labour billed, and leave days taken.

### Before this system was built:

| Area | Pain Point |
|---|---|
| **Tracking** | No centralized record of technician work across branches |
| **Incentives** | Calculations were done manually — error-prone and inconsistent |
| **Visibility** | Branch managers had zero insight into their team's performance |
| **Transparency** | Technicians could not view their own history or estimated incentive |
| **Access Control** | All admin accounts could view all branches — no branch-level isolation |
| **Attendance** | No way to verify if a technician actually showed up on a given day |
| **Data Integrity** | Technicians could log job card entries for days they never came in |

These problems were costing management time, creating payroll disputes, and making it impossible to fairly reward top performers.

---

## ✅ What This System Solves

AML Motors is a full-stack MERN application that acts as a **single source of truth** for all branch-level technician activity. It solves every pain point listed above:

- **Centralizes** all job card entries across branches into a single MongoDB Atlas database
- **Automates** quarterly incentive calculations server-side — no manual spreadsheets
- **Provides** branch-scoped dashboards so each branch head sees only their team
- **Empowers** technicians with their own dashboard, entry history, and live incentive view
- **Enforces** Role-Based Access Control (RBAC) — technicians, branch admins, and a superadmin each have a strictly defined permission boundary
- **Tracks** daily attendance via a one-time-per-day toggle that **gates** all job card activity — a technician cannot log work without first marking themselves present
- **Gives admins** a live attendance board showing every technician's status, time in, and job cards worked for any given day

---

## 🎯 Features by Role

### 👷 Technician

- Mark daily attendance via a one-time toggle — **required before any other action**
- Log daily job card entries (category, vehicle number, JC number, hours worked, labour amount, leave days)
- View full paginated entry history
- See auto-calculated quarterly incentive (computed server-side)
- Delete their own incorrect entries
- Cannot access any other technician's data or any admin page

### 🏢 Branch Admin (Branch Head)

- View branch dashboard with KPIs, category breakdown, and technician count
- See a ranked list of all technicians in their branch with aggregated stats
- Drill into any technician's complete entry history
- Edit or delete any entry within their branch
- Export any technician's data as CSV
- View analytics — hours, labour, incentives, monthly trends, top performers — **scoped to their branch only**
- View the **daily attendance board** — see all technicians with present/absent status, time marked, and entries logged that day, with date navigation
- **Strictly cannot see or affect data outside their assigned branch** — enforced at the backend

### 🌐 Super Admin (Management)

- Everything a branch admin can do — across **all branches simultaneously**
- Cross-branch analytics with branch comparison charts
- Branch selector to filter by any specific branch or view aggregate data
- Top performers ranked across all branches
- Export data for any technician in any branch
- View attendance across all branches with optional branch filter and date navigation
- Access to branch list endpoint and full system visibility

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite |
| **Routing** | React Router v6 |
| **State Management** | Zustand with localStorage persistence |
| **Forms** | React Hook Form |
| **Charts** | Recharts |
| **HTTP Client** | Axios with auto-logout interceptor on 401 |
| **Backend** | Node.js + Express |
| **Database** | MongoDB Atlas (cloud) |
| **ODM** | Mongoose |
| **Authentication** | JWT (jsonwebtoken) — 7-day expiry |
| **Password Hashing** | bcryptjs |
| **Scheduled Jobs** | node-cron |
| **Frontend Hosting** | Vercel |
| **Backend Hosting** | Render |

---

## 📁 Project Structure

```
root/
├── server/                              ← Express backend
│   ├── index.js                         ← Entry point, Express setup, CORS, cron jobs
│   ├── config/
│   │   └── db.js                        ← MongoDB Atlas connection
│   ├── models/
│   │   ├── User.js                      ← User schema (technician / admin / superadmin)
│   │   ├── Entry.js                     ← Job card entry schema
│   │   └── Attendance.js                ← Daily attendance record schema
│   ├── controllers/
│   │   ├── authController.js            ← signup, login, profileSetup, getMe
│   │   ├── adminController.js           ← All admin operations (branch-scoped)
│   │   ├── entryController.js           ← Technician entry CRUD + incentive
│   │   └── attendanceController.js      ← mark/check attendance + admin board
│   ├── middleware/
│   │   ├── authMiddleware.js            ← protect (JWT verify)
│   │   └── adminMiddleware.js           ← adminOrAbove, superAdminOnly, branchGuard
│   └── routes/
│       ├── authRoutes.js                ← /api/auth/*
│       ├── entryRoutes.js               ← /api/entries/*
│       ├── adminRoutes.js               ← /api/admin/*
│       └── attendanceRoutes.js          ← /api/attendance/*
│
└── client/                              ← React frontend
    └── src/
        ├── App.jsx                      ← Routes, GuestRoute, role-based navigation
        ├── api/
        │   └── axios.js                 ← Axios instance + 401 interceptor
        ├── store/
        │   └── authStore.js             ← Zustand auth store (token + user)
        ├── utils/
        │   └── constants.js             ← BRANCHES list, CATEGORIES list
        ├── components/
        │   ├── Navbar.jsx               ← Responsive navbar (all 3 roles)
        │   ├── ProtectedRoute.jsx       ← Route guard (single role or array)
        │   └── PoweredBy.jsx            ← Global footer badge
        └── pages/
            ├── Login.jsx
            ├── Signup.jsx
            ├── TechnicianDashboard.jsx  ← Attendance toggle + gate + entry flow
            ├── ProfileSetupModal.jsx    ← First-login modal (technicians only)
            ├── AdminBranchDashboard.jsx ← Branch overview (admin + superadmin)
            ├── AdminTechnicianList.jsx  ← Technician list per branch
            ├── AdminTechnicianDetail.jsx← Full entry history + edit/delete
            ├── AdminAnalytics.jsx       ← Analytics charts + export
            └── AdminAttendance.jsx      ← Daily attendance board
```

---

## 🗄 Database Design

Three MongoDB Atlas collections power the entire system:

### `users`

Stores all users — technicians, branch admins, and superadmins.

```js
{
  name:            String        // Display name
  email:           String        // Unique, lowercase — used as login ID
  password:        String        // bcrypt hashed (min 6 chars)
  role:            String        // "technician" | "admin" | "superadmin"
  technicianId:    String        // Set during profile setup
  technicianType:  String        // e.g. "A-Grade"
  branch:          String        // Branch name | "all" (superadmin sentinel)
  profileComplete: Boolean       // First-login flow gate
  timestamps:      true
}
```

### `entries`

One document per job card entry a technician logs.

```js
{
  userId:       ObjectId   // Reference to User
  branch:       String     // Copied from User.branch at creation — immutable
  date:         Date       // Date of the job
  category:     String     // e.g. "ENGINE REPAIR", "ELECTRICAL"
  vehicleNo:    String     // Optional
  jcNo:         String     // Job card number
  hoursWorked:  Number     // Min: 0
  labourAmount: Number     // In INR, Min: 0
  leaveDays:    Number     // Min: 0
  incentive:    Number     // Computed server-side, stored for reporting
  timestamps:   true
}
```

### `attendances`

One document per technician per calendar day they marked themselves present.

> **Design philosophy:** Only **present** records are stored. Absence is **derived** — if no record exists for a `(userId, date)` pair, that technician was absent. This keeps the collection lean and the monthly cleanup trivial.

```js
{
  userId:    ObjectId   // Reference to the technician
  branch:    String     // Copied from User.branch at mark time
  date:      Date       // UTC midnight of the calendar day
  markedAt:  Date       // Exact timestamp when toggle was pressed
  timestamps: true
}

// Indexes:
//   { userId, date }  → UNIQUE — enforces one-record-per-day at DB level
//   { branch, date }  → Non-unique — fast admin board queries
```

---

## 👥 User Roles & Access Control

The system implements a three-tier RBAC (Role-Based Access Control) architecture.

### Role Hierarchy

```
superadmin  →  Full cross-branch access
    ↓
admin       →  Branch-scoped access (their branch only)
    ↓
technician  →  Self-only access (their own entries)
```

### How Roles Are Assigned

| Role | Method |
|---|---|
| `technician` | Default on every new signup |
| `admin` | Developer manually sets in MongoDB with exact branch name |
| `superadmin` | Developer manually sets in MongoDB with `branch: "all"` sentinel |

> **Security note:** There is no UI for role promotion. This is intentional — role changes are developer-only operations.

### Branch Scoping

- **Branch admins** have their branch name in their JWT. Every admin API endpoint reads `req.user.branch` from the decoded token — the `?branch` query parameter is silently ignored for admin-role users. A branch admin can never query another branch's data, even if they manually craft a request.
- **Superadmins** carry `branch: "all"` as a sentinel. The backend never uses `"all"` as a real filter — it means "apply no branch filter."
- **`branchGuard` middleware** rejects any admin-role user whose branch is missing or still set to `"all"`. This prevents an improperly configured admin account from accidentally gaining cross-branch visibility.

---

## 🔑 Authentication & JWT

### Token Payload

```json
{
  "userId": "64abc123...",
  "role": "admin",
  "profileComplete": true,
  "branch": "BALLARI",
  "iat": 1720000000,
  "exp": 1720604800
}
```

JWTs carry `branch` directly so admin middleware never needs an extra database round-trip per request.

### Token Lifecycle

| Event | Token Action |
|---|---|
| Signup | Fresh token issued (`profileComplete: false`, `branch: ""`) |
| Login | Fresh token issued with all current DB values |
| Profile setup (technician) | Fresh token issued (`profileComplete: true`, branch set) |
| Role/branch change in MongoDB | User must re-login — old token still works but `branchGuard` rejects a stale admin token |
| 7 days elapsed | Token expires → Axios interceptor catches 401 → auto-logout + redirect to `/login` |

### Middleware Chain

```
protect       → Verifies JWT signature, attaches req.user
adminOrAbove  → Rejects role: "technician" with 403
branchGuard   → Rejects role: "admin" with empty or "all" branch with 403
superAdminOnly→ Rejects any role other than "superadmin" with 403
```

---

## 💰 Incentive Engine

Incentives are calculated entirely **server-side** in `calculateIncentive()`. The frontend never computes or sends an incentive value.

**Current period:** FY 2026-27 Q1

### Slab Structure

Both conditions (hours AND labour) must be strictly exceeded to qualify for a slab:

| Slab | Hours Threshold | Labour Threshold | Base Incentive |
|---|---|---|---|
| Slab 1 | > 100 hrs | > ₹47,500 | ₹2,000 |
| Slab 2 | > 120 hrs | > ₹57,500 | ₹3,000 |
| Slab 3 | > 150 hrs | > ₹72,500 | ₹5,000 |

### Leave Multiplier

| Leave Days | Multiplier |
|---|---|
| 0 – 2 days | 100% |
| 2 – 3 days | 70% |
| > 3 days | 0% — no incentive |

### No-Leave Bonus

If leave days = **0** AND the technician qualifies for at least Slab 1 → an additional **₹1,500** is added on top.

### Hard Cap

Maximum incentive per quarter: **₹10,000**. The response includes `isCapped: true` when the ceiling is hit.

### Calculation Example

```
totalHours  = 135  → qualifies for Slab 2 (> 120 hrs)
totalLabour = ₹62,000 → qualifies for Slab 2 (> ₹57,500)
totalLeave  = 0

Base (Slab 2)        = ₹3,000
Leave multiplier (0) = 100%  → ₹3,000
No-leave bonus       = +₹1,500
───────────────────────────────
Total                = ₹4,500  (under cap ✓)
```

---

## 📋 Attendance System

The attendance system is a standalone module that plugs into the existing architecture without touching any entry or admin routes. It follows the same middleware patterns, branch-scoping approach, and response conventions as the rest of the backend.

### How It Works — End to End

**Technician flow (daily):**

```
Dashboard loads
  → GET /api/attendance/today
  → Not marked today? → Grey gate overlay covers dashboard
  → Technician presses toggle
  → POST /api/attendance/mark
  → Gate lifts, entry form unlocks
```

**Admin flow (live board):**

```
AdminAttendance page loads
  → GET /api/attendance/admin?date=YYYY-MM-DD[&branch=NAME]
  → Returns every technician + present/absent status + entries logged that day
  → Auto-refreshes every 30 seconds (client-driven polling)
```

### Business Rules

| Rule | Detail |
|---|---|
| **One toggle per day** | Unique DB index on `{userId, date}` — enforced at the database level |
| **One-way only** | No API route exists to undo attendance. Idempotent — a second `POST /mark` returns the existing record |
| **Attendance gates entries** | Entry form, FAB, and all dashboard interactions are physically blocked by an overlay until `attStatus.marked === true` |
| **Profile must be complete** | `markAttendance` verifies `profileComplete && branch` before creating any record |
| **Daily reset is implicit** | No cron needed — each day is a new UTC midnight date bucket. No record today = toggle shows OFF |
| **Race condition safe** | Double-tap or simultaneous requests are caught by the unique index (MongoDB error 11000) and handled gracefully |
| **Branch copied at mark time** | `Attendance.branch` is read from the DB (`User.findById`), never from `req.body` |

### Monthly Cleanup Cron

Attendance records older than 1 month are automatically deleted on the 5th of every month at midnight UTC. Only the `attendances` collection is touched — entries and users are never affected.

```js
// Runs: 0 0 5 * *  (5th of every month, midnight UTC)
Attendance.deleteMany({ date: { $lt: oneMonthAgo } });
```

> ⚠️ If historical attendance data beyond 1 month is needed for payroll or compliance, records must be exported before this cron runs. See the [Future Roadmap](#-known-constraints--future-roadmap) for planned export support.

---

## 📡 API Reference

### Auth Routes — `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/signup` | None | Register a new user |
| POST | `/login` | None | Login + receive JWT |
| POST | `/profile-setup` | protect | First-login profile completion |
| GET | `/me` | protect | Get current user's profile |

### Entry Routes — `/api/entries`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/` | protect | Create a new job card entry |
| GET | `/` | protect | Get own entry history (paginated) |
| GET | `/incentive` | protect | Get current quarter incentive |
| DELETE | `/:id` | protect | Delete own entry |

### Admin Routes — `/api/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | adminOrAbove + branchGuard | Branch KPIs and stats |
| GET | `/technicians` | adminOrAbove + branchGuard | All technicians in branch |
| GET | `/technicians/:id` | adminOrAbove + branchGuard | Single technician details |
| GET | `/technicians/:id/entries` | adminOrAbove + branchGuard | Technician's full entry history |
| PUT | `/entries/:id` | adminOrAbove + branchGuard | Edit any entry in branch |
| DELETE | `/entries/:id` | adminOrAbove + branchGuard | Delete any entry in branch |
| GET | `/analytics` | adminOrAbove + branchGuard | Charts and analytics data |
| GET | `/export/:userId` | adminOrAbove + branchGuard | CSV export for a technician |
| GET | `/branches` | superAdminOnly | List all branches |

### Attendance Routes — `/api/attendance`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/today` | protect | Check today's attendance status |
| POST | `/mark` | protect | Mark present for today (one-time) |
| GET | `/admin` | adminOrAbove + branchGuard | Daily attendance board for admins |

---

## ⚙️ Environment Setup

### Backend — `server/.env`

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
JWT_SECRET=<your_long_random_secret_string>
CLIENT_URL=https://your-frontend.vercel.app
```

### Frontend — `client/.env`

```env
VITE_API_URL=https://your-backend.onrender.com
```

### Install & Run (Local Development)

```bash
# Backend
cd server
npm install
node index.js         # or: nodemon index.js

# Frontend (separate terminal)
cd client
npm install
npm run dev
```

---

## 🚀 Deployment

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set build command: `npm install`
4. Set start command: `node server/index.js`
5. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `PORT`
6. Auto-deploys on every push to the `main` branch
7. The `node-cron` jobs run within the same Node.js process — no separate worker needed

### Frontend — Vercel

1. Connect your GitHub repository to [Vercel](https://vercel.com)
2. Framework preset: **Vite**
3. Set root directory to `client` (if monorepo layout)
4. Add environment variable: `VITE_API_URL` → your Render backend URL
5. Auto-deploys on every push to the `main` branch

### MongoDB Atlas

After deploying `Attendance.js` for the first time, MongoDB Atlas will automatically create the compound indexes defined in the schema (`{userId, date}` unique + `{branch, date}`). These are registered via `schema.index()` and created on first model use — no manual Atlas configuration required.

---

## 🛣 Known Constraints & Future Roadmap

### Current Limitations

| # | Constraint | Detail |
|---|---|---|
| 1 | **Attendance reset time** | The daily toggle resets at UTC midnight = **5:30 AM IST**, not at the start of a typical shift. If an IST-aware reset (e.g. 8:00 AM IST) is needed, `utcMidnight()` must be replaced with an IST-aware function. |
| 2 | **No admin attendance override** | If a technician forgot to mark but physically came to work, there is no correction UI. A developer must manually insert a record in MongoDB. |
| 3 | **Attendance board is read-only** | Admins can view but never edit or delete attendance records. This is intentional for audit integrity. |
| 4 | **1-month retention limit** | The monthly cron deletes attendance older than 1 month. Records must be exported before then if longer history is needed. |
| 5 | **30-second polling, not WebSocket** | The attendance board refreshes every 30 seconds via client polling. Acceptable for current scale (~50 technicians). At larger scale, WebSocket or SSE would be preferred. |
| 6 | **No attendance export** | The attendance board has no CSV/export button. Only job card entries are currently exportable. |
| 7 | **Role assignment is developer-only** | No UI for promoting users. Roles must be set directly in MongoDB. Intentional for security. |
| 8 | **Branch names are hardcoded strings** | Branch names must be consistent (case-sensitive) between MongoDB user records and the `BRANCHES` constant in `constants.js`. A typo creates a silent mismatch. |
| 9 | **Incentive config is hardcoded** | Quarter thresholds live in `calculateIncentive()`. When the quarter changes, update and redeploy. |
| 10 | **No password reset flow** | A developer must manually update the password hash in MongoDB. |

### Planned Future Improvements

- IST-aware midnight for attendance reset
- Admin attendance override route (`POST /api/admin/attendance/override` — superadmin only)
- Attendance history CSV export per technician or per day
- `branches` collection to manage branch names as documents (eliminate hardcoded strings)
- Superadmin UI for assigning admin roles (removing developer-only dependency)
- Token refresh mechanism or shorter JWT expiry with refresh tokens
- Audit log for all admin edits and deletes
- Password reset via email
- Quarterly incentive period management via admin UI
- WebSocket or SSE for real-time attendance board updates

---

<div align="center">

## ⚖️ Disclaimer

**AML Motors is not a commercial product.**

This system was designed, developed, and deployed exclusively as an internal operational tool for **AML Motors (Ashok Leyland multi-branch service centers)**. It is not licensed for redistribution, resale, or adaptation for any other organization or purpose.

---

**Built and Deployed with 💻 by NAFROK**

*Powering AML Motors · 50+ Live Technicians · Multi-Branch Operations*

</div>
