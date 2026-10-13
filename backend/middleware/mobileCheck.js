// const User = require('../models/User');
// const Organization = require('../models/Organization');

// const checkMobileAccess = async (req, res, next) => {
//   // Exclude the public check endpoint from getting intercepted
//   if (req.path.includes('/mobile-check')) {
//     return next();
//   }

//   const userAgent = (req.headers['user-agent'] || '').toLowerCase();
//   const isMobilePlatformHeader = req.headers['x-platform'] === 'mobile';

//   // Detect if the request originates from a React Native / Mobile client
//   const isMobileRequest = isMobilePlatformHeader || 
//                           userAgent.includes('okhttp') || 
//                           userAgent.includes('react-native') || 
//                           userAgent.includes('expo') ||
//                           userAgent.includes('cfnetwork') ||
//                           userAgent.includes('darwin') ||
//                           (userAgent.includes('mozilla') && 
//                            (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) && 
//                            !userAgent.includes('windows') && 
//                            !userAgent.includes('macintosh') && 
//                            !userAgent.includes('linux'));

//   if (isMobileRequest) {
//     let orgId = req.user ? req.user.organizationId : null;

//     // For non-authenticated requests (e.g. login), check body email
//     if (!orgId && req.body && req.body.email) {
//       try {
//         const tempUser = await User.findOne({ email: req.body.email.toLowerCase() });
//         if (tempUser) {
//           orgId = tempUser.organizationId;
//         }
//       } catch (err) {
//         console.error('Error finding user in mobile check middleware:', err);
//       }
//     }

//     // Fallback checks
//     if (!orgId) {
//       orgId = req.body.organizationId || req.query.orgId || req.headers['x-org-id'] || req.body.orgId;
//     }

//     if (orgId) {
//       try {
//         const org = await Organization.findById(orgId);
//         if (org && org.settings) {
//           if (org.settings.allowMobileApp === false) {
//             return res.status(403).json({
//               success: false,
//               mobileBlocked: true,
//               message: 'Mobile application access is disabled for your organization. Please contact your platform administrator.'
//             });
//           }
//         }
//       } catch (err) {
//         console.error('Error checking organization settings:', err);
//       }
//     }
//   }
//   next();
// };

// module.exports = checkMobileAccess;



const User = require('../models/User');
const Organization = require('../models/Organization');

const checkMobileAccess = async (req, res, next) => {
  // Exclude the public check endpoint from getting intercepted
  if (req.path.includes('/mobile-check')) {
    return next();
  }

  const userAgent = (req.headers['user-agent'] || '').toLowerCase();
  const isMobilePlatformHeader = req.headers['x-platform'] === 'mobile';

  // Detect if the request originates from a React Native / Mobile client
  const isMobileRequest = isMobilePlatformHeader ||
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

  if (isMobileRequest) {
    let orgId = req.user ? req.user.organizationId : null;

    // Try to get token from header to find organization context for authenticated requests
    if (!orgId && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          const tempUser = await User.findById(decoded.id);
          if (tempUser) {
            orgId = tempUser.organizationId;
          }
        }
      } catch (err) {
        // Token might be expired or invalid, let the next middleware handle it
      }
    }

    // For non-authenticated requests (e.g. login), check body email
    if (!orgId && req.body && req.body.email) {
      try {
        const tempUser = await User.findOne({ email: req.body.email.toLowerCase() });
        if (tempUser) {
          orgId = tempUser.organizationId;
        }
      } catch (err) {
        console.error('Error finding user in mobile check middleware:', err);
      }
    }

    // Fallback checks
    if (!orgId) {
      orgId = (req.body ? req.body.organizationId : null) || req.query.orgId || req.headers['x-org-id'] || (req.body ? req.body.orgId : null);
    }

    if (orgId) {
      try {
        const org = await Organization.findById(orgId);
        if (org && org.settings) {
          if (org.settings.allowMobileApp === false) {
            return res.status(403).json({
              success: false,
              mobileBlocked: true,
              message: 'Mobile application access is disabled for your organization. Please contact your platform administrator.'
            });
          }
        }
      } catch (err) {
        console.error('Error checking organization settings:', err);
      }
    }
  }
  next();
};

module.exports = checkMobileAccess;
