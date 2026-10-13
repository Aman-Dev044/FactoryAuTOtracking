const mongoose = require('mongoose');

const QualityLogSchema = new mongoose.Schema({
  materialName: {
    type: String,
    required: [true, 'Material name is required'],
    trim: true
  },
  modelNumber: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be positive']
  },
  unit: {
    type: String,
    required: true,
    default: 'pcs'
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  invoiceUrl: {
    type: String,
    trim: true
  },
  // Inspection stage: first inspection or final inspection
  inspectionType: {
    type: String,
    enum: ['first_inspection', 'final_inspection'],
    default: 'first_inspection'
  },
  // QC outcome (PDF: Pass/Hold/Reject/Rework)
  outcome: {
    type: String,
    enum: ['pass', 'hold', 'reject', 'rework'],
    default: 'pass'
  },
  qcType: {
    type: String,
    enum: ['inspected', 'damaged', 'missed'],
    required: true,
    default: 'inspected'
  },
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'rejected'],
    default: 'pending_verification'
  },
  // Dimensions check
  dimensions: { type: String, trim: true },
  // Conduit clamp / gland inspection
  conduitClamp: { type: String, trim: true },
  // Rework reason (required when outcome = rework)
  reworkReason: { type: String, trim: true },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  remarks: {
    type: String,
    trim: true
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
  }
}, {
  timestamps: true
});

QualityLogSchema.index({ qcType: 1 });
QualityLogSchema.index({ status: 1 });
QualityLogSchema.index({ createdAt: -1 });

const tenantPlugin = require('../utils/tenantPlugin');
QualityLogSchema.plugin(tenantPlugin);

module.exports = mongoose.model('QualityLog', QualityLogSchema);
