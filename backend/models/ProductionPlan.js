const mongoose = require('mongoose');

const ProductionPlanSchema = new mongoose.Schema({
  modelNumber: {
    type: String,
    required: [true, 'Model number is required'],
    trim: true
  },
  orderReference: {
    type: String,
    trim: true,
    default: 'Internal/Stock'
  },
  plannedShots: {
    type: Number,
    required: [true, 'Planned shots count is required'],
    min: [1, 'Planned shots must be at least 1']
  },
  completedShots: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed'],
    default: 'planned'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

ProductionPlanSchema.index({ status: 1 });
ProductionPlanSchema.index({ modelNumber: 1 });
ProductionPlanSchema.index({ createdAt: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
ProductionPlanSchema.plugin(tenantPlugin);

module.exports = mongoose.model('ProductionPlan', ProductionPlanSchema);
