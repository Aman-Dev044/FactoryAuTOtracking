import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const [isReverificationRequired, setIsReverificationRequired] = useState(false);

  // Listen for the custom event from api.js
  useEffect(() => {
    const handleReverify = () => setIsReverificationRequired(true);
    window.addEventListener('reverificationRequired', handleReverify);
    return () => window.removeEventListener('reverificationRequired', handleReverify);
  }, []);

  // 5-Minute Inactivity Session Timeout
  useEffect(() => {
    const isAuthenticated = !!token && !!user;
    if (!isAuthenticated) return;

    let timeoutId;
    const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout();
        toast.error('Session expired due to inactivity.', { id: 'inactivity-toast' });
        window.location.href = '/login';
      }, INACTIVITY_TIMEOUT);
    };

    // Human activity events to listen to
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'click', 'touchstart'];

    // Register event listeners
    events.forEach(event => window.addEventListener(event, resetTimer));

    // Initialize timer
    resetTimer();

    // Clean up listeners on unmount or authentication state change
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [token, user]);

  // Load user on mount if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data.user);
        } catch (error) {
          console.error('Failed to load user:', error);
          if (error.response && error.response.status === 403 && error.response.data?.requiresReverification) {
            setIsReverificationRequired(true);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
          }
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);

    // SECURITY: Only platform admin can have an org selector.
    // For all other users, clear any stale selectedOrgId to prevent cross-org data leaks.
    const platformAdminEmail = process.env.REACT_APP_PLATFORM_ADMIN_EMAIL;
    if (userData.email !== platformAdminEmail) {
      localStorage.removeItem('selectedOrgId');
    }

    return res.data;
  };

  const signup = async (data) => {
    const res = await authAPI.register(data);
    return res.data;
  };

  const logout = () => {
    authAPI.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const forgotPassword = async (email) => {
    const res = await authAPI.forgotPassword(email);
    return res.data;
  };

  const resetPassword = async (resetToken, password) => {
    const res = await authAPI.resetPassword(resetToken, password);
    return res.data;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    isReverificationRequired,
    setIsReverificationRequired,
    login,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    setUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
