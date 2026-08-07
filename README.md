# BullionVault — Smart Gold & Commodity Investment Tracker

BullionVault is an ultra-premium, institutional-grade commodity portfolio management and tracking platform built for high-net-worth investments. It integrates real-time historic pricing datasets from Excel workbooks to compute returns, allocations, moving averages, and local price variances.

---

## Technical Stack & Architecture

### Backend Server (`/server`)
- **Runtime**: Node.js & Express
- **Database**: MongoDB (Mongoose ODM)
- **Automatic Fallback Database**: If no local MongoDB is listening on standard port `27017`, the server automatically spins up and hooks into a dynamic, in-memory MongoDB instance (`mongodb-memory-server`) to guarantee instant launch and operation.
- **Excel Import Engine**: Automatically scans the `/datasets` directory on boot, reads files (e.g. `Gold.xlsx`, `Silver.xlsx`, `Platinum.xlsx`, `CrudeOil.xlsx`), normalizes non-homogeneous worksheet header fields, maps chronological indices, performs bulk upserts, and records import actions to `SystemLog`.
- **Security**: JWT Authentication + Bcrypt password encryption.
- **Document Export**: Dynamically compiles spreadsheets (.xlsx & .csv) containing live holdings.

### Client Frontend (`/client`)
- **Scaffolder**: Vite + React
- **Styling & Design System**: Tailwind CSS v3 + Custom glassmorphism variables.
- **Fluid Dynamic Themes**: The application's accent styling seamlessly morphs depending on the selected commodity: Gold glows, Silver metallic slate, Platinum white highlights, and Crude Oil amber coppers.
- **Visual Analytics**: Interactive responsive charting using Chart.js.
- **Micro-Animations**: Framer Motion transitions.

---

## Setup & Running Guide

Ensure Node.js (v22.0.0+) and Python are installed.

### Step 1: Install Dependencies
Install server and client packages:
```bash
# In BullionVault/server
npm install

# In BullionVault/client
npm install
```

### Step 2: Running the Project
Launch both services (server listening on port 5000, client on 3000):

#### Start Backend
```bash
cd server
npm start
```
*Note: The server will attempt to connect to localhost MongoDB. If down, it will boot an in-memory Mongo server, load all four Excel files, and bulk-upsert records automatically.*

#### Start Frontend
```bash
cd client
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## Authentication & Credentials
- Access the landing page and click **Get Started** to sign up.
- **Convenience Feature**: The first user registered on the platform is automatically assigned the **Admin** role, giving immediate access to administrative controls (uploads, re-indexing, log streaming, user list). Subsequent accounts are registered as standard investors.
