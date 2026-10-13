const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  empId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  department: {
    type: String,
    enum: ['Production', 'Store', 'Assembly', 'Maintenance', 'Security', 'General'],
    required: true
  },
  basicSalary: {
    type: Number, // Monthly basic
    required: true
  },
  overtimeRate: {
    type: Number, // Per hour OT rate
    required: true
  },
  esiApplicable: {
    type: Boolean,
    default: true
  },
  pfApplicable: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const tenantPlugin = require('../utils/tenantPlugin');
EmployeeSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Employee', EmployeeSchema);
