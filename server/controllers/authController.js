const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretbullionvaultkey123!@#', {
    expiresIn: '30d',
  });
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // First user is super_admin, subsequent are company_admin
    const userCount = await User.countDocuments({});
    const role = userCount === 0 ? 'super_admin' : 'company_admin';

    const Company = require('../models/Company');
    let defaultCompany = await Company.findOne({ name: 'Atlas Bullion & Commodities Pvt. Ltd.' });
    if (!defaultCompany) {
      defaultCompany = await Company.create({
        name: 'Atlas Bullion & Commodities Pvt. Ltd.',
        industry: 'Bullion Trading & Asset Management',
        country: 'India',
        currency: 'INR',
        contactInfo: 'support@atlasbullion.com'
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      companyId: defaultCompany._id
    });

    if (user) {
      res.status(201).json({
        success: true,
        data: {
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          settings: user.settings,
          token: generateToken(user._id),
        }
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        success: true,
        data: {
          _id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          settings: user.settings,
          token: generateToken(user._id),
        }
      });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile / settings
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.name = req.body.name || user.name;
      if (req.body.settings) {
        user.settings = { ...user.settings, ...req.body.settings };
      }
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        data: {
          _id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          settings: updatedUser.settings,
        }
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mock request reset link / update password via key
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User with this email not found' });
    }

    if (newPassword) {
      user.password = newPassword;
      await user.save();
      return res.json({ success: true, message: 'Password updated successfully' });
    }

    res.json({ success: true, message: 'Verification password reset link processed. (Pass newPassword in request to update immediately)' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate Firebase custom token for authenticated user
// @route   GET /api/auth/firebase-token
// @access  Private
const getFirebaseCustomToken = async (req, res) => {
  try {
    const userId = req.user.clerkId || req.user.id.toString();
    const firebaseAdmin = require('../config/firebaseAdmin');

    if (firebaseAdmin && typeof firebaseAdmin.createCustomToken === 'function') {
      try {
        const customToken = await firebaseAdmin.createCustomToken(userId, {
          role: req.user.role,
          companyId: req.user.companyId ? req.user.companyId.toString() : null
        });
        return res.json({
          success: true,
          token: customToken,
          userId
        });
      } catch (adminErr) {
        return res.status(503).json({
          success: false,
          message: 'Firebase Admin custom token unavailable: ' + adminErr.message,
          userId
        });
      }
    } else {
      return res.status(503).json({
        success: false,
        message: 'Firebase Admin credentials not configured on server',
        userId
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  forgotPassword,
  getFirebaseCustomToken,
};
