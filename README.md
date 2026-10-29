# Room Rent Management System (Cambodia) 🇰🇭

A calm, modern, and high-performance room rent management web application tailored for landlords in Cambodia who manage residential buildings. Designed for non-technical users, mobile-first responsiveness, 100% bilingual support in **Khmer (ភាសាខ្មែរ)** and **English**, dynamic **Bakong KHQR** payment integration, automated daily cron jobs, and seamless Light / Dark theme support.

---

## 🌟 Key Features

- **🏠 Room & Floor Management**: Track room inventory, floor levels, monthly base rent, notes, and live occupancy status (`available`, `occupied`, `maintenance`).
- **👥 Tenant Directory**: Complete tenant registry with phone numbers, National ID / Passport, email, Telegram Chat ID, and preferred language.
- **📝 Lease Contracts & Move-Out Wizard**:
  - Automatically copies room rent to safeguard historical pricing.
  - Room status automatically transitions to `occupied` on contract creation and `available` on contract termination.
  - Move-out settlement calculates deposit minus unpaid invoices minus damage charges (`refund` or `stillOwed`).
- **⚡ Monthly Utility Meter Readings**:
  - Electricity (kWh) and Water (m³) recording.
  - Auto-fills previous reading from latest earlier month.
  - Strict database and service constraints enforce `current >= previous`.
- **🧾 Automated Invoice Generation**:
  - Computes `Total = Rent + (Electric Units × Electric Rate) + (Water Units × Water Rate) + Extra Charges + Late Fee`.
  - Skips contracts missing readings or already billed with clear reason codes.
  - Automatically sets due date to configurable `due_day` of next month.
  - Generates downloadable, printable official PDF invoices with embedded high-resolution dynamic KHQR codes.
- **🇰🇭 Bakong KHQR Payments (Level 1 & Level 2)**:
  - **Level 1 (Dynamic KHQR)**: Every invoice generates a Bakong-compliant KHQR matching the outstanding balance and invoice number.
  - **Level 2 (Auto-Reconciliation)**: Daily background worker queries Bakong's `check_transaction_by_md5` endpoint and automatically records payments (`khqr_auto`) with zero human intervention.
  - Automatically recalculates balance and status (`unpaid` → `partial` → `paid` / `overdue`).
  - Generates downloadable official PDF payment receipts.
- **💰 Expense Tracking & Net Profit**:
  - Track building operating costs across repair, cleaning, utilities, and general categories.
  - Maintenance completion with cost automatically creates building repair expenses.
  - Monthly & Annual Financial Statements with Recharts visualizations and Excel (`.xlsx`) exports.
- **📥 CSV Bulk Import**: One-click bulk onboarding for rooms and tenants with in-browser data validation and error reporting.
- **🔔 Daily Automated Reminders & Cron Scheduler**:
  - Runs daily at 08:00 AM via `node-cron`.
  - Flags past-due invoices as `overdue` and adds late fee once.
  - Dispatches `before_due` and `overdue` reminders via Telegram or email.
- **🛡️ Security, Roles & Audit Trail**:
  - Three distinct roles: **Admin**, **Staff**, and **Tenant**.
  - Inactivity auto-logout (30 minutes) and secure password hashing with `bcrypt`.
  - Comprehensive, tamper-evident audit log of every create, update, delete, and payment.
  - Authenticated file upload & streaming for contracts and identity documents (PDF/JPG/PNG up to 5MB).
  - One-click SQLite database backup download and restore.
- **📱 PWA & Mobile-First**:
  - Progressive Web App manifest (`manifest.json`) and service worker (`sw.js`) pre-caching the application shell for offline launch.
  - Responsive layout with bottom tab navigation for phones and collapsible sidebar for desktops.
  - High-contrast, clean `@media print` stylesheet for monochrome invoice and report printing.
- **⌨️ Keyboard Shortcuts & Command Palette**:
  - `Ctrl + K` or `/` : Quick Command Palette to search rooms, tenants, invoices, or execute actions.
  - `?` : Keyboard shortcuts help dialog.
  - `Ctrl + B` : Toggle sidebar.
  - `Ctrl + D` : Cycle Light / Dark theme.
  - `Ctrl + L` : Toggle Khmer / English language.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20 or newer (`node -v`)
- **npm**: v10 or newer (`npm -v`)

### 2. Installation
Clone the repository and install dependencies for both server and client:

```bash
# Clone the repository
git clone https://github.com/phanrithy/room-rent.git
cd room-rent

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Environment Variables
In `server/.env` (a template is provided in `server/.env.example`):

```ini
PORT=3001
JWT_SECRET=super_secret_jwt_key_room_rent_2026_change_in_production
DATABASE_PATH=data/rent.db
BAKONG_ACCOUNT_ID=landlord@bakong
BAKONG_TOKEN=sample_bakong_token_sandbox
BAKONG_BASE_URL=https://api-bakong.nbc.gov.kh/v1
TELEGRAM_BOT_TOKEN=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 4. Database Setup & Demo Data
Run the migrations and seed the database with demo rooms, tenants, contracts, readings, invoices, payments, and expenses:

```bash
cd server
npm run seed
```

