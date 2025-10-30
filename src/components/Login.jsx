import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // State untuk form login
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fungsi untuk menangani submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validasi input
    if (!username || !password) {
      setError('Username dan password harus diisi!');
      setIsLoading(false);
      return;
    }

    // Proses login
    const result = await login(username, password);
    
    if (result.success) {
      // Redirect berdasarkan role user
      if (result.user.role === 'EndUser') {
        // EndUser langsung ke Katalog Visualisasi
        navigate('/visualisasi');
      } else {
        // Admin dan Analis ke Katalog Data
        navigate('/data');
      }
    } else {
      setError(result.message || 'Login gagal. Periksa username dan password Anda.');
    }
    
    setIsLoading(false);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      width: '100vw',
      backgroundColor: '#f5f5f5',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      overflow: 'auto'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2.5rem',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        width: '100%',
        maxWidth: '400px',
        margin: '20px'
      }}>
        <h2 style={{
          textAlign: 'center',
          marginBottom: '1rem',
          color: '#1976d2',
          fontSize: '1.8rem'
        }}>
          Login
        </h2>
        
        <p style={{
          textAlign: 'center',
          marginBottom: '2rem',
          color: '#666',
          fontSize: '0.95rem'
        }}>
          Sistem Visualisasi dan Analisis IPL
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333'
            }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333'
            }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '0.75rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: isLoading ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              fontWeight: '500',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s'
            }}
          >
            {isLoading ? 'Memproses...' : 'Login'}
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#f0f7ff',
          borderRadius: '4px',
          fontSize: '0.85rem',
          color: '#555'
        }}>
          <strong>Akun Demo:</strong>
          <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', marginBottom: 0 }}>
            <li>Admin: admin1 / admin123</li>
            <li>Analis: analis1 / analis123</li>
            <li>EndUser: enduser1 / user123</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Login;