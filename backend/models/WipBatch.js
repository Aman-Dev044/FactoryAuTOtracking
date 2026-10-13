const mongoose = require('mongoose');

const StageSchema = new mongoose.Schema({
  processedQty: { type: Number, default: 0 },
  rejectedQty: { type: Number, default: 0 },
  qcStatus: { 
    type: String, 
    enum: ['pending', 'passed', 'failed', 'partial'], 
    default: 'pending' 
  },
  operator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date },
  remarks: { type: String, trim: true }
}, { _id: false });

const WipBatchSchema = new mongoose.Schema({
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductionPlan',
    required: true
  },
  batchNumber: {
    type: String,
    required: true,
    unique: true
  },
  materialIssued: {
    type: Number,
    required: [true, 'Material issued (kg) is required'],
    min: 0
  },
  currentStage: {
    type: String,
    enum: ['shot_production', 'inhaling', 'boiling', 'ready_for_assembly'],
    default: 'shot_production'
  },
  
  // Tracking across stages
  shotDetails: { type: StageSchema, default: () => ({}) },
  inhalingDetails: { type: StageSchema, default: () => ({}) },
  boilingDetails: { type: StageSchema, default: () => ({}) },
  
  status: {
    type: String,
    enum: ['active', 'qc_failed', 'completed'],
    default: 'active'
  },
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Auto-generate batch number
WipBatchSchema.pre('validate', async function() {
  if (this.isNew && !this.batchNumber) {
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const count = await mongoose.model('WipBatch').countDocuments({
      batchNumber: { $regex: `^BATCH-${dateStr}` }
    });
    this.batchNumber = `BATCH-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
});

// WipBatchSchema.index({ batchNumber: 1 });
WipBatchSchema.index({ planId: 1 });
WipBatchSchema.index({ currentStage: 1 });
WipBatchSchema.index({ status: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
StageSchema.plugin(tenantPlugin);

module.exports = mongoose.model('WipBatch', WipBatchSchema);
