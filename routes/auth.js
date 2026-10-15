const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || password.length < 6) {
      return res.status(400).json({ error: 'Username and password (min 6 chars) required' });
    }
    const existing = await User.findOne({ username: username.trim() });
    if (existing) return res.status(409).json({ error: 'Username already taken' });

    const passwordHash = await User.hashPassword(password);
    const user = await User.create({
      username: username.trim(),
      passwordHash,
      role: role === 'admin' ? 'admin' : 'analyst'
    });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    const user = await User.findOne({ username: username.trim() });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ id: user._id, username: user.username, role: user.role });
  } catch (err) {
    next(err);
  }
});

function signToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

module.exports = router;
