const express = require('express');
const router = express.Router();
const {
  getReadyWipBatches,
  assembleWipBatch,
  getAssemblies,
  createRackBin,
  getRackBins,
  storeChain,
  getChainInventory,
  saveScannedInventory,
  getStoreStats
} = require('../controllers/storeController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All routes require auth
router.use(protect);
router.use(authorize('super_admin', 'admin', 'store_manager', 'store'));

// Dashboard Stats
router.get('/stats', getStoreStats);

// Assembly & QC
router.get('/ready-wip', getReadyWipBatches);
router.post('/assemble', assembleWipBatch);
router.get('/assemblies', getAssemblies);

// Rack & Bin Management
router.route('/racks')
  .get(getRackBins)
  .post(createRackBin);

// Inventory Storage
router.post('/store-chain', storeChain);
router.get('/inventory', getChainInventory);
router.post('/inventory/scan', saveScannedInventory);

module.exports = router;
