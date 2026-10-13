const express = require('express');
const router = express.Router();
const { createTicket, getTickets, replyTicket } = require('../controllers/supportController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Public route to submit concern (rate-limited via global middleware)
router.post('/ticket', createTicket);

// Protected routes (Super Admin / Admin only)
router.get('/tickets', protect, authorize('super_admin', 'admin'), getTickets);
router.put('/tickets/:id/reply', protect, authorize('super_admin', 'admin'), replyTicket);

module.exports = router;
