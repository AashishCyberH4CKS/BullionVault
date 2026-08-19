const { createClerkClient, verifyToken } = require('@clerk/backend');
const User = require('../models/User');

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

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Check if Clerk is initialized
      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey || secretKey === 'sk_test_placeholder') {
        return res.status(500).json({
          success: false,
          message: 'Clerk Secret Key is not configured on the backend server. Please add CLERK_SECRET_KEY to your server/.env file.'
        });
      }

      if (!clerkClient) {
        clerkClient = createClerkClient({ secretKey });
      }

      // Verify the session token using Clerk Backend SDK
      let verifiedToken;
      try {
        verifiedToken = await verifyToken(token, { secretKey });
      } catch (verifyError) {
        console.error('Clerk token verification failed:', verifyError.message);
        return res.status(401).json({ success: false, message: 'Not authorized, token verification failed' });
      }

      const clerkUserId = verifiedToken.sub;

      // Fetch user profile details from Clerk to sync name/email
      let clerkUser;
      try {
        clerkUser = await clerkClient.users.getUser(clerkUserId);
      } catch (userError) {
        console.error('Clerk getUser details failed:', userError.message);
        return res.status(401).json({ success: false, message: 'Not authorized, user details not found in Clerk' });
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        return res.status(400).json({ success: false, message: 'User does not have an email address associated with Clerk' });
      }

      // Find or create MongoDB user mapping
      let mongoUser = await User.findOne({ email });

      if (!mongoUser) {
        const userCount = await User.countDocuments({});
        const role = userCount === 0 ? 'admin' : 'user';

        mongoUser = await User.create({
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || email.split('@')[0],
          email,
          role,
          clerkId: clerkUserId
        });
      } else if (!mongoUser.clerkId) {
        // Link existing user if clerkId is missing
        mongoUser.clerkId = clerkUserId;
        await mongoUser.save();
      }

      req.user = mongoUser;
      return next();
    } catch (error) {
      console.error('Clerk Auth Middleware Error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};

module.exports = { protect, admin };
