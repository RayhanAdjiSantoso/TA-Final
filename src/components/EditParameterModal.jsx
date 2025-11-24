import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';

// Komponen modal untuk edit parameter query (khusus untuk EndUser)
const EditParameterModal = ({ isOpen, onClose, visualisasi, onSave }) => {
  const { executeQuery } = useData();
  const [parameters, setParameters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract parameter dari query SQL dan load nilai default dari parameter_query
  useEffect(() => {
    if (isOpen && visualisasi && visualisasi.query_sql) {
      const paramPattern = /:(\w+)/g;
      const matches = [...visualisasi.query_sql.matchAll(paramPattern)];
      const uniqueParams = [...new Set(matches.map(m => m[1]))];
      
      // Parse parameter_query untuk mendapatkan nilai default
      let savedParams = {};
      if (visualisasi.parameter_query) {
        try {
          savedParams = typeof visualisasi.parameter_query === 'string'
            ? JSON.parse(visualisasi.parameter_query)
            : visualisasi.parameter_query;
          console.log('Loaded saved parameters:', savedParams);
        } catch (e) {
          console.error('Error parsing parameter_query:', e);
        }
      }
      
      // Set parameter dengan nilai default dari query sebelumnya
      const initialParams = uniqueParams.map(paramName => ({
        name: paramName,
        value: savedParams[paramName] || '' // Gunakan nilai yang tersimpan atau kosong
      }));
      
      console.log('Initial parameters:', initialParams);
      setParameters(initialParams);
    }
  }, [isOpen, visualisasi]);

  // Fungsi untuk mengubah nilai parameter
  const handleParameterChange = (index, value) => {
    const newParams = [...parameters];
    newParams[index].value = value;
    setParameters(newParams);
  };

  // Fungsi untuk menjalankan query dengan parameter baru
  const handleRunQuery = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Validasi: semua parameter harus diisi
      const emptyParams = parameters.filter(p => !p.value.trim());
      if (emptyParams.length > 0) {
        setError('Semua parameter harus diisi!');
        setIsLoading(false);
        return;
      }

      // Buat object parameter untuk query
      const params = {};
      parameters.forEach(param => {
        let value = String(param.value).trim();
        
        // Auto-convert format tanggal
        if (/^\d{8}$/.test(value)) {
          // YYYYMMDD -> YYYY-MM-DD
          value = `${value.substring(0,4)}-${value.substring(4,6)}-${value.substring(6,8)}`;
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
          // DD/MM/YYYY -> YYYY-MM-DD
          const [day, month, year] = value.split('/');
          value = `${year}-${month}-${day}`;
        }
        
        params[param.name] = value;
      });

      console.log('Executing query with params:', params);

      // Jalankan query dengan parameter baru
      const result = await executeQuery(visualisasi.query_sql, params);
      
      console.log('Query result:', result.length, 'rows');
      
      // Update parameter_query di database
      try {
        const updateResponse = await fetch(`http://localhost:5002/api/visualizations/${visualisasi.id_visualisasi}/parameters`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parameter_query: JSON.stringify(params)
          }),
        });

        if (!updateResponse.ok) {
          console.error('Failed to update parameters in database');
        } else {
          console.log('Parameters successfully saved to database');
        }
      } catch (err) {
        console.error('Error saving parameters:', err);
        // Tidak throw error, tetap lanjutkan karena query sudah berhasil
      }
      
      // Kirim hasil ke parent component
      onSave(result, params);
      
      // Tutup modal
      onClose();
    } catch (err) {
      console.error('Error executing query:', err);
      setError('Gagal menjalankan query: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ marginBottom: '1.5rem', color: '#333' }}>
          Edit Parameter Query
        </h2>

        <div style={{
          backgroundColor: '#f0f7ff',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <strong>Visualisasi:</strong> {visualisasi?.judul}
        </div>

        {parameters.length === 0 ? (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            borderRadius: '4px',
            marginBottom: '1rem'
          }}>
            Query ini tidak memiliki parameter yang dapat diedit.
          </div>
        ) : (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Parameter:</h3>
            {parameters.map((param, index) => (
              <div key={index} style={{ marginBottom: '1rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: '500',
                  color: '#333'
                }}>
                  {param.name}:
                </label>
                <input
                  type="text"
                  value={param.value}
                  onChange={(e) => handleParameterChange(index, e.target.value)}
                  placeholder={`Masukkan nilai untuk ${param.name} (format: YYYY-MM-DD)`}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                />
                <div style={{
                  fontSize: '0.85rem',
                  color: '#666',
                  marginTop: '0.25rem'
                }}>
                </div>
              </div>
            ))}
          </div>
        )}

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

        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f5f5f5',
              color: '#333',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            Batal
          </button>
          <button
            onClick={handleRunQuery}
            disabled={isLoading || parameters.length === 0}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: isLoading ? '#ccc' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (isLoading || parameters.length === 0) ? 'not-allowed' : 'pointer',
              fontSize: '1rem'
            }}
          >
            {isLoading ? 'Memproses...' : 'Jalankan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditParameterModal;