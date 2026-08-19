import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser, useClerk } from '@clerk/clerk-react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
        setLoading(false);
        return;
      }

      // Retrieve Clerk token and store in localStorage for axios interceptor
      const token = await getToken();
      localStorage.setItem('token', token);

      // Get profile from backend MongoDB
      const res = await authService.getProfile();
      if (res.success) {
        setUser(res.data);
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (err) {
      console.error('Clerk session validation failed:', err.message);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, [isLoaded, userId, clerkUser]);

  const login = async () => {
    // Auth handled by Clerk components
  };

  const register = async () => {
    // Auth handled by Clerk components
  };

  const logout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error("Error signing out from Clerk:", err.message);
    }
    localStorage.removeItem('token');
    setUser(null);
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

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile, checkAuthStatus, supabase: null }}>
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
