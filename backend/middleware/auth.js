const jwt = require('jsonwebtoken');
const User = require('../models/User');
const tenantContext = require('./tenantContext');

const Organization = require('../models/Organization');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized - no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (!req.user.isActive) {
      return res.status(401).json({ success: false, message: 'Account has been deactivated by admin' });
    }

    if (req.user.organizationId) {
      const org = await Organization.findById(req.user.organizationId);
      
      // Force logout mobile users if organization security settings were updated after token issuance
      if (org && org.mobileSessionForceLogoutAt) {
        const userAgent = (req.headers['user-agent'] || '').toLowerCase();
        const isMobilePlatformHeader = req.headers['x-platform'] === 'mobile';
        const isMobile = isMobilePlatformHeader ||
          userAgent.includes('okhttp') ||
          userAgent.includes('react-native') ||
          userAgent.includes('expo') ||
          userAgent.includes('cfnetwork') ||
          userAgent.includes('darwin') ||
          (userAgent.includes('mozilla') &&
            (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) &&
            !userAgent.includes('windows') &&
            !userAgent.includes('macintosh') &&
            !userAgent.includes('linux'));

        const iatMs = decoded.iat * 1000;
        if (isMobile && iatMs < org.mobileSessionForceLogoutAt.getTime()) {
          return res.status(401).json({ 
            success: false, 
            message: 'Your session has expired due to updated organization security policies. Please log in again.' 
          });
        }
      }

      if (org && org.requiresReverification) {
        // Exclude the reverify endpoints so the admin can unlock it
        if (!req.originalUrl.includes('/organizations/reverify-otp') && !req.originalUrl.includes('/organizations/resend-reverify-otp')) {
          return res.status(403).json({ success: false, requiresReverification: true, message: 'Organization requires OTP reverification' });
        }
      }
    }

    // Wrap the rest of the request in the tenant context
    let tenantId = req.user.organizationId;

    if (req.user.role === 'super_admin') {
      const isPlatformAdmin = req.user.email === process.env.PLATFORM_ADMIN_EMAIL;
      
      if (isPlatformAdmin) {
        const headerOrgId = req.headers['x-organization-id'];
        if (headerOrgId && headerOrgId !== 'null' && headerOrgId !== 'undefined' && headerOrgId !== '') {
          tenantId = headerOrgId;
        } else {
          tenantId = null;
        }
      }
    }

    if (tenantId) {
      tenantContext.run(tenantId, () => {
        next();
      });
    } else {
      tenantContext.run(null, () => {
        next();
      });
    }
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized - invalid token' });
  }
};

module.exports = { protect };
