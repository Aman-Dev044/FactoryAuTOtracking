const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

// Security middleware
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Express 5 Compatible Security Sanitizer (NoSQL & XSS In-Place)
const cleanValue = (val) => {
  if (typeof val === 'string') {
    return val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  return val;
};

const sanitizeObject = (target) => {
  if (!target || typeof target !== 'object') return;
  for (const key in target) {
    if (Object.prototype.hasOwnProperty.call(target, key)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete target[key];
      } else if (typeof target[key] === 'string') {
        target[key] = cleanValue(target[key]);
      } else if (typeof target[key] === 'object' && target[key] !== null) {
        sanitizeObject(target[key]);
      }
    }
  }
};

const requestSanitizer = () => (req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  if (req.query) sanitizeObject(req.query);
  next();
};

// Load env variables
dotenv.config();

// Connect to MongoDB
connectDB().then(() => {
  const Organization = require('./models/Organization');
  Organization.find().then(orgs => {
    orgs.forEach(org => {
      let needsSave = false;
      if (!org.settings) {
        org.settings = {
          brandName: 'TrackBells ERP',
          brandSubtitle: 'Factory Automation',
          logo: '/logo.png',
          themeColor: '#f58220',
          footerText: 'Powered by TrackBells',
          allowMobileApp: true
        };
        needsSave = true;
      } else {
        if (org.settings.footerText && org.settings.footerText.includes('Cyberbells')) {
          org.settings.footerText = org.settings.footerText.replace(/Cyberbells ITES services pvt ltd/gi, 'TrackBells').replace(/Cyberbells/gi, 'TrackBells');
          needsSave = true;
        }
        if (org.settings.allowMobileApp === undefined) {
          org.settings.allowMobileApp = true;
          needsSave = true;
        }
        // The brand is orange. An earlier pass moved tenants onto an indigo
        // default; move any of those back. Tenants already on an orange (or on
        // a colour they chose themselves) are left alone.
        if (org.settings.themeColor && /^#4f46e5$/i.test(org.settings.themeColor.trim())) {
          org.settings.themeColor = '#f58220';
          needsSave = true;
        }
      }
      if (needsSave) {
        org.markModified('settings');
        org.save().then(() => {
          console.log(`Updated organization settings in DB: ${org.name}`);
        }).catch(err => {
          console.error(`Error saving org settings for ${org.name}:`, err);
        });
      }
    });
  }).catch(err => {
    console.error('Error migrating organization settings:', err);
  });
});

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',')
  : [
    "http://localhost:5455",
    "http://49.13.70.253:5455"
  ];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket client connected:', socket.id);

  socket.on('join_room', (session) => {
    socket.join(session);
    console.log(`Socket ${socket.id} joined room ${session}`);
  });

  socket.on('join_org', (orgId) => {
    socket.join(`org_${orgId}`);
    console.log(`Socket ${socket.id} joined organization room org_${orgId}`);
  });

  socket.on('join_role_room', ({ orgId, role }) => {
    if (orgId && role) {
      socket.join(`org_${orgId}_${role}`);
      console.log(`Socket ${socket.id} joined role room org_${orgId}_${role}`);
    }
  });

  socket.on('join_superadmin', () => {
    socket.join('superadmin');
    console.log(`Socket ${socket.id} joined superadmin room`);
  });

  socket.on('scan_event', (data) => {
    // data: { session, payload }
    console.log(`Scan event in session ${data.session}:`, data.payload);
    // Emit to desktop
    socket.to(data.session).emit('scan_received', data.payload);
  });

  socket.on('disconnect', () => {
    console.log('Socket client disconnected:', socket.id);
  });
});

// Middleware
const path = require('path');

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Security Headers
app.use(helmet());

// Security Sanitizer (NoSQL & XSS Protection - Express 5 Compatible)
app.use(requestSanitizer());

// Global Rate Limiting (Relaxed for slow networks & frequent polling: 10,000 requests per 15 mins per IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10000 : 25000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => {
    // Skip local loopback & intranet IPs
    const ip = req.ip || req.connection.remoteAddress || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip.includes('127.0.0.1') || ip === '::ffff:127.0.0.1') return true;
    // Skip GET requests for static assets or polling to prevent slow internet retry blocking
    return req.method === 'OPTIONS';
  }
}));

// Auth Rate Limiting for Auth Routes (200 attempts per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 100 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again after 15 minutes.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/onboard/send-otp', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
app.use(morgan('dev'));

// Mobile Access Policy Middleware
app.use(require('./middleware/mobileCheck'));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/gate-entry', require('./routes/gateEntryRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/production', require('./routes/productionRoutes'));
app.use('/api/store', require('./routes/storeRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/hr', require('./routes/hrRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/organizations', require('./routes/orgRoutes'));
app.use('/api/operations', require('./routes/operationsRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/dispatch', require('./routes/dispatchRoutes'));
app.use('/api/sales-pipeline', require('./routes/salesPipelineRoutes'));
app.use('/api/domain', require('./routes/domainRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'trackbells-erp-backend', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  res.status(statusCode).json({ success: false, message });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
