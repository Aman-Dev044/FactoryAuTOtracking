const mongoose = require('mongoose');

const AssemblyBatchSchema = new mongoose.Schema({
  wipBatchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WipBatch',
    required: true
  },
  modelNumber: {
    type: String,
    required: true
  },
  inputQuantity: {
    type: Number, // Prepared shots taken for assembly
    required: true
  },
  outputMeters: {
    type: Number, // Chains produced in meters
    required: true
  },
  rejectedQuantity: {
    type: Number, // Failed QC during assembly
    default: 0
  },
  assembledComponents: [{
    type: String,
    enum: ['Bracket', 'Strip', 'Strain Relief', 'Divider']
  }],
  status: {
    type: String,
    enum: ['assembled', 'stored'],
    default: 'assembled'
  },
  assembledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rackBinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RackBin'
  }
}, {
  timestamps: true
});

AssemblyBatchSchema.index({ wipBatchId: 1 });
AssemblyBatchSchema.index({ status: 1 });
AssemblyBatchSchema.index({ modelNumber: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
AssemblyBatchSchema.plugin(tenantPlugin);

module.exports = mongoose.model('AssemblyBatch', AssemblyBatchSchema);
