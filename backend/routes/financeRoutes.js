const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const {
  scanInvoice,
  getInvoices,
  createSalesInvoice,
  getSalesInvoices,
  getSalesInvoicePDF,
  deleteSalesInvoice
} = require('../controllers/financeController');

const {
  getVendors,
  addVendor,
  updateVendor,
  deleteVendor,
  getQuotations,
  createQuotation,
  updateQuotation,
  convertQuotationToPO,
  deleteQuotation,
  getPOs,
  createPO,
  updatePO,
  deletePO,
  getPOLookupForGateEntry,
  getPOPDF,
  getPurchaseStoreInventory,
  placeInwardEntry,
  placeOutwardEntry,
  getStoreLedger
} = require('../controllers/purchaseController');

const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// ==========================================
// Vendors Master
// ==========================================
router.route('/vendors')
  .get(getVendors)
  .post(authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), addVendor);

router.route('/vendors/:id')
  .put(authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), updateVendor)
  .delete(authorize('super_admin', 'admin', 'purchase_manager'), deleteVendor);

// ==========================================
// Vendor Quotations
// ==========================================
router.route('/quotations')
  .get(getQuotations)
  .post(authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), createQuotation);

router.route('/quotations/:id')
  .put(authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), updateQuotation)
  .delete(authorize('super_admin', 'admin', 'purchase_manager'), deleteQuotation);

router.post('/quotations/:id/convert-to-po', authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), convertQuotationToPO);

// ==========================================
// Purchase Orders (PO)
// ==========================================
router.get('/pos/lookup-active', getPOLookupForGateEntry);
router.get('/pos/:id/pdf', getPOPDF);

router.route('/pos')
  .get(getPOs)
  .post(authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), createPO);

router.route('/pos/:id')
  .put(authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), updatePO)
  .delete(authorize('super_admin', 'admin', 'purchase_manager'), deletePO);

// ==========================================
// Purchase Store & IN/OUT Stock Ledger
// ==========================================
router.get('/purchase-store/inventory', getPurchaseStoreInventory);
router.post('/purchase-store/inward', authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), placeInwardEntry);
router.post('/purchase-store/outward', authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), placeOutwardEntry);
router.get('/purchase-store/ledger', getStoreLedger);

// ==========================================
// Invoices & OCR (Scanned Invoices)
// ==========================================
router.route('/invoices')
  .get(getInvoices);
  
router.post('/scan-invoice', authorize('super_admin', 'admin', 'sales', 'store_manager', 'purchase_manager', 'purchase_user'), upload.single('file'), scanInvoice);

// ==========================================
// Generated Sales Invoices
// ==========================================
router.route('/sales-invoices')
  .get(getSalesInvoices)
  .post(authorize('super_admin', 'admin', 'sales', 'store_manager'), createSalesInvoice);

router.get('/sales-invoices/:id/pdf', getSalesInvoicePDF);
router.delete('/sales-invoices/:id', authorize('super_admin', 'admin', 'sales', 'store_manager'), deleteSalesInvoice);

module.exports = router;
