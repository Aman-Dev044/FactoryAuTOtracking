const express = require('express');
const router = express.Router();
const { getReportData, exportReportXLSX } = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

router.get('/data', protect, getReportData);
router.get('/export-xlsx', protect, exportReportXLSX);

module.exports = router;
