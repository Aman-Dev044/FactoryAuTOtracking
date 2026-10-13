const mongoose = require('mongoose');

const RackBinSchema = new mongoose.Schema({
  rackName: {
    type: String,
    required: [true, 'Rack name is required'],
    trim: true,
    uppercase: true
  },
  binName: {
    type: String,
    required: [true, 'Bin name is required'],
    trim: true,
    uppercase: true
  },
  capacity: {
    type: Number, // Maximum chains (meters) this bin can hold
    default: 1000
  },
  currentUtilization: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure Rack + Bin combination is unique
RackBinSchema.index({ rackName: 1, binName: 1 }, { unique: true });

const tenantPlugin = require('../utils/tenantPlugin');
RackBinSchema.plugin(tenantPlugin);

module.exports = mongoose.model('RackBin', RackBinSchema);
