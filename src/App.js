import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Import komponen halaman
import Login from './components/Login';
import KatalogData from './components/KatalogData';
import KatalogVisualisasi from './components/KatalogVisualisasi';
import BuatVisualisasi from './components/BuatVisualisasi';
import KatalogAnalisis from './components/KatalogAnalisis';
import BuatAnalisis from './components/BuatAnalisis';

// Import CSS
import './App.css';
import './components/Dashboard.css';

function App() {
  const { user, isLoading } = useAuth();

  // Component untuk redirect berdasarkan role
  const RoleBasedRedirect = () => {
    if (isLoading) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}>
          <div className="loading-spinner"></div>
        </div>
      );
    }

    if (!user) {
      return <Navigate to="/login" replace />;
    }

    // Redirect berdasarkan role
    if (user.role === 'EndUser') {
      return <Navigate to="/visualisasi" replace />;
    } else {
      return <Navigate to="/data" replace />;
    }
  };

  return (
    <div className="app-container">
      {/* Header - tampilkan hanya jika bukan halaman login */}
      <Routes>
        <Route path="/login" element={null} />
        <Route 
          path="*" 
          element={
            <header className="app-header">
              <div className="container">
                <div className="header-content">
                  <div className="logo-container">
                    <img src="/images.png" alt="Logo" />
                    <h1>Rusunami The Jarrdin@Cihampelas</h1>
                  </div>
                  <p className="header-subtitle">Dashboard Visualisasi dan Analisis Rusunami</p>
                </div>
              </div>
            </header>
          } 
        />
      </Routes>

      <main className="main-content">
        <Routes>
          {/* Route Login */}
          <Route path="/login" element={<Login />} />
          
          {/* Route Katalog Data - Hanya Admin dan Analis */}
          <Route 
            path="/data" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Analis']}>
                <KatalogData activeTabProp="data" />
              </ProtectedRoute>
            } 
          />
          
          {/* Route Katalog Visualisasi */}
          <Route 
            path="/visualisasi" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Analis', 'EndUser']}>
                <KatalogVisualisasi activeTabProp="visualisasi" />
              </ProtectedRoute>
            } 
          />
          
          {/* Route Buat Visualisasi - Admin & Analis only */}
          <Route 
            path="/visualisasi/buat" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Analis']}>
                <BuatVisualisasi />
              </ProtectedRoute>
            } 
          />
          
          {/* Route Katalog Analisis */}
          <Route 
            path="/analisis" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Analis', 'EndUser']}>
                <KatalogAnalisis activeTabProp="analisis" />
              </ProtectedRoute>
            } 
          />
          
          {/* Route Buat Analisis - Admin & Analis only */}
          <Route 
            path="/analisis/buat" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'Analis']}>
                <BuatAnalisis />
              </ProtectedRoute>
            } 
          />
          
          {/* Redirect root berdasarkan role */}
          <Route path="/" element={<RoleBasedRedirect />} />
          
          {/* Route 404 */}
          <Route 
            path="*" 
            element={
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column'
              }}>
                <h1>404 - Halaman Tidak Ditemukan</h1>
                <a href="/visualisasi" style={{ marginTop: '20px', color: '#1976d2' }}>
                  Kembali ke Dashboard
                </a>
              </div>
            } 
          />
        </Routes>
      </main>

      {/* Footer - tampilkan hanya jika bukan halaman login */}
      <Routes>
        <Route path="/login" element={null} />
        <Route 
          path="*" 
          element={
            <footer className="app-footer">
              <div className="container">
                <p>The Jarrdin@Cihampelas</p>
              </div>
            </footer>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;