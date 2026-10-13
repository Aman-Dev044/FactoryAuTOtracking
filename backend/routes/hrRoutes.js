const express = require('express');
const router = express.Router();
const {
  addEmployee,
  getEmployees,
  punchAttendance,
  getAttendance,
  generatePayroll,
  getPayroll,
  getHRStats
} = require('../controllers/hrController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// Dashboard Stats
router.get('/stats', authorize('super_admin', 'admin', 'hr_manager'), getHRStats);

// Employees
router.route('/employees')
  .get(authorize('super_admin', 'admin', 'hr_manager'), getEmployees)
  .post(authorize('super_admin', 'admin', 'hr_manager'), addEmployee);

// Attendance
router.route('/attendance')
  .get(authorize('super_admin', 'admin', 'hr_manager', 'gate_guard'), getAttendance)
  .post(authorize('super_admin', 'admin', 'hr_manager', 'gate_guard'), punchAttendance);

// Payroll
router.get('/payroll', authorize('super_admin', 'admin', 'hr_manager'), getPayroll);
router.post('/payroll/generate', authorize('super_admin', 'admin', 'hr_manager'), generatePayroll);

module.exports = router;
