import React, { createContext, useState, useContext, useEffect } from 'react';

// Membuat Context untuk autentikasi
const AuthContext = createContext();

// Provider untuk membungkus aplikasi
export const AuthProvider = ({ children }) => {
  // State untuk menyimpan data user yang login
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cek apakah ada user yang tersimpan di localStorage saat aplikasi dimuat
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  // Fungsi untuk login
  const login = async (username, password) => {
    try {
      const response = await fetch('http://localhost:5002/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login gagal');
      }

      const userData = await response.json();
      
      // Simpan data user ke state dan localStorage
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('Error saat login:', error);
      return { success: false, message: error.message };
    }
  };

  // Fungsi untuk logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Fungsi untuk cek apakah user memiliki role tertentu
  const hasRole = (allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  // Fungsi untuk cek apakah user adalah Admin
  const isAdmin = () => hasRole(['Admin']);

  // Fungsi untuk cek apakah user adalah Analis
  const isAnalis = () => hasRole(['Analis', 'Admin']);

  // Fungsi untuk cek apakah user adalah EndUser
  const isEndUser = () => hasRole(['EndUser', 'Admin']);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasRole,
        isAdmin,
        isAnalis,
        isEndUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Hook custom untuk menggunakan AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth harus digunakan dalam AuthProvider');
  }
  return context;
};