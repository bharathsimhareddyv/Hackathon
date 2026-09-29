# 🚀 AAROHAN PROGRAM HACKATHON MANAGEMENT PLATFORM

> A complete, production-ready MERN stack web application built specifically to conduct technical hackathons for tribal students.

---

## 📌 Executive Overview

The **AAROHAN Platform** is **NOT** an online compiler or sandbox. Instead, tribal student participants download assigned project files/ZIPs from the platform, extract them locally onto their computers, work using industry-standard tools (VS Code, Chrome, Node.js, Git), and submit/verify their work through the AAROHAN platform.

The platform provides complete manual control to the **ADMIN / ORGANIZERS** to oversee every stage of the hackathon lifecycle:

1. **Participant Management**: Bulk generation of Arohan IDs (`AIF260001` ... `AIF260054`) without tedious single entry.
2. **Credential Management**: Bulk generation of unique temporary passwords per Arohan ID with CSV export.
3. **Terms & Conditions Engine**: Mandatory versioned terms acceptance before student dashboard access.
4. **Round Management & Server Timing**: Dynamic schedule configuration, countdown timers, and controls (Start, Pause, Close, Extend).
5. **Round-Specific Team Formation**: Independent team composition for each round (**Teams are NOT permanent**).
6. **Project & File Distribution**: Admin project ZIP uploads and student download tracking logs.
7. **Debugging Progress & Manual Evaluation**: Dedicated marksheets for error counts (HTML, CSS, JS, React), total marks (e.g. 82/100), remarks, and qualification overrides.
8. **GitHub Repository Integration**: Round 2 & 3 repo cloning workflows and commit SHA submissions.
9. **Leaderboard & Reports**: Real-time multi-round score breakdown and CSV exports for participants, evaluations, and activity logs.

---

## 🛠️ Technology Stack

### **Backend**
* **Node.js** (v24+) & **Express.js**
* **MongoDB** & **Mongoose** (Running locally on `mongodb://localhost:27017/aarohan_db`)
* **JWT (JSON Web Tokens)** for role-based authentication (`ADMIN` and `STUDENT`)
* **bcryptjs** for secure password hashing
* **Multer + Cloudinary** for hosted project ZIPs, team evidence, submissions, and program branding uploads

### **Frontend**
* **React.js** (v19) with **Vite**
* **React Router DOM** (v7)
* **Tailwind CSS v4** & **Lucide Icons**
* **Axios** with global JWT interceptors
* **Context API** for global auth state and toasts
* **Custom Dark Theme & Glassmorphic UI** (High-aesthetic visual design system)

---

## 📁 Repository Structure

```
Hackathon/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── uploadMiddleware.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Participant.js
│   │   ├── Round.js
│   │   ├── RoundTeam.js
│   │   ├── Project.js
│   │   ├── Evaluation.js
│   │   ├── Submission.js
│   │   ├── DownloadLog.js
│   │   ├── Terms.js
│   │   ├── TermsAcceptance.js
│   │   ├── Settings.js
│   │   └── ActivityLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── participantRoutes.js
│   │   ├── roundRoutes.js
│   │   ├── teamRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── evaluationRoutes.js
│   │   ├── submissionRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── termsRoutes.js
│   │   ├── exportRoutes.js
│   │   ├── leaderboardRoutes.js
│   │   ├── activityLogRoutes.js
│   │   ├── settingsRoutes.js
│   │   └── demoRoutes.js
│   ├── utils/
│   │   ├── passwordGenerator.js
│   │   └── sampleDataSeeder.js
│   ├── uploads/
│   │   ├── projects/
│   │   └── submissions/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── StatusBadge.jsx
│   │   │   └── CountdownTimer.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── StudentLogin.jsx
│   │   │   ├── AdminLogin.jsx
│   │   │   ├── TermsPage.jsx
│   │   │   ├── StudentDashboard.jsx
│   │   │   ├── LeaderboardPage.jsx
│   │   │   └── admin/
│   │   │       ├── AdminLayout.jsx
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── AdminParticipants.jsx
│   │   │       ├── AdminCredentials.jsx
│   │   │       ├── AdminRounds.jsx
│   │   │       ├── AdminTeams.jsx
│   │   │       ├── AdminProjects.jsx
│   │   │       ├── AdminEvaluations.jsx
│   │   │       ├── AdminSubmissions.jsx
│   │   │       ├── AdminReports.jsx
│   │   │       ├── AdminTerms.jsx
│   │   │       ├── AdminActivityLogs.jsx
│   │   │       └── AdminSettings.jsx
│   │   ├── utils/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start & Setup Guide

### 1. Backend Setup

```bash
cd backend
npm install
```

Create/verify `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aarohan_db
JWT_SECRET=aarohan_hackathon_super_secret_jwt_token_key_2026_tribal_students
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SMTP_SERVICE=gmail
SMTP_USER=your_sender_address
SMTP_PASS=your_email_app_password
ADMIN_PASSWORD_OTP_EMAIL=bharathsimhareddyv19@gmail.com
```

Cloudinary credentials are required for hosted project ZIPs, progress evidence, and the AAROHAN logo. SMTP credentials are required for bulk team invitations and email-verified admin password changes. Do not commit real credentials to source control.

Start backend server:
```bash
npm start
```
*The server will automatically connect to MongoDB and seed the default Admin credentials & initial rounds.*

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```
Open browser at `http://localhost:3000` (or the Vite dev URL displayed).

