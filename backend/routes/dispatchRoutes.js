const express = require('express');
const router = express.Router();
const {
  getDispatches,
  getDispatchStats,
  createDispatch,
  updateDispatch,
  deleteDispatch,
  sendDispatchEmail
} = require('../controllers/dispatchController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);
router.use(authorize(
  'super_admin', 'admin', 'dispatch', 'dispatch_manager', 'assembly', 'assembly_user', 'assembly_manager', 'store_manager', 'store', 'sales', 'supervisor', 'production_manager', 'orders', 'gate_guard'
));

router.get('/stats', getDispatchStats);
router.route('/').get(getDispatches).post(createDispatch);
router.route('/:id').put(updateDispatch).delete(deleteDispatch);
router.post('/:id/send-email', sendDispatchEmail);

module.exports = router;
