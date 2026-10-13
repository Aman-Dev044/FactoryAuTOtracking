const mongoose = require('mongoose');

const PayrollSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  month: {
    type: Number, // 1-12
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  totalDays: {
    type: Number,
    required: true
  },
  presentDays: {
    type: Number,
    required: true
  },
  totalOvertimeHours: {
    type: Number,
    default: 0
  },
  earnings: {
    basic: Number,
    overtimePay: Number,
    bonus: { type: Number, default: 0 }
  },
  deductions: {
    esi: { type: Number, default: 0 }, // Employees' State Insurance
    pf: { type: Number, default: 0 }   // Provident Fund
  },
  netSalary: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

PayrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });

const tenantPlugin = require('../utils/tenantPlugin');
PayrollSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Payroll', PayrollSchema);
