const User = require('../models/User');
const SupportTicket = require('../models/SupportTicket');
const GateEntry = require('../models/GateEntry');
const BuildJob = require('../models/BuildJob');
const QualityLog = require('../models/QualityLog');
const InventoryItem = require('../models/InventoryItem');
const ShortageBuySale = require('../models/ShortageBuySale');

// @desc    Get all users (with search, filter, pagination)
// @route   GET /api/admin/users
// @access  Private (super_admin, admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '', role, isActive } = req.query;

    const filter = {};
    
    // Tenant Isolation
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      filter.organizationId = req.user.organizationId;
      filter.email = { $ne: process.env.PLATFORM_ADMIN_EMAIL };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      if (role.includes(',')) {
        filter.role = { $in: role.split(',') };
      } else {
        filter.role = role;
      }
    }
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .populate('organizationId', 'name')
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.status(200).json({
      success: true,
      data: users,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/admin/users/:id
// @access  Private (super_admin, admin)
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user role and permissions
// @route   PUT /api/admin/users/:id/role
// @access  Private (super_admin only)
exports.updateUserRole = async (req, res, next) => {
  try {
    const validRoles = [
      'super_admin', 'admin', 'dispatch', 'dispatch_manager', 'store_manager', 'sales',
      'supervisor', 'production_manager', 'gate_guard', 'quality_checker',
      'purchase_manager', 'purchase_user', 'assembly_user', 'assembly_manager', 'assembly', 'user'
    ];

    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Valid: ${validRoles.join(', ')}` });
    }

    // Prevent changing own role
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot change your own role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Tenant Isolation & Role Change Constraints
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      if (!user.organizationId || user.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to change this user\'s role' });
      }
      // Org admin cannot change user to super_admin or modify a super_admin
      if (role === 'super_admin' || user.role === 'super_admin') {
        return res.status(403).json({ success: false, message: 'Not authorized to assign or modify super_admin role' });
      }
    }

    if (role) user.role = role;
    if (permissions) {
      user.permissions = permissions;
      user.markModified('permissions');
    }

    await user.save({ validateBeforeSave: true });

    res.status(200).json({ success: true, message: `Role updated`, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Activate/Deactivate user
// @route   PUT /api/admin/users/:id/status
// @access  Private (super_admin, admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    // Prevent deactivating yourself
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (super_admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Tenant Isolation
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      if (!user.organizationId || user.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to delete this user' });
      }
    }

    // Only Platform Admin can delete other Super Admins (Org Admins)
    if (user.role === 'super_admin' && req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(400).json({ success: false, message: 'Cannot delete organization admin' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new user (Employee)
// @route   POST /api/admin/users
// @access  Private/Admin
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department, permissions, orgName, orgIndustry, orgAddress } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    let organizationId = req.user.organizationId;
    let isOrgOwner = false;
    let userRole = role || 'user';

    // If orgName is provided and role is admin, create a new Organization and set role to super_admin
    if (orgName && role === 'admin') {
      const Organization = require('../models/Organization');
      
      const orgExists = await Organization.findOne({ name: orgName });
      if (orgExists) {
        return res.status(400).json({ success: false, message: 'Organization name already exists' });
      }

      const newOrg = await Organization.create({
        name: orgName,
        industry: orgIndustry || 'Manufacturing',
        address: orgAddress || '',
        contactEmail: email,
        contactPhone: phone || '',
        verified: true,       // Bypasses OTP verification
        status: 'approved',     // Bypasses Superadmin approval
        settings: {
          brandName: orgName,
          brandSubtitle: orgIndustry || 'Manufacturing'
        }
      });

      organizationId = newOrg._id;
      isOrgOwner = true;
      userRole = 'super_admin'; // Forces the role to 'super_admin' (Org Admin) for the new organization
    }

    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      phone,
      department,
      organizationId,
      isOrgOwner,
      permissions: permissions || []
    });

    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Private (super_admin)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, phone, department } = req.body;
    let user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Tenant Isolation
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      if (!user.organizationId || user.organizationId.toString() !== req.user.organizationId.toString()) {
        return res.status(403).json({ success: false, message: 'Not authorized to edit this user' });
      }
    }

    // Platform admin can edit anyone. Org admin can edit non-super-admins.
    if (user.role === 'super_admin' && req.user.email !== process.env.PLATFORM_ADMIN_EMAIL && req.user._id.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this user' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    user.department = department || user.department;

    await user.save();

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get role-based stats
// @route   GET /api/admin/stats
// @access  Private (super_admin, admin)
exports.getAdminStats = async (req, res, next) => {
  try {
    const filter = { email: { $ne: process.env.PLATFORM_ADMIN_EMAIL } };

    // Tenant Isolation
    if (req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      filter.organizationId = req.user.organizationId;
    }

    const [totalUsers, activeUsers, roleDistribution] = await Promise.all([
      User.countDocuments(filter),
      User.countDocuments({ ...filter, isActive: true }),
      User.aggregate([
        { $match: filter },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        roleDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get global stats for super admin dashboard
// @route   GET /api/admin/super-stats
// @access  Private (super_admin only)
exports.getSuperAdminStats = async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin' || req.user.email !== process.env.PLATFORM_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Access denied. Platform Admin only.' });
    }

    const [
      totalAdmins,
      totalUsers,
      totalTickets,
      totalGateEntries,
      totalBuildJobs,
      totalQcLogs,
      totalInventoryItems,
      totalShortages,
      recentTickets,
      recentBuilds
    ] = await Promise.all([
      User.countDocuments({ role: { $in: ['admin', 'super_admin'] } }),
      User.countDocuments(),
      SupportTicket.countDocuments(),
      GateEntry.countDocuments(),
      BuildJob.countDocuments(),
      QualityLog.countDocuments(),
      InventoryItem.countDocuments(),
      ShortageBuySale.countDocuments({ type: 'shortage' }),
      SupportTicket.find().sort({ createdAt: -1 }).limit(5),
      BuildJob.find().sort({ createdAt: -1 }).limit(5).populate('machineId', 'name')
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalAdmins,
        totalUsers,
        totalTickets,
        totalGateEntries,
        totalBuildJobs,
        totalQcLogs,
        totalInventoryItems,
        totalShortages,
        recentTickets,
        recentBuilds
      }
    });
  } catch (error) {
    next(error);
  }
};
