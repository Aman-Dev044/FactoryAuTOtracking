const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  createUser,
  updateUser,
  getAdminStats,
  getSuperAdminStats
} = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require auth + admin role
router.use(protect);

// Stats
router.get('/stats', authorize('super_admin', 'admin'), getAdminStats);
router.get('/super-stats', authorize('super_admin'), getSuperAdminStats);

// User CRUD
router.route('/users')
  .get(authorize('super_admin', 'admin'), getAllUsers)
  .post(authorize('super_admin', 'admin'), createUser);

router.route('/users/:id')
  .get(authorize('super_admin', 'admin'), getUser)
  .put(authorize('super_admin', 'admin'), updateUser)
  .delete(authorize('super_admin', 'admin'), deleteUser);

// Role & Status actions
router.put('/users/:id/role', authorize('super_admin', 'admin'), updateUserRole);
router.put('/users/:id/status', authorize('super_admin', 'admin'), toggleUserStatus);

module.exports = router;
