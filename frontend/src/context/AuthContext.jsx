import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('aarohan_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('aarohan_token'));
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'info') => {
    setToastMessage({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    const fetchMe = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          localStorage.setItem('aarohan_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.error('Failed to verify token:', err);
          logout();
        }
      }
      setLoading(false);
    };
    fetchMe();
  }, [token]);

  const studentLogin = async (arohanId, password) => {
    const res = await api.post('/auth/student-login', { arohanId, password });
    const { token: jwtToken, user: userData } = res.data;
    localStorage.setItem('aarohan_token', jwtToken);
    localStorage.setItem('aarohan_user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    showToast(`Welcome back, ${userData.arohanId}!`, 'success');
    return userData;
  };

  const adminLogin = async (username, password) => {
    const res = await api.post('/auth/admin-login', { username, password });
    const { token: jwtToken, user: userData } = res.data;
    localStorage.setItem('aarohan_token', jwtToken);
    localStorage.setItem('aarohan_user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    showToast(`Welcome Admin ${userData.name || userData.username}!`, 'success');
    return userData;
  };

  const teamLogin = async (loginId, password, termsAccepted) => {
    const res = await api.post('/auth/team-login', { loginId, password, termsAccepted });
    const { token: jwtToken, user: userData } = res.data;
    localStorage.setItem('aarohan_token', jwtToken);
    localStorage.setItem('aarohan_user', JSON.stringify(userData));
    setToken(jwtToken);
    setUser(userData);
    showToast(`Welcome, ${userData.loginId}!`, 'success');
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('aarohan_token');
    localStorage.removeItem('aarohan_user');
    setToken(null);
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  const updateUser = (data) => {
    setUser(prev => {
      const updated = { ...prev, ...data };
      localStorage.setItem('aarohan_user', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      studentLogin,
      adminLogin,
      teamLogin,
      logout,
      updateUser,
      showToast,
      toastMessage
    }}>
      {children}
      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 animate-bounce-short bg-slate-900/90 border-indigo-500/40 text-white">
          <div className={`w-3 h-3 rounded-full ${
            toastMessage.type === 'success' ? 'bg-emerald-400 glow-emerald' :
            toastMessage.type === 'error' ? 'bg-rose-500' : 'bg-indigo-400 glow-indigo'
          }`} />
          <span className="font-medium text-sm">{toastMessage.message}</span>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
