const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure upload path
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
  createGateEntry,
  getGateEntries,
  getGateEntry,
  updateGateEntry,
  deleteGateEntry,
  verifyGateEntry,
  createGRN,
  getGateEntryStats,
  notifyAccounts,
  scanEBill
} = require('../controllers/gateEntryController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require authentication
router.use(protect);

// Scan E-Way Bill / Invoice via Webcam or File upload (Must be before /:id)
router.post('/scan-ebill', authorize('gate_guard', 'supervisor', 'production_manager', 'store_manager', 'admin', 'super_admin', 'purchase_manager', 'purchase_user', 'sales'), upload.single('file'), scanEBill);

// Stats (must be before /:id to avoid conflict)
router.get('/stats', authorize('gate_guard', 'supervisor', 'production_manager', 'admin', 'super_admin', 'store_manager', 'sales', 'purchase_manager', 'purchase_user'), getGateEntryStats);

const gateUploadFields = upload.fields([
  { name: 'invoice', maxCount: 1 },
  { name: 'invoiceFile', maxCount: 1 },
  { name: 'materialPhoto', maxCount: 1 },
  { name: 'thirdBillPhoto', maxCount: 1 }
]);

// CRUD
router.route('/')
  .get(authorize('gate_guard', 'supervisor', 'production_manager', 'store_manager', 'admin', 'super_admin', 'sales', 'purchase_manager', 'purchase_user'), getGateEntries)
  .post(authorize('gate_guard', 'supervisor', 'production_manager', 'admin', 'super_admin'), gateUploadFields, createGateEntry);

router.route('/:id')
  .get(authorize('gate_guard', 'supervisor', 'production_manager', 'store_manager', 'admin', 'super_admin', 'sales', 'purchase_manager', 'purchase_user'), getGateEntry)
  .put(authorize('gate_guard', 'supervisor', 'production_manager', 'admin', 'super_admin'), updateGateEntry)
  .delete(authorize('admin', 'super_admin'), deleteGateEntry);

// Actions
router.put('/:id/verify', authorize('supervisor', 'production_manager', 'admin', 'super_admin'), verifyGateEntry);
router.put('/:id/create-grn', authorize('store_manager', 'supervisor', 'production_manager', 'admin', 'super_admin'), createGRN);
router.post('/:id/notify-accounts', authorize('gate_guard', 'supervisor', 'production_manager', 'store_manager', 'admin', 'super_admin'), notifyAccounts);

module.exports = router;
