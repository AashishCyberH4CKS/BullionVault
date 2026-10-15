const express = require('express');
const router = express.Router();
const {
  getCompanyProfile,
  updateCompanyProfile,
  getCompanies,
  switchCompany
} = require('../controllers/companyController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/profile')
  .get(getCompanyProfile)
  .put(updateCompanyProfile);

router.get('/', getCompanies);
router.post('/switch', switchCompany);

module.exports = router;
