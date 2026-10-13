const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'user_added', 'order_created', 'order_updated', 'system',
      'quality_check_requested', 'quality_check_completed',
      'task_assigned', 'build_completed', 'production_delayed',
      'inventory_shortage', 'material_request',
      'admin_action', 'gate_entry_created',
      'sales_order_approval_requested', 'sales_order_approved', 'sales_order_rejected'
    ],
    default: 'system'
  },
  targetRoles: [{
    type: String,
    enum: ['admin', 'storeManager', 'supervisor', 'qualityChecker', 'sales', 'gateGuard']
  }],
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

const tenantPlugin = require('../utils/tenantPlugin');
NotificationSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Notification', NotificationSchema);
