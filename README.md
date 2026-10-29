# Room Rent Management System (Cambodia) 🇰🇭

A calm, modern, and high-performance room rent management web application tailored for landlords in Cambodia who manage residential buildings. Designed for non-technical users, mobile-first responsiveness, bilingual support in **Khmer (ភាសាខ្មែរ)** and **English**, with dynamic **Bakong KHQR** payment integration and seamless Light / Dark theme support.

---

## 🚀 Quick Start Guide

### 1. Requirements
- **Node.js**: v20 or newer (`node -v`)
- **npm**: v10 or newer (`npm -v`)

### 2. Installation
Clone the repository and install dependencies:

```bash
# In the root repository folder
cd server
npm install

cd ../client
npm install
```

### 3. Setup Environment Variables
Configure `.env` for the server (a template is provided in `server/.env.example`):

```bash
cd ../server
cp .env.example .env
```

### 4. Initialize Database & Demo Data
Run the database migrations and seed default settings, default property, admin user, and demo data:

```bash
# Inside the server directory
npm run seed
```

> **Default Admin Credentials:**
> - **Username**: `admin`
> - **Password**: `Admin#2026!` *(Change this upon first login)*

### 5. Running the Application in Development

In two terminal windows:

**Terminal 1 (Backend API on http://localhost:3001):**
```bash
cd server
npm run dev
```

**Terminal 2 (Frontend on http://localhost:5173):**
```bash
cd client
npm run dev
```

Open your browser to `http://localhost:5173`.

---

## 🧪 Testing and Quality Checks

Both backend and frontend feature automated test suites using the Node.js test runner:

```bash
# Run server test suite
cd server
npm test

# Run client test suite
cd client
npm test

# Run linters
npm run lint
```

---

## 🛠️ Architecture & Tech Stack

- **Backend**: Node.js 20+, Express, SQLite (`better-sqlite3`), `zod`, `jsonwebtoken`, `bcrypt`, `dotenv`, `node-cron`, `pdfkit`, `exceljs`, `multer`, `bakong-khqr`, `qrcode`.
- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS with design tokens as CSS variables, `react-hook-form` + `zod`, `react-i18next`, `lucide-react`, `recharts`.
- **Monetary Rules**: All financial amounts are stored as integer **cents** in USD. No float arithmetic. Automatic Khmer Riel (`KHR`) conversion based on customizable exchange rates.
- **Layers**: Strict separation: `routes` → `controllers` → `services` → `repositories`.
