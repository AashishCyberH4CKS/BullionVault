const express = require('express');
const router = express.Router();
const {
  getUsers,
  getLogs,
  refreshDatabase,
  deleteCommodityData,
  uploadExcel
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Standard admin route protection
router.use(protect);
router.use(admin);

router.get('/users', getUsers);
router.get('/logs', getLogs);
router.post('/refresh', refreshDatabase);
router.delete('/commodities/:code', deleteCommodityData);
router.post('/upload', upload.single('file'), uploadExcel);

module.exports = router;
