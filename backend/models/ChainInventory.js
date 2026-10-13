const mongoose = require('mongoose');

const ChainInventorySchema = new mongoose.Schema({
  modelNumber: {
    type: String,
    required: true,
    index: true
  },
  rackBinId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RackBin',
    required: true,
    index: true
  },
  quantityMeters: {
    type: Number,
    required: true,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// A specific model in a specific bin should have only one record (we update the quantity)
ChainInventorySchema.index({ modelNumber: 1, rackBinId: 1 }, { unique: true });

const tenantPlugin = require('../utils/tenantPlugin');
ChainInventorySchema.plugin(tenantPlugin);

module.exports = mongoose.model('ChainInventory', ChainInventorySchema);
