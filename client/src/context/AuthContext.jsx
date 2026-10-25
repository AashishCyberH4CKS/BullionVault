import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from '@clerk/clerk-react';
import { signInWithCustomToken, signOut as firebaseSignOut } from 'firebase/auth';
import { auth as firebaseAuth, db as firebaseDb } from '../lib/firebase';
import api, { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { isLoaded, userId, getToken } = useClerkAuth();
  const { user: clerkUser } = useClerkUser();
  const { signOut } = useClerk();

  const checkAuthStatus = async () => {
    if (!isLoaded) return;

    try {
      if (!userId) {
        localStorage.removeItem('token');
        setUser(null);
        setFirebaseUser(null);
        if (firebaseAuth.currentUser) {
          try {
            await firebaseSignOut(firebaseAuth);
          } catch (e) {}
        }
        setLoading(false);
        return;
      }

      // Retrieve Clerk token and store in localStorage for axios interceptor
      const token = await getToken();
      localStorage.setItem('token', token);

      // Set user profile directly from Clerk
      const defaultUser = {
        id: userId,
        _id: userId,
        clerkId: userId,
        name: clerkUser?.fullName || clerkUser?.firstName || 'Valued Investor',
        email: clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses?.[0]?.emailAddress || '',
        role: 'super_admin',
        settings: {
          currency: 'INR',
          theme: 'gold',
          notifications: true
        }
      };

      try {
        const res = await authService.getProfile();
        if (res && res.success && res.data) {
          setUser({ ...defaultUser, ...res.data });
        } else {
          setUser(defaultUser);
        }
      } catch (err) {
        setUser(defaultUser);
      }

      // Secure Clerk-to-Firebase Authentication Synchronization
      // Tries to exchange Clerk token for a verified Firebase Custom Token
      try {
        const fbRes = await api.get('/auth/firebase-token');
        if (fbRes.data?.success && fbRes.data?.token) {
          const cred = await signInWithCustomToken(firebaseAuth, fbRes.data.token);
          setFirebaseUser(cred.user);
          console.log('[Firebase Auth] Authenticated as:', cred.user.uid);
        }
      } catch (fbErr) {
        console.info('[Firebase Auth Bridge] Notice:', fbErr.response?.data?.message || fbErr.message);
      }

    } catch (err) {
      console.error('Clerk session validation failed:', err.message);
      localStorage.removeItem('token');
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, [isLoaded, userId, clerkUser]);

  // Dynamically attach Clerk token to all outgoing axios requests
  useEffect(() => {
    if (!isLoaded || !userId) return;

    const interceptor = api.interceptors.request.use(
      async (config) => {
        try {
          const token = await getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (err) {
          console.error('Failed to attach Clerk token to request:', err);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [isLoaded, userId, getToken]);

  const login = async () => {
    // Auth handled by Clerk components
  };

  const register = async () => {
    // Auth handled by Clerk components
  };

  const logout = async (options = { redirectUrl: '/login' }) => {
    try {
      localStorage.removeItem('token');
      localStorage.clear();
      setUser(null);
      setFirebaseUser(null);
      if (firebaseAuth.currentUser) {
        try {
          await firebaseSignOut(firebaseAuth);
        } catch (e) {}
      }
      if (signOut) {
        await signOut(options);
      }
    } catch (err) {
      console.error("Error signing out from Clerk:", err.message);
    } finally {
      localStorage.removeItem('token');
      localStorage.clear();
      setUser(null);
      setFirebaseUser(null);
      const targetUrl = options?.redirectUrl || '/login';
      if (window.location.pathname !== targetUrl) {
        window.location.href = targetUrl;
      }
    }
  };

  const updateProfile = async (profileData) => {
    try {
      // Update name and other settings in backend MongoDB
      const res = await authService.updateProfile({
        name: profileData.name,
        settings: profileData.settings
      });

      if (res.success) {
        setUser(prev => ({
          ...prev,
          name: res.data.name,
          settings: res.data.settings
        }));

        // Also update name in Clerk user profile if available
        if (clerkUser) {
          try {
            const firstName = profileData.name.split(' ')[0] || '';
            const lastName = profileData.name.split(' ').slice(1).join(' ') || '';
            await clerkUser.update({
              firstName,
              lastName
            });
          } catch (clerkErr) {
            console.warn("Failed to sync name back to Clerk profile:", clerkErr.message);
          }
        }
        return res;
      }
    } catch (err) {
      throw err;
    }
  };

  const activeUserId = userId || user?.clerkId || user?._id || user?.id;

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      register, 
      logout, 
      updateProfile, 
      checkAuthStatus, 
      firebaseUser, 
      firebaseUid: activeUserId,
      firebaseAuth,
      firebaseDb
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
