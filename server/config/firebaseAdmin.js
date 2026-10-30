const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

let firebaseApp = null;
let firebaseAuth = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'goldcommoditytracker';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }
    privateKey = privateKey.replace(/\\n/g, '\n');
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      privateKey = privateKey.trim() + '\n-----END PRIVATE KEY-----\n';
    }
  }

  if (clientEmail && privateKey) {
    const apps = getApps();
    const existing = apps.find(a => a.name === 'server-admin');
    firebaseApp = existing || initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey
      })
    }, 'server-admin');

    firebaseAuth = getAuth(firebaseApp);
    console.log('[Firebase Admin] Successfully initialized with Service Account for project:', projectId);
  } else {
    console.warn('[Firebase Admin] Service Account credentials not configured.');
  }
} catch (error) {
  console.error('[Firebase Admin] Initialization error:', error.message);
}

module.exports = {
  app: firebaseApp,
  auth: firebaseAuth,
  createCustomToken: async (uid, claims = {}) => {
    if (!firebaseAuth) throw new Error('Firebase Admin Auth not initialized');
    return firebaseAuth.createCustomToken(uid, claims);
  }
};
