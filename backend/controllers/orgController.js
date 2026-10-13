// const Organization = require('../models/Organization');
// const User = require('../models/User');
// const { sendEmail } = require('../utils/sendEmail');

// // @desc    Get all organizations (Super Admin only)
// // @route   GET /api/admin/organizations
// // @access  Private/SuperAdmin
// exports.getAllOrganizations = async (req, res, next) => {
//   try {
//     if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
//       return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
//     }
//     const orgs = await Organization.find().sort({ createdAt: -1 });

//     // Attach the owner email to each org for display
//     const orgsWithOwner = await Promise.all(orgs.map(async (org) => {
//       const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true }).select('name email phone');
//       return { ...org.toObject(), owner };
//     }));

//     res.status(200).json({ success: true, count: orgsWithOwner.length, data: orgsWithOwner });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Approve organization
// // @route   PUT /api/admin/organizations/:id/approve
// // @access  Private/SuperAdmin
// exports.approveOrganization = async (req, res, next) => {
//   try {
//     if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
//       return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
//     }
//     const org = await Organization.findById(req.params.id);
//     if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

//     org.status = 'approved';
//     org.verified = true;
//     org.declineRemark = '';
//     await org.save();

//     const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true });

//     if (owner) {
//       try {
//         await sendEmail({
//           to: owner.email,
//           subject: 'Welcome to TrackBells ERP - Workspace Approved!',
//           html: `<h2>Congratulations ${owner.name}!</h2>
//                  <p>Your workspace <b>${org.name}</b> has been approved.</p>
//                  <p>You can now log in and start using the system.</p>
//                  <!-- <a href="http://localhost:3000/login">Click here to Login</a> -->
//                  <!-- <a href="http://localhost:3009/login">Click here to Login</a> -->
//                  <a href="${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'https://trackbells.com'}/login">Click here to Login</a>`
//         });
//       } catch (e) {
//         console.error('Email failed:', e);
//       }
//     }

//     res.status(200).json({ success: true, data: org });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Decline organization
// // @route   PUT /api/admin/organizations/:id/decline
// // @access  Private/SuperAdmin
// exports.declineOrganization = async (req, res, next) => {
//   try {
//     if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
//       return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
//     }
//     const { remark } = req.body;
//     if (!remark) return res.status(400).json({ success: false, message: 'Remark is required for declining' });

//     const org = await Organization.findById(req.params.id);
//     if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

//     org.status = 'declined';
//     org.verified = false;
//     org.declineRemark = remark;
//     await org.save();

//     const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true });

//     if (owner) {
//       try {
//         await sendEmail({
//           to: owner.email,
//           subject: 'TrackBells ERP - Workspace Application Declined',
//           html: `<h2>Application Declined</h2>
//                  <p>Unfortunately, your application for workspace <b>${org.name}</b> was declined.</p>
//                  <p><b>Reason:</b> ${remark}</p>`
//         });
//       } catch (e) {
//         console.error('Email failed:', e);
//       }
//     }

//     res.status(200).json({ success: true, data: org });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Create organization directly (Main Super Admin only)
// // @route   POST /api/organizations
// // @access  Private/SuperAdmin
// exports.createOrganization = async (req, res, next) => {
//   try {
//     if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
//       return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
//     }
//     const { name, industry, address, adminName, adminEmail, adminPhone, adminPassword } = req.body;

//     // Check if email already in use
//     const existingUser = await User.findOne({ email: adminEmail });
//     if (existingUser) return res.status(400).json({ success: false, message: 'Admin email already registered' });

//     // Create Organization as verified directly
//     const organization = await Organization.create({
//       name,
//       industry,
//       address,
//       contactEmail: adminEmail,
//       contactPhone: adminPhone,
//       verified: true,
//       status: 'approved'
//     });

//     // Create Super Admin User for this org
//     await User.create({
//       name: adminName,
//       email: adminEmail,
//       password: adminPassword,
//       phone: adminPhone,
//       role: 'super_admin',
//       organizationId: organization._id,
//       isOrgOwner: true
//     });

//     res.status(201).json({ success: true, data: organization });
//   } catch (error) {
//     next(error);
//   }
// };

// const OTP = require('../models/OTP');

// // @desc    Force reverification of an organization using OTP
// // @route   POST /api/admin/organizations/:id/force-reverify
// // @access  Private/SuperAdmin (Main Platform Admin)
// exports.forceReverify = async (req, res, next) => {
//   try {
//     if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
//       return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
//     }
//     const org = await Organization.findById(req.params.id);
//     if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

