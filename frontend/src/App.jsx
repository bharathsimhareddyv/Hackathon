import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import AdminLogin from './pages/AdminLogin';
import TermsPage from './pages/TermsPage';
import StudentDashboard from './pages/StudentDashboard';
import TeamLogin from './pages/TeamLogin';
import TeamDashboard from './pages/TeamDashboard';
import LeaderboardPage from './pages/LeaderboardPage';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminParticipants from './pages/admin/AdminParticipants';
import AdminCredentials from './pages/admin/AdminCredentials';
import AdminRounds from './pages/admin/AdminRounds';
import AdminTeams from './pages/admin/AdminTeams';
import AdminProjects from './pages/admin/AdminProjects';
import AdminEvaluations from './pages/admin/AdminEvaluations';
import AdminSubmissions from './pages/admin/AdminSubmissions';
import AdminReports from './pages/admin/AdminReports';
import AdminTerms from './pages/admin/AdminTerms';
import AdminActivityLogs from './pages/admin/AdminActivityLogs';
import AdminSettings from './pages/admin/AdminSettings';
import AdminTeamAccounts from './pages/admin/AdminTeamAccounts';
import AdminProgressClaims from './pages/admin/AdminProgressClaims';
import AdminAccounts from './pages/admin/AdminAccounts';

// Protected Student Route
const StudentRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'STUDENT') return <Navigate to="/team-login" replace />;
  return children;
};

// Protected Admin Route
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'ADMIN') return <Navigate to="/admin-login" replace />;
  return children;
};

const TeamRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== 'TEAM') return <Navigate to="/team-login" replace />;
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/student-login" element={<Navigate to="/team-login" replace />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/team-login" element={<TeamLogin />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />

      {/* Student Protected Dashboard */}
      <Route
        path="/student/dashboard"
        element={
          <StudentRoute>
            <StudentDashboard />
          </StudentRoute>
        }
      />

      <Route path="/team/dashboard" element={<TeamRoute><TeamDashboard /></TeamRoute>} />

      {/* Admin Protected Control Panel */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="team-accounts" element={<AdminTeamAccounts />} />
        <Route path="accounts" element={<AdminAccounts />} />
        <Route path="progress-claims" element={<AdminProgressClaims />} />
        <Route path="participants" element={<AdminParticipants />} />
        <Route path="credentials" element={<AdminCredentials />} />
        <Route path="rounds" element={<AdminRounds />} />
        <Route path="teams" element={<AdminTeams />} />
        <Route path="projects" element={<AdminProjects />} />
        <Route path="evaluations" element={<AdminEvaluations />} />
        <Route path="submissions" element={<AdminSubmissions />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="terms" element={<AdminTerms />} />
        <Route path="logs" element={<AdminActivityLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
