const express = require('express');
const router = express.Router();
const {
  getReports,
  generateReport,
  viewReport,
  deleteReport,
  downloadReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/auth');

// Allow direct browser viewing & download by report ID
router.get('/view/:id', viewReport);
router.get('/download/:id', downloadReport);

router.use(protect);

router.get('/', getReports);
router.post('/', generateReport);
router.post('/generate', generateReport);
router.delete('/:id', deleteReport);

module.exports = router;