---

## 🔑 Default Credentials

### **Admin Portal Login**
* **Dashboard URL**: `http://localhost:3000/admin/dashboard` (redirects to sign-in if not authenticated)
* **Sign-in URL**: `http://localhost:3000/admin-login`
* **Username**: `admin`
* **Password**: `admin123`

Create team credentials and send welcome messages from **Admin → Team Accounts**. Teams sign in at `/team-login`; organizers can create additional rounds, review progress approvals, and create co-admin accounts from the admin navigation.

### **Demo Student Login**
Click **SEED DEMO MODE** inside the Admin Portal sidebar to generate 5 test Arohan IDs:
* **AIF260001** / Pass: `Ar@26K7p`
* **AIF260002** / Pass: `Tr#81Lm2`
* **AIF260003** / Pass: `Ax@92Qw8`
* **AIF260004** / Pass: `Nx$45Zp1`
* **AIF260005** / Pass: `Px!67Mw9`

---

## 🎯 How to Conduct the Actual AAROHAN Hackathon

### Step 1: Initialize Participants & Passwords
1. Log into the **Admin Control Panel** (`/admin-login`).
2. Go to **Participants** tab.
3. Enter Start ID (`AIF260001`) and End ID (`AIF260054`).
4. Click **[GENERATE PARTICIPANTS]**. The system creates all 54 records instantly.
5. Go to **Credentials** tab and click **[GENERATE PASSWORDS]**.
6. Click **[EXPORT CREDENTIALS CSV]** to print/distribute credential slips to students.

### Step 2: Configure Round 1 & Upload Projects
1. Go to **Projects** tab.
2. Select **Round 1 (Debugging Challenge)**. Upload `Round1_Debugging_Project.zip` containing HTML/CSS/JS/React subfolders.
3. Configure total error counts (200 errors: HTML 50, CSS 50, JS 50, React 50).
4. Go to **Round Teams** tab. Select participants for Round 1 (e.g. `AIF260001` + `AIF260002` → `ROUND1-T001`).
5. Go to **Rounds & Timings** tab. Set Start Time and End Time. Click **[START ROUND]**.

### Step 3: Student Work & Project Download
1. Students log into `/student-login` using their Arohan ID and password.
2. Students accept the **Terms & Conditions**.
3. On the **Student Dashboard**, students click **[DOWNLOAD PROJECT ZIP]**.
4. Students extract the ZIP on their machines and debug code in VS Code.
5. Students upload their work/ZIP or repo link on the dashboard.

### Step 4: Admin Evaluation & Qualification
1. When Round 1 ends, Admin opens **Evaluations & Marks** tab.
2. Select team (`ROUND1-T001`).
3. Enter errors solved (e.g. HTML: 35/50, CSS: 32/50, JS: 38/50, React: 32/50 → Total: 137/200).
4. Enter marks (82/100) and remarks. Select status **[QUALIFIED]** and click **[SAVE EVALUATION]**.
5. The platform automatically marks team members as qualified and unlocks Round 2!

### Step 5: Round 2 & Round 3 Re-shuffling
1. Go to **Round Teams** tab and switch to **ROUND 2 TEAMS**.
2. Select qualified Round 1 participants and form **NEW Round 2 Teams** (e.g. `AIF260001` + `AIF260005` → `ROUND2-T001`).
3. Repeat process for Round 2 (React / GitHub Challenge) and Round 3 (Final Application Challenge).
4. View the live **Leaderboard** and export final CSV reports from **Reports & Export** tab.

---

## 🔒 Security & System Integrity

* Password hashes are stored using **bcrypt** (salt factor 10).
* Plain passwords are never exposed in public student endpoints.
* Admin endpoints are protected by JWT middleware & strict `ADMIN` role checks.
* Server-side timestamps are enforced for all timing calculations.
* Activity logs record every manual override with actor name and timestamp.

---

© 2026 AAROHAN Program Hackathon Platform. Developed for Tribal Youth Empowerment.