> **To reset or re-seed fresh demo data at any time:**
> ```bash
> npm run seed:demo
> ```

---

## 🔑 Default User Accounts

| Role | Username | Default Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `Admin#2026!` | Full administrative access, settings, user management, audit logs, backup/restore |
| **Staff** | `staff` | `Staff#2026!` | Day-to-day operations: readings, invoice generation, recording payments & expenses |
| **Tenant** | `sokha` | `Tenant#2026!` | Tenant Portal: lease overview, current invoice with dynamic KHQR, maintenance requests |

---

## 💻 Running the Application

In two terminal windows:

### Terminal 1: Backend API
```bash
cd server
npm run dev
```
*API runs at `http://localhost:3001`*

### Terminal 2: Frontend Web App
```bash
cd client
npm run dev
```
*Web App runs at `http://localhost:5173`*

---

## 🧪 Automated Testing

Both the backend and frontend are backed by comprehensive automated test suites using the native Node.js test runner:

```bash
# Run server test suite (10 suites, 58 tests)
cd server
npm test

# Run client test suite (3 suites, 12 tests)
cd client
npm test

# Verify production Vite build
cd client
npm run build
```

---

## 📐 Architecture & Standards

```
room-rent/
├── server/
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── controllers/     # HTTP request handling (no business logic)
│   │   ├── db/
│   │   │   ├── connection.js# SQLite connection with PRAGMA foreign_keys = ON
│   │   │   ├── migrator.js  # Schema version tracker & migrations runner
│   │   │   ├── migrations/  # Numbered SQL migration files
│   │   │   └── seed.js      # Seeding script for admin & demo data
│   │   ├── middleware/      # Auth, rate limiting, uploads, errors
│   │   ├── repositories/    # Pure SQL queries and transactions
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business rules, calculations, audit logging
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # Bootstrapper & cron scheduler
│   └── test/                # Automated backend test suites
│
└── client/
    ├── public/
    │   ├── icon.svg         # High-resolution vector PWA icon
    │   ├── manifest.json    # Web App Manifest
    │   └── sw.js            # PWA Service Worker for shell caching
    ├── src/
    │   ├── components/      # UI component library & layout
    │   ├── context/         # Auth, Theme, Toast React contexts
    │   ├── i18n/
    │   │   ├── locales/     # en.json and km.json (100% translated)
    │   │   └── index.js     # react-i18next setup
    │   ├── pages/           # Application views
    │   ├── utils/           # Money, date, and Khmer numeral helpers
    │   ├── App.jsx          # Route registration & protection
    │   ├── index.css        # CSS variables design system & print styles
    │   └── main.jsx         # Application entry point & PWA registration
    └── test/                # Automated client test suites
```

### Architecture Guarantees
1. **Layered Separation**: `routes` → `controllers` → `services` → `repositories`. SQL strictly lives in repositories. Transactions and business rules strictly live in services.
2. **Integer Cents**: All monetary values are stored as integer **cents** in USD. Never use floats. Display formatting is strictly handled in frontend formatters.
3. **Dual Currency Display**: Live conversion from USD to Cambodian Riel (KHR) based on customizable settings (default `4,100 KHR / USD`).
4. **Standardized API Errors**: All API errors return `{ error: string, code: string, details?: any }` with stable machine codes translated on the frontend.
5. **Database Integrity**: SQLite foreign keys enabled (`PRAGMA foreign_keys = ON;`), partial unique index preventing duplicate active contracts per room, and `CHECK` constraints on meter readings.

---

## 🇰🇭 Khmer Translation Glossary

| English Term | Khmer Term | Context |
| :--- | :--- | :--- |
| **Room** | បន្ទប់ | Room inventory and pricing |
| **Tenant** | អ្នកជួល | Renter profiles and contact information |
| **Contract** | កិច្ចសន្យា | Rental lease agreement |
| **Meter Reading** | ការអានកុងទ័រ | Recording monthly utility meters |
| **Electricity** | អគ្គិសនី | Electric utility consumption in kWh |
| **Water** | ទឹក | Water utility consumption in m³ |
| **Invoice** | វិក្កយបត្រ | Monthly rental billing statement |
| **Payment** | ការទូទាត់ | Settling invoices with cash, bank, or KHQR |
| **Expense** | ការចំណាយ | Building repairs, cleaning, utilities |
| **Profit** | ប្រាក់ចំណេញ | Monthly & annual operating profit |
| **Deposit** | ប្រាក់កក់ | Security deposit held during lease |
| **Balance** | សមតុល្យ | Unpaid balance remaining on invoice |
| **Due Date** | ថ្ងៃផុតកំណត់ | Monthly payment deadline |
| **Overdue** | ហួសកាលកំណត់ | Past due date status |
| **Occupied** | មានអ្នកជួល | Room currently under active contract |
| **Available** | នៅទំនេរ | Room ready for new lease |
| **Maintenance** | ការជួសជុល | Maintenance request and repair logging |
| **Settings** | ការកំណត់ | System, property, and utility pricing configuration |
| **Audit Log** | កំណត់ហេតុសវនកម្ម | Historical audit trail of system events |

---

## 📄 License

MIT License. Designed and crafted with ❤️ for Cambodia landlords.