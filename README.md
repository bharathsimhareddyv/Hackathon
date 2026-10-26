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
7. **Progress & Manual Evaluation**: Round-specific marks, optional challenge breakdowns, remarks, and qualification overrides.
8. **GitHub Repository Integration**: Optional repository URLs, commit SHA submissions, and ZIP uploads for any configured round.
9. **Leaderboard & Reports**: Real-time multi-round score breakdown and CSV exports for participants, evaluations, and activity logs.

---

## 🛠️ Technology Stack

### **Backend**
* **Node.js** (v24+) & **Express.js**
* **MongoDB** & **Mongoose** (Running locally on `mongodb://localhost:27017/aarohan_db`)
* **JWT (JSON Web Tokens)** for role-based authentication (`ADMIN`, `BRANCH_ADMIN`, `VIEWER`, `TEAM`, and `STUDENT`)
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
│   │   ├── Viewer.js
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
│   │   ├── viewerRoutes.js
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

Copy `backend/.env.example` to `backend/.env`, then fill in your local values:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/aarohan_db
JWT_SECRET=replace_with_a_long_random_secret
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GMAIL_CLIENT_ID=your-oauth-client-id
GMAIL_CLIENT_SECRET=your-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-oauth-refresh-token
GMAIL_SENDER_EMAIL=your-gmail-address@gmail.com
MAIL_FROM_NAME=AAROHAN Hackathon
MAIL_REPLY_TO=your-inbox@gmail.com
ADMIN_PASSWORD_OTP_EMAIL=bharathsimhareddyv19@gmail.com
```

Before uploading a project ZIP archive, set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in `backend/.env` using credentials from your Cloudinary account, then restart the backend. ZIP archives are uploaded to Cloudinary as raw files. These credentials are also required for progress evidence and the AAROHAN logo. Never put Cloudinary credentials in frontend settings or commit them to source control.

Gmail API OAuth credentials are required for bulk team invitations and email-verified admin password changes. Enable the Gmail API in Google Cloud, create an OAuth client, and generate a refresh token with the `https://www.googleapis.com/auth/gmail.send` scope. The OAuth consent screen must be configured for the sending account; refresh tokens for an External app left in Testing can expire after seven days. Set these values in the backend environment and never commit real credentials.

Start backend server:
```bash
npm start
```
*The server connects to MongoDB and ensures the default Admin, terms, and settings exist. Rounds are created by admins or branch owners; no rounds are seeded automatically.*

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

Create team credentials and send welcome messages from **Admin → Team Accounts**. For custom team IDs, enter a team name and starting number (for example, `Team Alpha` and `1` generates `team-alpha1`, `team-alpha2`, and so on); leave the name blank to keep automatic Aarohan IDs.

Organizers can create branch-specific logins from **Admin → Branch Sections**. Branch users sign in at `/branch-login` and can generate student IDs and team IDs, assign only their own students to teams, create branch-only rounds, and review submissions. Admin-created rounds and projects stay hidden until explicitly assigned in **Admin → Rounds & Timings** and **Admin → Projects**. Branch owners can download team ZIP submissions, approve submissions with optional official marks, and qualify teams; admins can subsequently edit marks and qualification in **Admin → Evaluations & Marks**. The branch portal includes its own round/all-round leaderboard; the admin/public leaderboard supports round-specific and all-round views. Branch owners can edit student names and team IDs, view temporary passwords, reset credentials, and disable logins while retaining historical results. Student dashboards show the participant name and Aarohan ID. **Admin → Branch Sections** provides a detailed report and CSV export for each branch, while admins retain global access. Disabling a branch login preserves the branch record and all its data. Co-admin accounts remain available from **Admin → Admin Accounts**.

Organizers can create named, read-only viewer accounts from **Admin → Viewer Access**. Each viewer can be assigned specific rounds, all branches or selected branches, and independent permissions for round/team progress, branch statistics, and branch averages. Viewer users sign in at `/viewer-login`; their dashboard shows assigned round status, student names and Aarohan IDs, branch attribution, submissions, evaluations, branch comparison graphs, and per-round averages only when permitted. Administrators can edit access at any time, reset passwords, or disable a viewer login without deleting its settings.

---

## 🎯 How to Conduct the Actual AAROHAN Hackathon

### Step 1: Initialize Participants & Passwords
1. Log into the **Admin Control Panel** (`/admin-login`).
2. Go to **Participants** tab.
3. Enter Start ID (`AIF260001`) and End ID (`AIF260054`).
4. Click **[GENERATE PARTICIPANTS]**. The system creates all 54 records instantly.
5. Go to **Credentials** tab and click **[GENERATE PASSWORDS]**.
6. Click **[EXPORT CREDENTIALS CSV]** to print/distribute credential slips to students.

### Step 2: Create and assign event rounds
1. Open **Rounds & Timings** and create rounds using the names, challenge types, times, qualification criteria, and branch assignments required for your event.
2. Branch owners can also create branch-specific rounds from their branch workspace.
3. Create project sources under **Projects** and assign them to the relevant round and branches.
4. Create round teams from **Team Assignments** or from the branch workspace.

### Step 3: Student Work & Project Download
1. Students log into `/student-login` using their Arohan ID and password.
2. Students accept the **Terms & Conditions**.
3. On the **Student Dashboard**, students click **[DOWNLOAD PROJECT ZIP]**.
4. Students extract the ZIP on their machines and debug code in VS Code.
5. Students upload their work/ZIP or repo link on the dashboard.

### Step 4: Evaluate and report
1. Select a configured round in **Evaluations & Marks** and enter team marks, remarks, and qualification decisions.
2. Qualified participants can be assigned to teams in any later configured round.
3. View the live **Leaderboard** and export per-round CSV reports from **Reports & Export**.

---

## 🔒 Security & System Integrity

* Password hashes are stored using **bcrypt** (salt factor 10).
* Plain passwords are never exposed in public student endpoints.
* Admin endpoints are protected by JWT middleware & strict `ADMIN` role checks.
* Server-side timestamps are enforced for all timing calculations.
* Activity logs record every manual override with actor name and timestamp.

---

© 2026 AAROHAN Program Hackathon Platform. Developed for Tribal Youth Empowerment.
