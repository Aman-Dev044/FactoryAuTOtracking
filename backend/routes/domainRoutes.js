const express = require('express');
const router = express.Router();
const domainController = require('../controllers/domainController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Apply protection to all routes
router.use(protect);

// Get schemas (Open to all logged-in users because forms need them)
router.get('/schema/:industryId', domainController.getSchemasByIndustry);

// Update schema (Restricted to super_admin or admin)
router.put('/schema/:industryId/:moduleKey', authorize('super_admin', 'admin'), domainController.updateSchema);

module.exports = router;
