const User = require('../models/User');
const Organization = require('../models/Organization');
const OTP = require('../models/OTP');
const crypto = require('crypto');
const { createNotification } = require('./notificationController');
const { sendEmail, emailTemplates } = require('../utils/sendEmail');

// Helper: Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const userData = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    department: user.department,
    phone: user.phone,
    isActive: user.isActive,
    organizationId: user.organizationId,
    profileImage: user.profileImage
  };

  res.status(statusCode).json({
    success: true,
    token,
    user: userData
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Create user (force role to 'user' — admins can change role later via admin panel)
    const user = await User.create({ name, email, password, phone, role: 'user' });

    await createNotification(
      'New User Added',
      `${name} has been added to the system as ${role ? role.toUpperCase() : 'USER'}.`,
      'user_added'
    );

    // Send welcome email (non-blocking)
    try {
      const { sendEmail, emailTemplates } = require('../utils/sendEmail');
      const template = emailTemplates.welcome(name);
      await sendEmail({ to: email, subject: template.subject, html: template.html });
    } catch (emailErr) {
      console.error('Welcome email failed:', emailErr.message);
    }

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check Organization status for SaaS approval workflow
    if (user.organizationId) {
      const Organization = require('../models/Organization');
      const org = await Organization.findById(user.organizationId);
      if (org && org.status === 'pending') {
        return res.status(401).json({ success: false, message: 'Your workspace is under review. You will be notified via email once approved.' });
      }
      if (org && org.status === 'declined') {
        return res.status(401).json({ success: false, message: `Your application was declined. Reason: ${org.declineRemark}` });
      }
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact Super Admin.' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    await user.populate('organizationId', 'name industry subIndustry subIndustryId enabledModules settings');

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (client-side)
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res, next) => {
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};

// @desc    Send OTP for Organization Onboarding
// @route   POST /api/auth/onboard/send-otp
// @access  Public
exports.sendOrgOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Please provide email' });

    // Check if email is already in use by an existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Generate 6 digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB
    await OTP.deleteMany({ email }); // Clear existing
    await OTP.create({ email, otpCode });

    // Send Email
    try {
      await sendEmail({
        to: email,
        subject: 'Your TrackBells Organization Verification Code',
        html: `<h2>Welcome to TrackBells ERP</h2>
               <p>Your Organization Verification Code is:</p>
               <h1 style="color: #3b82f6; font-size: 40px; letter-spacing: 5px;">${otpCode}</h1>
               <p>This code will expire in 10 minutes.</p>`
      });
    } catch (err) {
      console.error('Email failed, using console for dev mode. OTP:', otpCode);
    }

    // Always succeed (in dev, the console will show the OTP)
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP and Create Organization + User
// @route   POST /api/auth/onboard/verify-org
// @access  Public
exports.verifyAndCreateOrg = async (req, res, next) => {
  try {
    const { personalDetails, orgDetails, otpCode } = req.body;
    
    // Validate OTP
    const otpRecord = await OTP.findOne({ email: personalDetails.email, otpCode });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const { getCountryDetails } = require('../config/countryConfig');
    const countryName = (orgDetails && orgDetails.country) || 'India';
    const countrySpecs = getCountryDetails(countryName);

    // Map human-readable subIndustry names to machine-readable slugs
    const INDUSTRY_ID_MAP = {
      'Drag Chain':                   'drag_chain',
      'Automotive':                   'automotive',
      'Steel & Fabrication':          'steel_fabrication',
      'Electrical & Electronics':     'electrical',
      'Energy & Power':               'energy_power',
      'Food & Beverage':              'food_beverage',
      'Pharmaceutical':               'pharmaceutical',
      'Chemicals & Petrochemicals':   'chemicals_petrochemicals',
      'Logistics & Transport':        'logistics',
      'Retail':                       'retail',
    };

    // Default module sets per sub-industry
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

    const rawSubIndustry = orgDetails.subIndustry || 'Drag Chain';
    const subIndustryId = INDUSTRY_ID_MAP[rawSubIndustry] || rawSubIndustry.toLowerCase().replace(/[&]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').trim();
    const enabledModules = INDUSTRY_MODULES[subIndustryId] || ALL_MODULES;

    // Create Organization
    const organization = await Organization.create({
      name: orgDetails.name,
      industry: orgDetails.industry,
      subIndustry: rawSubIndustry,
      subIndustryId,
      enabledModules,
      address: orgDetails.address,
      country: countrySpecs.country,
      currency: countrySpecs.currency,
      currencySymbol: countrySpecs.symbol,
      taxName: countrySpecs.taxName,
      taxRate: countrySpecs.taxRate,
      contactEmail: personalDetails.email,
      contactPhone: personalDetails.phone,
      verified: false,
      status: 'pending',
      settings: {
        brandName: orgDetails.name,
        brandSubtitle: orgDetails.industry
      }
    });

    // Create Super Admin User for this org
    const user = await User.create({
      name: personalDetails.name,
      email: personalDetails.email,
      password: personalDetails.password,
      phone: personalDetails.phone,
      role: 'super_admin',
      organizationId: organization._id,
      isOrgOwner: true
    });

    // Delete OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    // Send Email to Main System Superadmin
    try {
      const { sendEmail } = require('../utils/sendEmail');
      await sendEmail({
        to: process.env.PLATFORM_ADMIN_EMAIL,
        subject: 'New Organization Registration - Action Required',
        html: `<h2>New Organization Requires Approval</h2>
               <p>A new factory/workspace has registered and is waiting for your approval.</p>
               <br/>
               <p><b>Factory Name:</b> ${organization.name}</p>
               <p><b>Industry:</b> ${organization.industry}</p>
               <p><b>Admin Name:</b> ${user.name}</p>
               <p><b>Admin Email:</b> ${user.email}</p>
               <br/>
               <p>Please log in to the TrackBells HQ Dashboard to approve or decline this application.</p>`
      });
    } catch (err) {
      console.error('Failed to send admin notification email:', err);
    }

    // Return success but do not log in
    res.status(201).json({
      success: true,
      message: 'Workspace created successfully! It is currently under review by our team. You will be notified via email.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('organizationId', 'name industry subIndustry subIndustryId enabledModules settings');

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email' });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with that email' });
    }

    // Generate reset token
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Build reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      const template = emailTemplates.resetPassword(user.name, resetUrl);
      await sendEmail({ to: user.email, subject: template.subject, html: template.html });

      res.status(200).json({ success: true, message: 'Password reset email sent successfully' });
    } catch (emailErr) {
      console.error('Reset email failed:', emailErr.message);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    // Hash the token from URL
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/update-profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};
    const allowed = ['name', 'phone', 'profileImage'];

    allowed.forEach(field => {
      if (req.body[field] !== undefined) {
        fieldsToUpdate[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};
