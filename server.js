const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const { authRequired, authOptional } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // allow CRA dev
  crossOriginEmbedderPolicy: false
}));

// CORS — restrict to frontend origin
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: (origin, cb) => {
    // allow no-origin (curl, same-origin, air-gapped tools) + configured frontend
    if (!origin || origin === allowedOrigin || origin.startsWith('http://localhost:')) {
      return cb(null, true);
    }
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

// Stricter limit on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many auth attempts' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '2mb' })); // reduced from 50mb
app.use(morgan(isProd ? 'combined' : 'dev'));

// MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/air_gapped_verifier';
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected (air-gapped mode)'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('   Start mongod and retry. Server will reject data operations.');
  });

// Public routes
app.use('/api/auth', require('./routes/auth'));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'air-gapped',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
    mongo: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

app.get('/', (req, res) => {
  res.json({ message: 'Air-Gapped AI Code Verifier API', version: '1.2.0' });
});

// Protected API routes (require valid JWT)
app.use('/api/projects', authRequired, require('./routes/projects'));
app.use('/api/findings', authRequired, require('./routes/findings'));
app.use('/api/scans', authRequired, require('./routes/scans'));
app.use('/api/transpilation', authRequired, require('./routes/transpilation'));
app.use('/api/wcet', authRequired, require('./routes/wcet'));
app.use('/api/settings', authRequired, require('./routes/settings'));
app.use('/api/reports', authRequired, require('./routes/reports'));
app.use('/api/dashboard', authRequired, require('./routes/dashboard'));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔒 Air-gapped mode · Auth enabled · CORS: ${allowedOrigin}`);
});
