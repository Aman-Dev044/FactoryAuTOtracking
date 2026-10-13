const express = require('express');
const router = express.Router();
const { predictShots, getReports, chatWithAI } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(protect);

// AI Prediction & Chat
router.post('/predict-shots', authorize('super_admin', 'admin', 'supervisor', 'production_manager'), predictShots);
router.post('/chat', chatWithAI);

// Reports
router.get('/reports', authorize('super_admin', 'admin'), getReports);

module.exports = router;
