const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|xlsx|xls|csv|doc|docx/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    if (ext) return cb(null, true);
    cb(new Error('Only images, PDFs, and documents are allowed'));
  }
});
const {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getMachineCategories,
  getMachines,
  createMachine,
  updateMachine,
  deleteMachine,
  getBuildJobs,
  createBuildJob,
  updateBuildJob,
  deleteBuildJob,
  sendToStore,
  receiveBuildProduct,
  getQualityLogs,
  createQualityLog,
  verifyQualityLog,
  updateQualityLog,
  deleteQualityLog,
  getShortageBuySales,
  createShortageBuySale,
  updateShortageBuySale,
  deleteShortageBuySale,
  getProductTemplates,
  createProductTemplate,
  updateProductTemplate,
  deleteProductTemplate,
  sendTemplateToInventory
} = require('../controllers/operationsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require auth
router.use(protect);

// Unified Inventory CRUD (Store Manager can edit, others can view/verify)
router.route('/inventory')
  .get(getInventory)
  .post(authorize('super_admin', 'admin', 'store_manager', 'supervisor', 'production_manager', 'sales'), createInventoryItem);

router.route('/inventory/:id')
  .put(authorize('super_admin', 'admin', 'store_manager', 'supervisor', 'production_manager', 'sales', 'quality_checker'), updateInventoryItem)
  .delete(authorize('super_admin', 'admin', 'store_manager', 'supervisor', 'production_manager', 'sales'), deleteInventoryItem);

// Machine Categories (MongoDB DB fetch)
router.get('/machine-categories', getMachineCategories);

// Machine CRUD (Admin can create/delete/full edit; Supervisor & Production Manager can only update status)
router.route('/machines')
  .get(getMachines)
  .post(authorize('super_admin', 'admin'), createMachine);

router.route('/machines/:id')
  .put(authorize('super_admin', 'admin', 'supervisor', 'production_manager'), updateMachine)
  .delete(authorize('super_admin', 'admin'), deleteMachine);

// Build Jobs (Sales & Store Manager can create, Supervisor updates, Store Manager completes handshake)
router.route('/build-jobs')
  .get(getBuildJobs)
  .post(authorize('super_admin', 'admin', 'supervisor', 'production_manager', 'sales', 'store_manager'), createBuildJob);

router.route('/build-jobs/:id')
  .put(authorize('super_admin', 'admin', 'supervisor', 'production_manager'), updateBuildJob)
  .delete(authorize('super_admin', 'admin', 'production_manager'), deleteBuildJob);

router.put('/build-jobs/:id/send-to-store', authorize('super_admin', 'admin', 'supervisor', 'production_manager'), sendToStore);
router.put('/build-jobs/:id/receive', authorize('super_admin', 'admin', 'store_manager'), receiveBuildProduct);

// Quality Checker Logs (Quality Checker can CRUD, Store Manager & Sales can verify / update)
router.route('/qc-logs')
  .get(getQualityLogs)
  .post(authorize('super_admin', 'admin', 'quality_checker', 'store_manager', 'sales'), upload.single('invoiceFile'), createQualityLog);

router.route('/qc-logs/:id')
  .put(authorize('super_admin', 'admin', 'store_manager', 'sales', 'quality_checker'), upload.single('invoiceFile'), updateQualityLog)
  .delete(authorize('super_admin', 'admin', 'store_manager', 'sales', 'quality_checker'), deleteQualityLog);

router.put('/qc-logs/:id/verify', authorize('super_admin', 'admin', 'store_manager', 'sales'), verifyQualityLog);

// Shortage & Buy/Sale Log CRUD (Store Manager can edit, others can view/assign)
router.route('/shortage-buy-sales')
  .get(getShortageBuySales)
  .post(authorize('super_admin', 'admin', 'store_manager', 'sales'), createShortageBuySale);

router.route('/shortage-buy-sales/:id')
  .put(authorize('super_admin', 'admin', 'store_manager', 'supervisor', 'production_manager', 'sales'), updateShortageBuySale)
  .delete(authorize('super_admin', 'admin', 'store_manager', 'sales'), deleteShortageBuySale);

// Product Model Templates (used for dynamic autocomplete values)
router.route('/product-templates')
  .get(getProductTemplates)
  .post(authorize('super_admin', 'admin', 'store_manager', 'sales'), createProductTemplate);

router.route('/product-templates/:id')
  .put(authorize('super_admin', 'admin'), updateProductTemplate)
  .delete(authorize('super_admin', 'admin'), deleteProductTemplate);

router.post('/product-templates/:id/send-to-inventory', authorize('super_admin', 'admin', 'store_manager'), sendTemplateToInventory);

module.exports = router;
