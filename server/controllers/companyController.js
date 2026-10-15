const Company = require('../models/Company');
const User = require('../models/User');

// @desc    Get current user's company profile
// @route   GET /api/companies/profile
// @access  Private
const getCompanyProfile = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(404).json({ success: false, message: 'User does not belong to any organization' });
    }
    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    res.json({ success: true, data: company });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update current user's company profile
// @route   PUT /api/companies/profile
// @access  Private (Admin only)
const updateCompanyProfile = async (req, res) => {
  try {
    if (!req.user.companyId) {
      return res.status(400).json({ success: false, message: 'User does not belong to any organization' });
    }
    
    // Auth check: only company_admin or super_admin can update company profile
    if (req.user.role !== 'company_admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update company profile' });
    }

    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const { name, industry, country, currency, contactInfo, logo } = req.body;
    
    company.name = name || company.name;
    company.industry = industry || company.industry;
    company.country = country || company.country;
    company.currency = currency || company.currency;
    company.contactInfo = contactInfo || company.contactInfo;
    company.logo = logo || company.logo;

    const updatedCompany = await company.save();
    res.json({ success: true, data: updatedCompany });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all companies (for B2B switching demo)
// @route   GET /api/companies
// @access  Private
const getCompanies = async (req, res) => {
  try {
    const companies = await Company.find({});
    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Switch user's current company context (Multi-tenant demo)
// @route   POST /api/companies/switch
// @access  Private
const switchCompany = async (req, res) => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ success: false, message: 'Please add a company ID' });
    }

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const user = await User.findById(req.user.id);
    user.companyId = companyId;
    
    // For demo purposes, we automatically make the user a company_admin of the switched company 
    // if they switch, so they have full management rights of the new tenant data
    if (user.role !== 'super_admin') {
      user.role = 'company_admin';
    }
    
    await user.save();

    res.json({ success: true, message: `Switched context successfully to ${company.name}`, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCompanyProfile,
  updateCompanyProfile,
  getCompanies,
  switchCompany
};
