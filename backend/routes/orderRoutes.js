const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getShortageReports,
  planShortageProduction,
  dispatchOrder,
  getOrderStats,
  getOrderPDF
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/stats', authorize('super_admin', 'admin', 'sales', 'store_manager', 'orders'), getOrderStats);
router.get('/:id/pdf', authorize('super_admin', 'admin', 'sales', 'store_manager', 'orders'), getOrderPDF);

router.route('/')
  .get(authorize('super_admin', 'admin', 'sales', 'store_manager', 'supervisor', 'production_manager', 'orders'), getOrders)
  .post(authorize('super_admin', 'admin', 'sales', 'orders'), createOrder);

router.get('/shortages', authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'sales', 'store_manager', 'orders'), getShortageReports);
router.post('/shortages/:id/plan', authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'orders'), planShortageProduction);

router.post('/:id/dispatch', authorize('super_admin', 'admin', 'sales', 'store_manager', 'orders'), dispatchOrder);

module.exports = router;
