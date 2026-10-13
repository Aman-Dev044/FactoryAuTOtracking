const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half-Day'],
    default: 'Absent'
  },
  punchIn: {
    type: Date
  },
  punchOut: {
    type: Date
  },
  overtimeHours: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// One attendance record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });

const tenantPlugin = require('../utils/tenantPlugin');
AttendanceSchema.plugin(tenantPlugin);

module.exports = mongoose.model('Attendance', AttendanceSchema);
