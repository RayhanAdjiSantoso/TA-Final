import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Komponen untuk melindungi route berdasarkan role
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading, hasRole } = useAuth();

  // Tampilkan loading saat cek autentikasi
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="loading-spinner"></div>
        <p>Memuat...</p>
      </div>
    );
  }

  // Redirect ke login jika user belum login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Tampilkan pesan error jika user tidak memiliki akses
  if (allowedRoles && !hasRole(allowedRoles)) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: '#ffebee',
          color: '#c62828',
          padding: '2rem',
          borderRadius: '8px',
          maxWidth: '500px',
          textAlign: 'center',
          border: '2px solid #ef5350'
        }}>
          <h2 style={{ marginBottom: '1rem' }}>⚠️ Akses Ditolak</h2>
          <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            Mohon maaf, Anda tidak memiliki izin untuk mengakses halaman ini!
          </p>
          <p style={{ fontSize: '0.9rem', color: '#666' }}>
            Role Anda: <strong>{user.role}</strong><br />
            Akses diperlukan: <strong>{allowedRoles.join(', ')}</strong>
          </p>
          <button
            onClick={() => window.history.back()}
            style={{
              marginTop: '1.5rem',
              padding: '10px 20px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // Tampilkan children jika user memiliki akses
  return children;
};

export default ProtectedRoute;