const mongoose = require('mongoose');

const BuildJobSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  productSize: {
    type: String,
    trim: true
  },
  itemType: { type: String, default: 'finished_good' },
  unit: { type: String, default: 'pcs' },
  modelNumber: { type: String, default: '' },
  description: { type: String, default: '' },
  radius: { type: String, default: 'N/A' },
  designType: { type: String, default: 'OP' },
  vs: { type: String, default: 'N/A' },
  hs: { type: String, default: 'N/A' },
  sr: { type: String, default: 'N/A' },
  chainLength: { type: String, default: '' }, // Length in mm (e.g. '1000')
  orderQuantity: {
    type: Number,
    required: [true, 'Order quantity is required'],
    min: [1, 'Quantity must be at least 1']
  },
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  salesPersonName: {
    type: String,
    trim: true,
    default: ''
  },
  orderedRole: {
    type: String,
    enum: ['sales', 'store_manager'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'shortage_reported', 'processing', 'completed', 'received', 'declined', 'delayed'],
    default: 'pending'
  },
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine'
  },
  machineName: {
    type: String,
    trim: true
  },
  productionLine: {
    type: String,
    default: 'Line 1',
    trim: true
  },
  shotCount: {
    type: Number,
    default: 1
  },
  shortageLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShortageBuySale'
  },
  inventoryItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem'
  },
  materialsUsed: [{
    materialName: { type: String, default: 'Unspecified Raw Material' },
    quantity: { type: Number, required: true },
    unit: { type: String, default: 'kg' }
  }],
  customFields: [{
    key: { type: String, required: true },
    value: { type: String, required: true }
  }],
  estimatedDate: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

BuildJobSchema.index({ status: 1 });
BuildJobSchema.index({ productName: 1 });
BuildJobSchema.index({ createdAt: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
BuildJobSchema.plugin(tenantPlugin);

module.exports = mongoose.model('BuildJob', BuildJobSchema);
