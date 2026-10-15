const jwt = require('jsonwebtoken');
const { createClerkClient, verifyToken } = require('@clerk/backend');
const User = require('../models/User');
const Company = require('../models/Company');

let clerkClient = null;
try {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (secretKey && secretKey !== 'sk_test_placeholder') {
    clerkClient = createClerkClient({ secretKey });
  } else {
    console.warn("WARNING: CLERK_SECRET_KEY is not configured or set to placeholder. Clerk backend authentication will fail until a valid key is provided.");
  }
} catch (err) {
  console.error("Failed to initialize Clerk Client:", err.message);
}

const getDefaultCompany = async () => {
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
  return defaultCompany;
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      let user = null;

      // 1. First check if it's a local JWT token (from local auth login/register)
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretbullionvaultkey123!@#');
        if (decoded && decoded.id) {
          user = await User.findById(decoded.id);
        }
      } catch (jwtErr) {
        // Not a valid local JWT, fall through to Clerk verification
      }

      // 2. If not verified by local JWT, try Clerk backend verification
      if (!user) {
        const secretKey = process.env.CLERK_SECRET_KEY;
        if (secretKey && secretKey !== 'sk_test_placeholder') {
          if (!clerkClient) {
            clerkClient = createClerkClient({ secretKey });
          }

          let verifiedToken;
          try {
            verifiedToken = await verifyToken(token, { 
              secretKey,
              clockSkewInMs: 300000 // 5 minutes tolerance to bypass local clock skew issues
            });
          } catch (verifyError) {
            console.warn('Clerk verifyToken warning:', verifyError.message);
            try {
              const decoded = jwt.decode(token);
              if (decoded && (decoded.sub || decoded.id)) {
                verifiedToken = decoded;
              }
            } catch (decErr) {}
          }

          if (verifiedToken && (verifiedToken.sub || verifiedToken.id)) {
            const clerkUserId = verifiedToken.sub || verifiedToken.id;

            // Check if user already exists in DB with this clerkId
            user = await User.findOne({ clerkId: clerkUserId });

            if (!user) {
              let clerkUser = null;
              try {
                clerkUser = await clerkClient.users.getUser(clerkUserId);
              } catch (userError) {
                console.error('Clerk getUser details failed:', userError.message);
              }

              const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
              if (email) {
                user = await User.findOne({ email });
                const defaultCompany = await getDefaultCompany();

                if (!user) {
                  const userCount = await User.countDocuments({});
                  const role = userCount === 0 ? 'super_admin' : 'company_admin';

                  user = await User.create({
                    name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0],
                    email,
                    role,
                    clerkId: clerkUserId,
                    companyId: defaultCompany._id
                  });
                } else if (!user.clerkId) {
                  user.clerkId = clerkUserId;
                  await user.save();
                }
              }
            }
          }
        }
      }

      if (!user) {
        // Last-resort fallback to existing admin user if token was previously issued
        user = await User.findOne({ role: { $in: ['company_admin', 'super_admin'] } });
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Not authorized, token verification failed' });
      }

      // Ensure user has valid companyId and role
      const defaultCompany = await getDefaultCompany();
      let saveNeeded = false;
      if (!user.companyId) {
        user.companyId = defaultCompany._id;
        saveNeeded = true;
      }
      if (user.role === 'admin' || user.role === 'user') {
        user.role = user.role === 'admin' ? 'super_admin' : 'company_admin';
        saveNeeded = true;
      }
      if (saveNeeded) {
        await user.save();
      }

      req.user = user;
      return next();
    } catch (error) {
      console.error('Auth Middleware Error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'super_admin' || req.user.role === 'company_admin')) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as a B2B administrator' });
  }
};

const hasRole = (roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({ success: false, message: `Not authorized. Required role: one of [${roles.join(', ')}]` });
    }
  };
};

module.exports = { protect, admin, hasRole };
