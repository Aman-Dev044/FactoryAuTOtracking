const mongoose = require('mongoose');

const MachineCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true
  },
  machineNames: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

MachineCategorySchema.index({ categoryName: 1 });

const tenantPlugin = require('../utils/tenantPlugin');
MachineCategorySchema.plugin(tenantPlugin);

module.exports = mongoose.model('MachineCategory', MachineCategorySchema);
