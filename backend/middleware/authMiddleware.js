const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Participant = require('../models/Participant');
const TeamAccount = require('../models/TeamAccount');
const Branch = require('../models/Branch');
const Viewer = require('../models/Viewer');

const JWT_SECRET = process.env.JWT_SECRET || 'aarohan_hackathon_super_secret_jwt_token_key_2026_tribal_students';

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);

      if (decoded.role === 'ADMIN') {
        req.user = await Admin.findById(decoded.id).select('-passwordHash');
        req.user.role = 'ADMIN';
      } else if (decoded.role === 'TEAM') {
        req.user = await TeamAccount.findById(decoded.id).select('-passwordHash');
        if (req.user && req.user.status !== 'ACTIVE') {
          return res.status(403).json({ message: 'This team account is blocked or inactive' });
        }
        req.user.role = 'TEAM';
      } else if (decoded.role === 'STUDENT') {
        req.user = await Participant.findById(decoded.id).select('-passwordHash');
        req.user.role = 'STUDENT';
      } else if (decoded.role === 'BRANCH_ADMIN') {
        req.user = await Branch.findById(decoded.id).select('-passwordHash');
        if (req.user && !req.user.loginEnabled) {
          return res.status(401).json({ message: 'This branch login has been disabled' });
        }
        if (req.user) req.user.role = 'BRANCH_ADMIN';
      } else if (decoded.role === 'VIEWER') {
        req.user = await Viewer.findById(decoded.id).select('-passwordHash');
        if (req.user && !req.user.loginEnabled) {
          return res.status(401).json({ message: 'This viewer login has been disabled' });
        }
        if (req.user) req.user.role = 'VIEWER';
      }

      if (!req.user) {
        return res.status(401).json({ message: 'User not found or unauthorized' });
      }

      return next();
    } catch (error) {
      console.error('JWT Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Admin privileges required' });
};

const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === 'STUDENT') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Student access only' });
};

const teamOnly = (req, res, next) => {
  if (req.user && req.user.role === 'TEAM') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Team access only' });
};

const branchOnly = (req, res, next) => {
  if (req.user && req.user.role === 'BRANCH_ADMIN') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Branch access only' });
};

const viewerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'VIEWER') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Viewer access only' });
};

const teamOrStudent = (req, res, next) => {
  if (req.user && (req.user.role === 'TEAM' || req.user.role === 'STUDENT')) {
    return next();
  }
  return res.status(403).json({ message: 'Access denied: Team or student access only' });
};

module.exports = { protect, adminOnly, studentOnly, teamOnly, branchOnly, viewerOnly, teamOrStudent, JWT_SECRET };
