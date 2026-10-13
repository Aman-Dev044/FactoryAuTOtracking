const express = require('express');
const router = express.Router();
const {
  getPipeline,
  getPipelineStats,
  getNextSalesOrderNumber,
  createPipelineRecord,
  updatePipelineRecord,
  approveSalesOrder,
  rejectSalesOrder,
  getAuditLogs,
  addFollowUp,
  deletePipelineRecord
} = require('../controllers/salesPipelineController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

router.get('/next-so-number', authorize('super_admin', 'admin', 'sales', 'assembly', 'assembly_user', 'assembly_manager', 'store_manager'), getNextSalesOrderNumber);
router.get('/stats', authorize('super_admin', 'admin', 'sales', 'store_manager', 'supervisor', 'assembly', 'assembly_user', 'assembly_manager'), getPipelineStats);
router.route('/')
  .get(authorize('super_admin', 'admin', 'sales', 'store_manager', 'supervisor', 'gate_guard', 'assembly', 'assembly_user', 'assembly_manager', 'dispatch', 'dispatch_manager'), getPipeline)
  .post(authorize('super_admin', 'admin', 'sales', 'assembly', 'assembly_user', 'assembly_manager', 'store_manager', 'dispatch'), createPipelineRecord);

router.get('/:id/audit-logs', authorize('super_admin', 'admin', 'sales', 'store_manager', 'supervisor', 'assembly', 'assembly_user', 'assembly_manager'), getAuditLogs);

router.route('/:id')
  .put(authorize('super_admin', 'admin', 'sales', 'assembly', 'assembly_user', 'assembly_manager', 'store_manager', 'dispatch'), updatePipelineRecord)
  .delete(authorize('super_admin', 'admin', 'sales', 'assembly', 'assembly_user', 'assembly_manager'), deletePipelineRecord);

router.post('/:id/followup', authorize('super_admin', 'admin', 'sales'), addFollowUp);

// Approval actions restricted to Admin & Super Admin
router.put('/:id/approve', authorize('super_admin', 'admin'), approveSalesOrder);
router.put('/:id/reject', authorize('super_admin', 'admin'), rejectSalesOrder);

module.exports = router;
