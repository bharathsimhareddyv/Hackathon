const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { seedInitialData } = require('./utils/sampleDataSeeder');

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB().then(() => {
  seedInitialData();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads if needed
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin/participants', require('./routes/participantRoutes'));
app.use('/api/rounds', require('./routes/roundRoutes'));
app.use('/api/admin/teams', require('./routes/teamRoutes'));
app.use('/api/admin/team-accounts', require('./routes/teamAccountRoutes'));
app.use('/api/admin/accounts', require('./routes/adminAccountRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/progress-claims', require('./routes/progressClaimRoutes'));
app.use('/api/admin/evaluations', require('./routes/evaluationRoutes'));
app.use('/api/submissions', require('./routes/submissionRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/terms', require('./routes/termsRoutes'));
app.use('/api/admin/export', require('./routes/exportRoutes'));
app.use('/api/leaderboard', require('./routes/leaderboardRoutes'));
app.use('/api/admin/activity-logs', require('./routes/activityLogRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/admin/demo', require('./routes/demoRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'AAROHAN Hackathon Management Platform API', time: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  AAROHAN HACKATHON SERVER RUNNING ON PORT ${PORT}`);
  console.log(`====================================================`);
});
