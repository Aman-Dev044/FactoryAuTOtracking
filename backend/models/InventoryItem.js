const mongoose = require('mongoose');

const InventoryItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Inventory item name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['raw_material', 'finished_good', 'hardware', 'custom'],
    required: true,
    default: 'raw_material'
  },
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    default: 'kg'
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  minStock: {
    type: Number,
    default: 0,
    min: 0
  },
  maintainedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },

  location: {
    type: String,
    trim: true,
    default: 'Unassigned'
  },
  size: {
    type: String,
    trim: true
  },
  modelNumber: {
    type: String,
    trim: true
  },
  warehouseLocation: {
    type: String,
    trim: true,
    default: ''
  },
  almirah: {
    type: String,
    trim: true,
    default: ''
  },
  rack: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  qualityStatus: {
    type: String,
    enum: ['pending', 'sent_for_qc', 'verified', 'rejected'],
    default: 'pending'
  },
  qcRemarks: {
    type: String,
    trim: true
  },
  qcRequestedAt: {
    type: Date
  },
  radius: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  designType: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  vs: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  hs: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  sr: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  series: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  productionStatus: {
    type: String,
    enum: ['none', 'sent_to_pm', 'assigned_to_supervisor', 'completed'],
    default: 'none'
  },
  storeRemarks: {
    type: String,
    trim: true,
    default: ''
  },
  assignedSupervisor: {
    type: String,
    trim: true,
    default: ''
  },
  pmRemarks: {
    type: String,
    trim: true,
    default: ''
  },
  sentToPmAt: {
    type: Date
  },
  assignedSupervisorAt: {
    type: Date
  },
  // Flexible key-value store for industry-specific fields
  // e.g. { partNumber: 'AP-001', vehicleModel: 'Swift' } for Automotive
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

InventoryItemSchema.index({ type: 1 });
InventoryItemSchema.index({ name: 1 });
InventoryItemSchema.index({ location: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
InventoryItemSchema.plugin(tenantPlugin);

module.exports = mongoose.model('InventoryItem', InventoryItemSchema);
