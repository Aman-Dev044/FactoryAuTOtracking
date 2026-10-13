const express = require('express');
const router = express.Router();
const {
  createPlan,
  getPlans,
  createWipBatch,
  getWipBatches,
  updateWipStage,
  getProductionStats
} = require('../controllers/productionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require auth
router.use(protect);

// Dashboard stats
router.get('/stats', authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'production'), getProductionStats);

// Planning Routes (Supervisor+)
router.route('/plans')
  .get(authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'production'), getPlans)
  .post(authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'production'), createPlan);

// WIP Batch Routes
router.route('/wip')
  .get(authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'store_manager', 'production'), getWipBatches)
  .post(authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'production'), createWipBatch); // Material Issue

// Stage Update (Production+)
router.put('/wip/:id/stage', authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'production'), updateWipStage);

module.exports = router;
