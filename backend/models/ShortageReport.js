const mongoose = require('mongoose');

const ShortageReportSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  modelNumber: {
    type: String,
    required: true
  },
  shortageMeters: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending_planning', 'production_planned', 'fulfilled'],
    default: 'pending_planning'
  },
  plannedShots: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

ShortageReportSchema.index({ status: 1 });
ShortageReportSchema.index({ modelNumber: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
ShortageReportSchema.plugin(tenantPlugin);

module.exports = mongoose.model('ShortageReport', ShortageReportSchema);