//     org.requiresReverification = true;
//     await org.save();

//     const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true });

//     if (owner) {
//       // Generate OTP
//       const otp = Math.floor(100000 + Math.random() * 900000).toString();

//       // Delete existing OTPs for this email
//       await OTP.deleteMany({ email: owner.email });

//       // Create new OTP
//       await OTP.create({
//         email: owner.email,
//         otpCode: otp
//       });

//       try {
//         await sendEmail({
//           to: owner.email,
//           subject: 'Action Required: Reverification Needed',
//           html: `<h2>Reverification Required</h2>
//                  <p>Your workspace <b>${org.name}</b> requires reverification.</p>
//                  <p>Your OTP code is: <h3 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h3></p>
//                  <p>Please enter this code on the platform to restore access.</p>`
//         });
//       } catch (e) {
//         console.error('Email failed:', e);
//       }
//     }

//     res.status(200).json({ success: true, message: 'Reverification enforced and OTP sent' });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Verify the OTP to clear reverification lock
// // @route   POST /api/admin/organizations/reverify-otp
// // @access  Private (Org Admin)
// exports.reverifyOTP = async (req, res, next) => {
//   try {
//     const { otp } = req.body;
//     if (!otp) return res.status(400).json({ success: false, message: 'Please provide an OTP' });

//     // Find the owner of this organization
//     const owner = await User.findOne({ organizationId: req.user.organizationId, isOrgOwner: true });
//     if (!owner) {
//       return res.status(404).json({ success: false, message: 'Organization owner not found' });
//     }

//     // Verify OTP against the owner's email
//     const otpRecord = await OTP.findOne({ email: owner.email, otpCode: otp });
//     if (!otpRecord) {
//       return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
//     }

//     // Clear reverification flag
//     const org = await Organization.findById(req.user.organizationId);
//     if (org) {
//       org.requiresReverification = false;
//       org.lastVerifiedAt = new Date();
//       await org.save();
//     }

//     // Delete OTP
//     await OTP.deleteMany({ email: owner.email });

//     res.status(200).json({ success: true, message: 'Reverification successful' });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Resend the OTP for reverification
// // @route   POST /api/admin/organizations/resend-reverify-otp
// // @access  Private (Org Admin)
// exports.resendReverifyOTP = async (req, res, next) => {
//   try {
//     const org = await Organization.findById(req.user.organizationId);
//     if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

//     // Find the owner
//     const owner = await User.findOne({ organizationId: req.user.organizationId, isOrgOwner: true });
//     if (!owner) {
//       return res.status(404).json({ success: false, message: 'Organization owner not found' });
//     }

//     // Generate OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();

//     // Delete existing OTPs
//     await OTP.deleteMany({ email: owner.email });

//     // Create new OTP
//     await OTP.create({
//       email: owner.email,
//       otpCode: otp
//     });

//     try {
//       await sendEmail({
//         to: owner.email,
//         subject: 'Your New Reverification OTP',
//         html: `<h2>Reverification Required</h2>
//                <p>Your workspace <b>${org.name}</b> requires reverification.</p>
//                <p>Your new OTP code is: <h3 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h3></p>
//                <p>Please enter this code on the platform to restore access.</p>`
//       });
//     } catch (e) {
//       console.error('Email failed:', e);
//     }

//     res.status(200).json({ success: true, message: 'A new OTP has been sent to your email' });
//   } catch (error) {
//     next(error);
//   }
// };

// const defaultSettings = {
//   brandName: 'TrackBells ERP',
//   brandSubtitle: 'Factory Automation',
//   logo: '/logo.png',
//   themeColor: '#f58220',
//   footerText: 'Powered by Cyberbells ITES services pvt ltd',
//   menus: [
//     { key: 'gateGuard', label: 'Gate Operations', icon: 'HiOutlineTruck', path: '/gate-guard', visible: true, roles: ['super_admin', 'gate_guard'] },
//     { key: 'supervisor', label: 'Production Line', icon: 'HiOutlineCog', path: '/supervisor', visible: true, roles: ['super_admin', 'supervisor'] },
//     { key: 'qualityChecker', label: 'Quality Control', icon: 'HiOutlineClipboardCheck', path: '/quality', visible: true, roles: ['super_admin', 'quality_checker'] },
//     { key: 'qcInventoryRequests', label: 'QC Inventory Requests', icon: 'HiOutlineClipboardList', path: '/quality-requests', visible: true, roles: ['super_admin', 'quality_checker'] },
//     { key: 'storeManager', label: 'Store & Godown', icon: 'HiOutlineCube', path: '/store', visible: true, roles: ['super_admin', 'store_manager'] },
//     { key: 'sales', label: 'Sales & Orders', icon: 'HiOutlineShoppingCart', path: '/sales', visible: true, roles: ['super_admin', 'sales'] },
//     { key: 'users', label: 'User Management', icon: 'HiOutlineUsers', path: '/users', visible: true, roles: ['super_admin', 'admin'] },
//     { key: 'optionalFeature', label: 'Optional Feature', icon: 'HiOutlineLightningBolt', path: '/optional-feature', visible: true, roles: ['super_admin', 'admin'] },
//     { key: 'organizations', label: 'SaaS Tenants', icon: 'HiOutlineOfficeBuilding', path: '/admin/organizations', visible: true, roles: ['super_admin'] },
//     { key: 'settings', label: 'Settings', icon: 'HiOutlineAdjustments', path: '/settings', visible: true, roles: ['super_admin', 'admin'] },
//     { key: 'support', label: 'Help & Support', icon: 'HiOutlineDocumentReport', path: '/admin/support', visible: true, roles: ['super_admin'] }
//   ]
// };

// // @desc    Get organization settings
// // @route   GET /api/organizations/settings
// // @access  Private
// exports.getOrgSettings = async (req, res, next) => {
//   try {
//     let orgId = req.user.organizationId;

//     // For Platform Super Admin who may not have organizationId
//     if (!orgId && req.user.role === 'super_admin') {
//       orgId = req.query.orgId || req.headers['x-org-id'];
//       if (!orgId) {
//         const firstOrg = await Organization.findOne();
//         if (firstOrg) {
//           orgId = firstOrg._id;
//         }
//       }
//     }

//     if (!orgId) {
//       return res.status(200).json({ success: true, data: defaultSettings });
//     }

//     const org = await Organization.findById(orgId);
//     if (!org) {
//       return res.status(404).json({ success: false, message: 'Organization not found' });
//     }

//     let settings = org.settings || {};
//     let needsSave = false;

//     if (!settings.brandName) { settings.brandName = defaultSettings.brandName; needsSave = true; }
//     if (!settings.brandSubtitle) { settings.brandSubtitle = defaultSettings.brandSubtitle; needsSave = true; }
//     if (!settings.logo) { settings.logo = defaultSettings.logo; needsSave = true; }
//     if (!settings.themeColor) { settings.themeColor = defaultSettings.themeColor; needsSave = true; }
//     if (!settings.footerText) { settings.footerText = defaultSettings.footerText; needsSave = true; }
//     if (!settings.menus || settings.menus.length === 0) {
//       settings.menus = defaultSettings.menus;
//       needsSave = true;
//     } else {
//       // Dynamic injection for existing organizations missing any default settings menus
//       defaultSettings.menus.forEach(defaultMenu => {
//         if (!settings.menus.some(m => m.key === defaultMenu.key)) {
//           settings.menus.push(defaultMenu);
//           needsSave = true;
//         }
//       });

//       // Sanitize gateGuard roles to ensure it is not shown to unauthorized roles like quality_checker
//       const gateGuardMenu = settings.menus.find(m => m.key === 'gateGuard');
//       if (gateGuardMenu) {
//         const allowedRoles = ['super_admin', 'admin', 'gate_guard'];
//         const currentRoles = gateGuardMenu.roles || [];
//         const cleanRoles = currentRoles.filter(r => allowedRoles.includes(r));
//         if (cleanRoles.length !== currentRoles.length) {
//           gateGuardMenu.roles = cleanRoles;
//           needsSave = true;
//         }
//       }
//     }

//     if (settings.disableScreenshots === undefined) { settings.disableScreenshots = true; needsSave = true; }
//     if (settings.requireBiometric === undefined) { settings.requireBiometric = true; needsSave = true; }
//     if (settings.restrictCrossDepartment === undefined) { settings.restrictCrossDepartment = true; needsSave = true; }
//     if (settings.allowMobileApp === undefined) { settings.allowMobileApp = false; needsSave = true; }

//     if (needsSave) {
//       org.settings = settings;
//       await org.save();
//     }

//     res.status(200).json({ success: true, data: org.settings });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Update organization settings
// // @route   PUT /api/organizations/settings
// // @access  Private (Org Admin / Platform Admin)
// exports.updateOrgSettings = async (req, res, next) => {
//   try {
//     let orgId = req.user.organizationId;

//     if (!orgId && req.user.role === 'super_admin') {
//       orgId = req.body.orgId || req.query.orgId || req.headers['x-org-id'];
//     }

//     if (!orgId) {
//       return res.status(400).json({ success: false, message: 'Organization ID is required' });
//     }

//     const org = await Organization.findById(orgId);
//     if (!org) {
//       return res.status(404).json({ success: false, message: 'Organization not found' });
//     }

//     const { brandName, brandSubtitle, logo, themeColor, footerText, menus, disableScreenshots, requireBiometric, restrictCrossDepartment, allowMobileApp } = req.body;

//     org.settings = {
//       brandName: brandName || (org.settings && org.settings.brandName) || defaultSettings.brandName,
//       brandSubtitle: brandSubtitle || (org.settings && org.settings.brandSubtitle) || defaultSettings.brandSubtitle,
//       logo: logo || (org.settings && org.settings.logo) || defaultSettings.logo,
//       themeColor: themeColor || (org.settings && org.settings.themeColor) || defaultSettings.themeColor,
//       footerText: footerText || (org.settings && org.settings.footerText) || defaultSettings.footerText,
//       menus: menus || (org.settings && org.settings.menus) || defaultSettings.menus,
//       disableScreenshots: disableScreenshots !== undefined ? disableScreenshots : (org.settings && org.settings.disableScreenshots !== undefined ? org.settings.disableScreenshots : true),
//       requireBiometric: requireBiometric !== undefined ? requireBiometric : (org.settings && org.settings.requireBiometric !== undefined ? org.settings.requireBiometric : true),
//       restrictCrossDepartment: restrictCrossDepartment !== undefined ? restrictCrossDepartment : (org.settings && org.settings.restrictCrossDepartment !== undefined ? org.settings.restrictCrossDepartment : true),
//       allowMobileApp: allowMobileApp !== undefined ? allowMobileApp : (org.settings && org.settings.allowMobileApp !== undefined ? org.settings.allowMobileApp : false)
//     };

//     await org.save();

//     res.status(200).json({ success: true, data: org.settings });
//   } catch (error) {
//     next(error);
//   }
// };

// // @desc    Check if mobile application access is allowed for an organization
// // @route   GET /api/organizations/mobile-check
// // @access  Public
// exports.checkMobileAccessStatus = async (req, res, next) => {
//   try {
//     const { orgId, email } = req.query;
//     let targetOrgId = orgId;

//     if (!targetOrgId && email) {
//       const User = require('../models/User');
//       const user = await User.findOne({ email: email.toLowerCase() });
//       if (user) {
//         targetOrgId = user.organizationId;
//       }
//     }

//     if (!targetOrgId) {
//       return res.status(400).json({ success: false, message: 'Organization ID or User Email is required' });
//     }

//     const org = await Organization.findById(targetOrgId);
//     if (!org) {
//       return res.status(404).json({ success: false, message: 'Organization not found' });
//     }

//     const settings = org.settings || {};
//     const allowMobileApp = settings.allowMobileApp !== undefined ? settings.allowMobileApp : false;

//     res.status(200).json({
//       success: true,
//       allowMobileApp,
//       message: allowMobileApp 
//         ? 'Mobile access is allowed' 
//         : 'Mobile access is disabled for this organization'
//     });
//   } catch (error) {
//     next(error);
//   }
// };




const Organization = require('../models/Organization');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');

// @desc    Get all organizations (Super Admin only)
// @route   GET /api/admin/organizations
// @access  Private/SuperAdmin
exports.getAllOrganizations = async (req, res, next) => {
  try {
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }
    
    // Fetch all organizations EXCEPT the one belonging to the platform admin
    const orgs = await Organization.find({ _id: { $ne: req.user.organizationId } }).sort({ createdAt: -1 });

    // Attach the owner email to each org for display
    const orgsWithOwner = await Promise.all(orgs.map(async (org) => {
      const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true }).select('name email phone');
      return { ...org.toObject(), owner };
    }));

    res.status(200).json({ success: true, count: orgsWithOwner.length, data: orgsWithOwner });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve organization
// @route   PUT /api/admin/organizations/:id/approve
// @access  Private/SuperAdmin
exports.approveOrganization = async (req, res, next) => {
  try {
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Ensure enabledModules is populated (for older pending orgs)
    if (!org.enabledModules || org.enabledModules.length === 0) {
      const ALL_MODULES = ['gate', 'production', 'quality', 'store', 'sales', 'hr', 'dispatch', 'finance', 'reports'];
      const INDUSTRY_MODULES = {
        drag_chain:                 ALL_MODULES,
        automotive:                 ALL_MODULES,
        steel_fabrication:          ALL_MODULES,
        electrical:                 ['gate', 'store', 'quality', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
        energy_power:               ALL_MODULES,
        food_beverage:              ALL_MODULES,
        pharmaceutical:             ALL_MODULES,
        chemicals_petrochemicals:   ALL_MODULES,
        logistics:                  ['gate', 'dispatch', 'sales', 'hr', 'finance', 'reports'],
        retail:                     ['store', 'sales', 'hr', 'dispatch', 'finance', 'reports'],
      };
      
      const rawSubIndustry = org.subIndustry || 'Drag Chain';
      const subIndustryId = org.subIndustryId || rawSubIndustry.toLowerCase().replace(/[&]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').trim();
      org.enabledModules = INDUSTRY_MODULES[subIndustryId] || ALL_MODULES;
      org.subIndustryId = subIndustryId;
    }

    org.status = 'approved';
    org.verified = true;
    org.declineRemark = '';
    await org.save();

    const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true });

    if (owner) {
      try {
        await sendEmail({
          to: owner.email,
          subject: 'Welcome to TrackBells ERP - Workspace Approved!',
          html: `<h2>Congratulations ${owner.name}!</h2>
                 <p>Your workspace <b>${org.name}</b> has been approved.</p>
                 <p>You can now log in and start using the system.</p>
                 <!-- <a href="http://localhost:3000/login">Click here to Login</a> -->
                 <!-- <a href="http://localhost:3009/login">Click here to Login</a> -->
                 <a href="${process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'https://trackbells.com'}/login">Click here to Login</a>`
        });
      } catch (e) {
        console.error('Email failed:', e);
      }
    }

    res.status(200).json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

// @desc    Decline organization
// @route   PUT /api/admin/organizations/:id/decline
// @access  Private/SuperAdmin
exports.declineOrganization = async (req, res, next) => {
  try {
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }
    const { remark } = req.body;
    if (!remark) return res.status(400).json({ success: false, message: 'Remark is required for declining' });

    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    org.status = 'declined';
    org.verified = false;
    org.declineRemark = remark;
    await org.save();

    const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true });

    if (owner) {
      try {
        await sendEmail({
          to: owner.email,
          subject: 'TrackBells ERP - Workspace Application Declined',
          html: `<h2>Application Declined</h2>
                 <p>Unfortunately, your application for workspace <b>${org.name}</b> was declined.</p>
                 <p><b>Reason:</b> ${remark}</p>`
        });
      } catch (e) {
        console.error('Email failed:', e);
      }
    }

    res.status(200).json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

// @desc    Create organization directly (Main Super Admin only)
// @route   POST /api/organizations
// @access  Private/SuperAdmin
exports.createOrganization = async (req, res, next) => {
  try {
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }
    const { name, industry, address, adminName, adminEmail, adminPhone, adminPassword } = req.body;

    // Check if email already in use
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) return res.status(400).json({ success: false, message: 'Admin email already registered' });

    // Create Organization as verified directly
    const organization = await Organization.create({
      name,
      industry,
      address,
      contactEmail: adminEmail,
      contactPhone: adminPhone,
      verified: true,
      status: 'approved'
    });

    // Create Super Admin User for this org
    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword,
      phone: adminPhone,
      role: 'super_admin',
      organizationId: organization._id,
      isOrgOwner: true
    });

    res.status(201).json({ success: true, data: organization });
  } catch (error) {
    next(error);
  }
};

const OTP = require('../models/OTP');

// @desc    Force reverification of an organization using OTP
// @route   POST /api/admin/organizations/:id/force-reverify
// @access  Private/SuperAdmin (Main Platform Admin)
exports.forceReverify = async (req, res, next) => {
  try {
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    org.requiresReverification = true;
    await org.save();

    const owner = await User.findOne({ organizationId: org._id, isOrgOwner: true });

    if (owner) {
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      // Delete existing OTPs for this email
      await OTP.deleteMany({ email: owner.email });

      // Create new OTP
      await OTP.create({
        email: owner.email,
        otpCode: otp
      });

      try {
        await sendEmail({
          to: owner.email,
          subject: 'Action Required: Reverification Needed',
          html: `<h2>Reverification Required</h2>
                 <p>Your workspace <b>${org.name}</b> requires reverification.</p>
                 <p>Your OTP code is: <h3 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h3></p>
                 <p>Please enter this code on the platform to restore access.</p>`
        });
      } catch (e) {
        console.error('Email failed:', e);
      }
    }

    res.status(200).json({ success: true, message: 'Reverification enforced and OTP sent' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify the OTP to clear reverification lock
// @route   POST /api/admin/organizations/reverify-otp
// @access  Private (Org Admin)
exports.reverifyOTP = async (req, res, next) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: 'Please provide an OTP' });

    // Find the owner of this organization
    const owner = await User.findOne({ organizationId: req.user.organizationId, isOrgOwner: true });
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Organization owner not found' });
    }

    // Verify OTP against the owner's email
    const otpRecord = await OTP.findOne({ email: owner.email, otpCode: otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Clear reverification flag
    const org = await Organization.findById(req.user.organizationId);
    if (org) {
      org.requiresReverification = false;
      org.lastVerifiedAt = new Date();
      await org.save();
    }

    // Delete OTP
    await OTP.deleteMany({ email: owner.email });

    res.status(200).json({ success: true, message: 'Reverification successful' });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend the OTP for reverification
// @route   POST /api/admin/organizations/resend-reverify-otp
// @access  Private (Org Admin)
exports.resendReverifyOTP = async (req, res, next) => {
  try {
    const org = await Organization.findById(req.user.organizationId);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Find the owner
    const owner = await User.findOne({ organizationId: req.user.organizationId, isOrgOwner: true });
    if (!owner) {
      return res.status(404).json({ success: false, message: 'Organization owner not found' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete existing OTPs
    await OTP.deleteMany({ email: owner.email });

    // Create new OTP
    await OTP.create({
      email: owner.email,
      otpCode: otp
    });

    try {
      await sendEmail({
        to: owner.email,
        subject: 'Your New Reverification OTP',
        html: `<h2>Reverification Required</h2>
               <p>Your workspace <b>${org.name}</b> requires reverification.</p>
               <p>Your new OTP code is: <h3 style="color: #4F46E5; letter-spacing: 2px;">${otp}</h3></p>
               <p>Please enter this code on the platform to restore access.</p>`
      });
    } catch (e) {
      console.error('Email failed:', e);
    }

    res.status(200).json({ success: true, message: 'A new OTP has been sent to your email' });
  } catch (error) {
    next(error);
  }
};

const defaultSettings = {
  brandName: 'TrackBells ERP',
  brandSubtitle: 'Factory Automation',
  logo: '/logo.png',
  themeColor: '#f58220',
  footerText: 'Powered by Cyberbells ITES services pvt ltd',
  menus: [
    { key: 'gateGuard', label: 'Gate Operations', icon: 'HiOutlineTruck', path: '/gate-guard', visible: true, roles: ['super_admin', 'gate_guard'] },
    { key: 'supervisor', label: 'Production Line', icon: 'HiOutlineCog', path: '/supervisor', visible: true, roles: ['super_admin', 'supervisor', 'production_manager'] },
    { key: 'qualityChecker', label: 'Quality Control', icon: 'HiOutlineClipboardCheck', path: '/quality', visible: true, roles: ['super_admin', 'quality_checker'] },
    { key: 'qcInventoryRequests', label: 'QC Inventory Requests', icon: 'HiOutlineClipboardList', path: '/quality-requests', visible: true, roles: ['super_admin', 'quality_checker'] },
    { key: 'storeManager', label: 'Store & Godown', icon: 'HiOutlineCube', path: '/store', visible: true, roles: ['super_admin', 'store_manager'] },
    { key: 'sales', label: 'Sales & Orders', icon: 'HiOutlineShoppingCart', path: '/sales', visible: true, roles: ['super_admin', 'sales'] },
    { key: 'users', label: 'User Management', icon: 'HiOutlineUsers', path: '/users', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'optionalFeature', label: 'Optional Feature', icon: 'HiOutlineLightningBolt', path: '/optional-feature', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'organizations', label: 'SaaS Tenants', icon: 'HiOutlineOfficeBuilding', path: '/admin/organizations', visible: true, roles: ['super_admin'] },
    { key: 'settings', label: 'Settings', icon: 'HiOutlineAdjustments', path: '/settings', visible: true, roles: ['super_admin', 'admin'] },
    { key: 'support', label: 'Help & Support', icon: 'HiOutlineDocumentReport', path: '/admin/support', visible: true, roles: ['super_admin'] }
  ]
};

// @desc    Get organization settings
// @route   GET /api/organizations/settings
// @access  Private
exports.getOrgSettings = async (req, res, next) => {
  try {
    let orgId = req.user.organizationId;

    // For Platform Super Admin who may not have organizationId
    if (!orgId && req.user.role === 'super_admin') {
      orgId = req.query.orgId || req.headers['x-org-id'];
      if (!orgId) {
        const firstOrg = await Organization.findOne();
        if (firstOrg) {
          orgId = firstOrg._id;
        }
      }
    }

    if (!orgId) {
      return res.status(200).json({ success: true, data: defaultSettings });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    let settings = org.settings || {};
    let needsSave = false;

    // Use actual org name as default brandName instead of hardcoded platform name
    if (!settings.brandName) { settings.brandName = org.name || defaultSettings.brandName; needsSave = true; }
    if (!settings.brandSubtitle) { settings.brandSubtitle = org.industry || defaultSettings.brandSubtitle; needsSave = true; }
    if (!settings.logo) { settings.logo = defaultSettings.logo; needsSave = true; }
    if (!settings.themeColor) { settings.themeColor = defaultSettings.themeColor; needsSave = true; }
    if (!settings.footerText) { settings.footerText = defaultSettings.footerText; needsSave = true; }
    if (!settings.menus || settings.menus.length === 0) {
      settings.menus = defaultSettings.menus;
      needsSave = true;
    } else {
      // Dynamic injection for existing organizations missing any default settings menus
      defaultSettings.menus.forEach(defaultMenu => {
        if (!settings.menus.some(m => m.key === defaultMenu.key)) {
          settings.menus.push(defaultMenu);
          needsSave = true;
        }
      });

      // Sanitize gateGuard roles to ensure it is not shown to unauthorized roles like quality_checker
      const gateGuardMenu = settings.menus.find(m => m.key === 'gateGuard');
      if (gateGuardMenu) {
        const allowedRoles = ['super_admin', 'admin', 'gate_guard'];
        const currentRoles = gateGuardMenu.roles || [];
        const cleanRoles = currentRoles.filter(r => allowedRoles.includes(r));
        if (cleanRoles.length !== currentRoles.length) {
          gateGuardMenu.roles = cleanRoles;
          needsSave = true;
        }
      }
    }

    if (settings.disableScreenshots === undefined) { settings.disableScreenshots = true; needsSave = true; }
    if (settings.requireBiometric === undefined) { settings.requireBiometric = true; needsSave = true; }
    if (settings.restrictCrossDepartment === undefined) { settings.restrictCrossDepartment = true; needsSave = true; }
    if (settings.allowMobileApp === undefined) { settings.allowMobileApp = true; needsSave = true; }

    if (needsSave) {
      org.settings = settings;
      await org.save();
    }

    const responseData = {
      ...(org.settings || {}),
      country: org.country || 'India',
      currency: org.currency || 'INR',
      currencySymbol: org.currencySymbol || '₹',
      taxName: org.taxName || 'GST',
      taxRate: org.taxRate !== undefined ? org.taxRate : 18
    };

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

// @desc    Update organization settings
// @route   PUT /api/organizations/settings
// @access  Private (Org Admin / Platform Admin)
exports.updateOrgSettings = async (req, res, next) => {
  try {
    let orgId = req.user.organizationId;

    if (!orgId && req.user.role === 'super_admin') {
      orgId = req.body.orgId || req.query.orgId || req.headers['x-org-id'];
    }

    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization ID is required' });
    }

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const { country, brandName, brandSubtitle, logo, themeColor, footerText, menus, disableScreenshots, requireBiometric, restrictCrossDepartment, allowMobileApp, warehouses, almirahs, racks } = req.body;

    if (country) {
      const { getCountryDetails } = require('../config/countryConfig');
      const specs = getCountryDetails(country);
      org.country = specs.country;
      org.currency = specs.currency;
      org.currencySymbol = specs.symbol;
      org.taxName = specs.taxName;
      org.taxRate = specs.taxRate;
    }

    org.settings = {
      brandName: brandName || (org.settings && org.settings.brandName) || defaultSettings.brandName,
      brandSubtitle: brandSubtitle || (org.settings && org.settings.brandSubtitle) || defaultSettings.brandSubtitle,
      logo: logo || (org.settings && org.settings.logo) || defaultSettings.logo,
      themeColor: themeColor || (org.settings && org.settings.themeColor) || defaultSettings.themeColor,
      footerText: footerText || (org.settings && org.settings.footerText) || defaultSettings.footerText,
      menus: menus || (org.settings && org.settings.menus) || defaultSettings.menus,
      disableScreenshots: disableScreenshots !== undefined ? disableScreenshots : (org.settings && org.settings.disableScreenshots !== undefined ? org.settings.disableScreenshots : true),
      requireBiometric: requireBiometric !== undefined ? requireBiometric : (org.settings && org.settings.requireBiometric !== undefined ? org.settings.requireBiometric : true),
      restrictCrossDepartment: restrictCrossDepartment !== undefined ? restrictCrossDepartment : (org.settings && org.settings.restrictCrossDepartment !== undefined ? org.settings.restrictCrossDepartment : true),
      allowMobileApp: allowMobileApp !== undefined ? allowMobileApp : (org.settings && org.settings.allowMobileApp !== undefined ? org.settings.allowMobileApp : true),
      warehouses: warehouses || (org.settings && org.settings.warehouses) || [],
      almirahs: almirahs || (org.settings && org.settings.almirahs) || [],
      racks: racks || (org.settings && org.settings.racks) || []
    };

    if (brandName) {
      org.name = brandName;
    }

    org.mobileSessionForceLogoutAt = Date.now();

    await org.save();

    // Broadcast Real-time Country/Settings Update via Socket.IO
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`org_${org._id}`).emit('org_country_updated', {
          country: org.country,
          currency: org.currency,
          currencySymbol: org.currencySymbol,
          taxName: org.taxName,
          taxRate: org.taxRate
        });
      }
    } catch (e) {
      console.error('Failed to emit org_country_updated event:', e);
    }

    const responseData = {
      ...(org.settings || {}),
      country: org.country,
      currency: org.currency,
      currencySymbol: org.currencySymbol,
      taxName: org.taxName,
      taxRate: org.taxRate
    };

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if mobile application access is allowed for an organization
// @route   GET /api/organizations/mobile-check
// @access  Public
exports.checkMobileAccessStatus = async (req, res, next) => {
  try {
    const { orgId, email } = req.query;
    let targetOrgId = orgId;

    if (!targetOrgId && email) {
      const User = require('../models/User');
      const user = await User.findOne({ email: email.toLowerCase() });
      if (user) {
        targetOrgId = user.organizationId;
      }
    }

    if (!targetOrgId) {
      return res.status(400).json({ success: false, message: 'Organization ID or User Email is required' });
    }

    const org = await Organization.findById(targetOrgId);
    if (!org) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    const settings = org.settings || {};
    const allowMobileApp = settings.allowMobileApp !== undefined ? settings.allowMobileApp : true;

    res.status(200).json({
      success: true,
      allowMobileApp,
      message: allowMobileApp
        ? 'Mobile access is allowed'
        : 'Mobile access is disabled for this organization'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete organization permanently
// @route   DELETE /api/organizations/:id
// @access  Private/SuperAdmin
exports.deleteOrganization = async (req, res, next) => {
  try {
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }
    const org = await Organization.findById(req.params.id);
    if (!org) return res.status(404).json({ success: false, message: 'Organization not found' });

    // Prevent deletion of the platform admin organization
    if (org._id.toString() === req.user.organizationId.toString() || org.contactEmail === process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(400).json({ success: false, message: 'Cannot delete the main platform administration organization.' });
    }

    // Delete all users belonging to this organization
    const User = require('../models/User');
    await User.deleteMany({ organizationId: org._id });

    // Delete the organization
    await Organization.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Organization and associated users deleted permanently' });
  } catch (error) {
    next(error);
  }
};
