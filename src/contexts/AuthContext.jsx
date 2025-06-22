
import React, { createContext, useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // useNavigate y useLocation no deben llamarse aquí directamente si AuthProvider no está dentro de un Router.
  // Se pasarán a login/logout o se usarán en componentes que sí estén dentro del Router.

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to parse stored user:", error);
        localStorage.removeItem('currentUser');
      }
    }
    setLoading(false);
  }, []);

  const login = (userData, navigate) => { // Pasamos navigate como argumento
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setUser(userData);
    
    if (userData.role === 'professional') {
      navigate('/profesionales/dashboard');
    } else if (userData.role === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/'); 
    }
  };

  const logout = (navigate) => { // Pasamos navigate como argumento
    localStorage.removeItem('currentUser');
    setUser(null);
    navigate('/login');
  };

  const updateUser = (userData) => {
    const updatedUser = { ...user, ...userData };
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser, setLoading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
