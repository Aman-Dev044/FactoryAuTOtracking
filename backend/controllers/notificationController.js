const Notification = require('../models/Notification');
const tenantContext = require('../middleware/tenantContext');

// @desc    Get all notifications for the current user
// @route   GET /api/notifications
// @access  Private (All Roles)
exports.getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {};
    
    // If not super_admin or admin, restrict by targetRoles
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      query.$or = [
        { targetRoles: { $size: 0 } }, // Global org notifications
        { targetRoles: req.user.role } // Role-specific notifications
      ];
    }
    // Admin sees everything within the org (TenantPlugin handles the org filter automatically)

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .populate('actionBy', 'name role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const formatted = notifications.map(n => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      targetRoles: n.targetRoles,
      actionBy: n.actionBy,
      metadata: n.metadata,
      createdAt: n.createdAt,
      isRead: n.readBy.includes(req.user.id)
    }));

    res.status(200).json({ 
      success: true, 
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Superadmin cross-org notifications
// @route   GET /api/notifications/superadmin
// @access  Private (super_admin only)
exports.getSuperadminNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Superadmin needs cross-tenant data. 
    // Mongoose tenant plugin uses a pre-find hook to attach organizationId based on Context.
    // If we run this in a block where context is cleared, it returns all orgs.
    const notifications = await tenantContext.run(null, async () => {
      const total = await Notification.countDocuments();
      const results = await Notification.find()
        .populate('organizationId', 'name settings')
        .populate('actionBy', 'name role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      return { total, results };
    });
    
    const formatted = notifications.results.map(n => ({
      _id: n._id,
      title: n.title,
      message: n.message,
      type: n.type,
      targetRoles: n.targetRoles,
      organization: n.organizationId ? {
        id: n.organizationId._id,
        name: n.organizationId.name,
        color: n.organizationId.settings?.themeColor
      } : null,
      actionBy: n.actionBy,
      metadata: n.metadata,
      createdAt: n.createdAt,
      isRead: n.readBy.includes(req.user.id)
    }));

    res.status(200).json({ 
      success: true, 
      data: formatted,
      pagination: {
        page,
        limit,
        total: notifications.total,
        pages: Math.ceil(notifications.total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (!notification.readBy.includes(req.user.id)) {
      notification.readBy.push(req.user.id);
      await notification.save();
    }

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all as read
// @route   PUT /api/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    // For roles, we should only mark read for notifications they can actually see
    const query = {};
    if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
      query.$or = [
        { targetRoles: { $size: 0 } },
        { targetRoles: req.user.role }
      ];
    }
    query.readBy = { $ne: req.user.id };

    await Notification.updateMany(query, { $push: { readBy: req.user.id } });
    
    res.status(200).json({ success: true, message: 'All relevant notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// Helper function to create notification internally and emit via Socket
exports.createNotification = async (req, payload) => {
  // payload: { title, message, type, targetRoles: [], metadata: {} }
  try {
    const orgId = req.user.organizationId;
    const actionBy = req.user._id;
    
    const notification = await Notification.create({
      title: payload.title,
      message: payload.message,
      type: payload.type || 'system',
      targetRoles: payload.targetRoles || [],
      actionBy,
      metadata: payload.metadata || {}
    });

    // Populate for socket emission
    const populated = await Notification.findById(notification._id)
      .populate('actionBy', 'name role')
      .populate('organizationId', 'name settings'); // Important for Superadmin cross-org view

    const socketPayload = {
      _id: populated._id,
      title: populated.title,
      message: populated.message,
      type: populated.type,
      targetRoles: populated.targetRoles,
      actionBy: populated.actionBy,
      metadata: populated.metadata,
      createdAt: populated.createdAt,
      organization: populated.organizationId ? {
        id: populated.organizationId._id,
        name: populated.organizationId.name,
        color: populated.organizationId.settings?.themeColor
      } : null,
      isRead: false
    };

    const io = req.app.get('io');
    if (io) {
      // 1. Always emit to Superadmin
      io.to('superadmin').emit('new_notification', socketPayload);
      
      // 2. Always emit to Admins in this organization
      io.to(`org_${orgId}_admin`).emit('new_notification', socketPayload);

      // 3. Emit to specific roles in this org
      if (payload.targetRoles && payload.targetRoles.length > 0) {
        payload.targetRoles.forEach(role => {
          if (role !== 'admin') { // Avoid double-emitting to admin
            io.to(`org_${orgId}_${role}`).emit('new_notification', socketPayload);
          }
        });
      } else {
        // If no targetRoles specified, broadcast to entire org
        io.to(`org_${orgId}`).emit('new_notification', socketPayload);
      }
    }

    return notification;
  } catch (err) {
    console.error('Failed to create and emit notification', err);
  }
};
