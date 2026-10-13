const express = require('express');
const router = express.Router();
const {
  getAllOrganizations,
  approveOrganization,
  declineOrganization,
  forceReverify,
  reverifyOTP,
  resendReverifyOTP,
  createOrganization,
  getOrgSettings,
  updateOrgSettings,
  checkMobileAccessStatus,
  deleteOrganization
} = require('../controllers/orgController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public route for mobile verification (No Auth required)
router.get('/mobile-check', checkMobileAccessStatus);

router.use(protect);

// Settings Routes
router.get('/settings', getOrgSettings);
router.put('/settings', authorize('super_admin', 'admin'), updateOrgSettings);

// Organization management (only for Main Super Admin)
router.get('/', authorize('super_admin'), getAllOrganizations);
router.post('/', authorize('super_admin'), createOrganization);
router.put('/:id/approve', authorize('super_admin'), approveOrganization);
router.put('/:id/decline', authorize('super_admin'), declineOrganization);
router.delete('/:id', authorize('super_admin'), deleteOrganization);

// Reverification Routes
router.post('/:id/force-reverify', authorize('super_admin'), forceReverify);
router.post('/reverify-otp', reverifyOTP); // Any org admin can call
router.post('/resend-reverify-otp', resendReverifyOTP); // Any org admin can call

module.exports = router;
