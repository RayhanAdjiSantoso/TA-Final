import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';

const KatalogData = ({ activeTabProp }) => {
  const [activeTab, setActiveTab] = useState(activeTabProp || 'data');
  const navigate = useNavigate();
  const { isLoading, error } = useData();
  const { user, isAdmin } = useAuth();

  // State untuk upload CSV
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // State untuk database selection
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedDatabasesForUpload, setSelectedDatabasesForUpload] = useState([]);

  // State untuk tabel
  const [tablesData, setTablesData] = useState([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedTables, setSelectedTables] = useState([]);
  const [previewData, setPreviewData] = useState({});
  const [loadingPreview, setLoadingPreview] = useState({});

  // State untuk tampilan (katalog atau hidden)
  const [viewMode, setViewMode] = useState('catalog');
  
  // Initialize hiddenTables dari localStorage
  const [hiddenTables, setHiddenTables] = useState(() => {
    try {
      const saved = localStorage.getItem('hiddenTables');
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed;
    } catch (error) {
      console.error('Error loading initial hidden tables:', error);
      return [];
    }
  });

  // State untuk kelola database
  const [dbForm, setDbForm] = useState({
    name: '',
    type: 'postgresql',
    database: '',
    user: '',
    password: ''
  });
  const [dbFormStatus, setDbFormStatus] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSavingDatabase, setIsSavingDatabase] = useState(false);

  // Simpan hidden tables ke localStorage setiap kali berubah
  useEffect(() => {
    try {
      localStorage.setItem('hiddenTables', JSON.stringify(hiddenTables));
    } catch (error) {
      console.error('Error saving hidden tables:', error);
    }
  }, [hiddenTables]);

  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  // Fungsi untuk mengambil daftar database yang tersedia
  const fetchAvailableDatabases = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/databases');
      if (response.ok) {
        const databases = await response.json();
        setAvailableDatabases(databases);
        if (databases.length > 0 && !selectedDatabase) {
          setSelectedDatabase(databases[0].value);
        }
      }
    } catch (error) {
      console.error('Error fetching databases:', error);
    }
  };

  useEffect(() => {
    fetchAvailableDatabases();
  }, []);

  // Fetch tabel dan row count saat database berubah
  useEffect(() => {
    const fetchTablesWithRowCount = async () => {
      if (!selectedDatabase) return;

      setLoadingTables(true);
      setSelectedTables([]);
      setPreviewData({});

      try {
        const response = await fetch(`http://localhost:5002/api/database/${selectedDatabase}/tables`);
        if (response.ok) {
          const tables = await response.json();
          
          const tablesWithCount = await Promise.all(
            tables.map(async (tableName) => {
              try {
                const countResponse = await fetch(
                  `http://localhost:5002/api/database/${selectedDatabase}/table/${tableName}/count`
                );
                const countData = await countResponse.json();
                const isHidden = hiddenTables.includes(tableName);
                
                return {
                  name: tableName,
                  rowCount: countData.count || 0,
                  isHidden: isHidden
                };
              } catch (err) {
                console.error(`Error fetching count for ${tableName}:`, err);
                return {
                  name: tableName,
                  rowCount: 0,
                  isHidden: hiddenTables.includes(tableName)
                };
              }
            })
          );

          setTablesData(tablesWithCount);
        }
      } catch (error) {
        console.error('Error fetching tables:', error);
        setTablesData([]);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTablesWithRowCount();
  }, [selectedDatabase, hiddenTables]);

  // Handle checkbox selection
  const handleTableSelect = async (tableName) => {
    const isSelected = selectedTables.includes(tableName);

    if (isSelected) {
      setSelectedTables(selectedTables.filter(t => t !== tableName));
      const newPreviewData = { ...previewData };
      delete newPreviewData[tableName];
      setPreviewData(newPreviewData);
    } else {
      setSelectedTables([...selectedTables, tableName]);
      setLoadingPreview({ ...loadingPreview, [tableName]: true });

      try {
        const response = await fetch(
          `http://localhost:5002/api/database/${selectedDatabase}/data/${tableName}?limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          const limitedData = data.slice(0, 10);
          setPreviewData({
            ...previewData,
            [tableName]: limitedData
          });
        }
      } catch (error) {
        console.error(`Error fetching preview for ${tableName}:`, error);
      } finally {
        setLoadingPreview({ ...loadingPreview, [tableName]: false });
      }
    }
  };

  // Handle hide table
  const handleHideTable = (tableName) => {
    if (window.confirm(`Apakah Anda yakin ingin menyembunyikan tabel "${tableName}"?`)) {
      const newHiddenTables = [...hiddenTables, tableName];
      setHiddenTables(newHiddenTables);
      
      setSelectedTables(selectedTables.filter(t => t !== tableName));
      const newPreviewData = { ...previewData };
      delete newPreviewData[tableName];
      setPreviewData(newPreviewData);
    }
  };

  // Handle unhide table
  const handleUnhideTable = (tableName) => {
    const newHiddenTables = hiddenTables.filter(t => t !== tableName);
    setHiddenTables(newHiddenTables);
  };

  // Get columns from data
  const getColumns = (data) => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  };

  // File upload handlers
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadStatus('');
    } else {
      setUploadStatus('Hanya file CSV yang diperbolehkan!');
      setSelectedFile(null);
    }
  };

  const handleDatabaseCheckbox = (dbValue) => {
    setSelectedDatabasesForUpload(prev => {
      if (prev.includes(dbValue)) {
        return prev.filter(db => db !== dbValue);
      } else {
        return [...prev, dbValue];
      }
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus('Pilih file terlebih dahulu!');
      return;
    }

    if (selectedDatabasesForUpload.length === 0) {
      setUploadStatus('Pilih minimal satu database untuk upload!');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Mengunggah...');

    const formData = new FormData();
    formData.append('file', selectedFile);

    // Pastikan semua field database terkirim
    const selectedDbConfigs = availableDatabases
      .filter(db => selectedDatabasesForUpload.includes(db.value))
      .map(db => ({
        id_database: db.id_database,
        nama_database: db.nama_database,
        label: db.label || db.name,
        jenis: db.jenis,
        username: db.username,
        password: db.password,
        host: db.host || 'localhost',
        port: db.port || (db.jenis === 'mysql' ? 3306 : 5432)
      }));

    console.log('Sending database configs:', selectedDbConfigs.map(db => ({
      ...db,
      password: '***' // Hide password in console
    })));

    formData.append('databases', JSON.stringify(selectedDbConfigs));

    try {
      const response = await fetch('http://localhost:5002/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus(`Berhasil! File diunggah ke ${result.results.length} database.`);
        setSelectedFile(null);
        setSelectedDatabasesForUpload([]);

        // Refresh tabel setelah upload
        const tablesResponse = await fetch(`http://localhost:5002/api/database/${selectedDatabase}/tables`);
        if (tablesResponse.ok) {
          const tables = await tablesResponse.json();
          const tablesWithCount = await Promise.all(
            tables.map(async (tableName) => {
              try {
                const countResponse = await fetch(
                  `http://localhost:5002/api/database/${selectedDatabase}/table/${tableName}/count`
                );
                const countData = await countResponse.json();
                return {
                  name: tableName,
                  rowCount: countData.count || 0,
                  isHidden: hiddenTables.includes(tableName)
                };
              } catch (err) {
                return {
                  name: tableName,
                  rowCount: 0,
                  isHidden: hiddenTables.includes(tableName)
                };
              }
            })
          );
          setTablesData(tablesWithCount);
        }

        if (result.errors && result.errors.length > 0) {
          const errorDbs = result.errors.map(e => e.database).join(', ');
          setUploadStatus(prev => `${prev} Gagal di: ${errorDbs}`);
        }
      } else {
        setUploadStatus(`Error: ${result.error}`);
        if (result.errors) {
          console.error('Upload errors:', result.errors);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('Gagal mengunggah file!');
    } finally {
      setIsUploading(false);
    }
  };

  // Handler untuk form database
  const handleDbFormChange = (field, value) => {
    setDbForm(prev => ({
      ...prev,
      [field]: value
    }));
    setDbFormStatus('');
  };

  // Handler untuk test koneksi database
  const handleTestConnection = async () => {
    // Validasi input
    if (!dbForm.type || !dbForm.database || !dbForm.user || !dbForm.password) {
      setDbFormStatus('Semua field wajib diisi!');
      return;
    }

    setIsTestingConnection(true);
    setDbFormStatus('Mengetes koneksi...');

    try {
      const response = await fetch('http://localhost:5002/api/database/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: dbForm.type,
          database: dbForm.database,
          user: dbForm.user,
          password: dbForm.password
        }),
      });

      const result = await response.json();

      if (result.success) {
        setDbFormStatus(`✓ ${result.message} (${result.details.host}:${result.details.port})`);
      } else {
        setDbFormStatus(`✗ ${result.error}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setDbFormStatus('✗ Gagal mengetes koneksi!');
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Handler untuk simpan database
  const handleSaveDatabase = async () => {
    // Validasi input
    if (!dbForm.name || !dbForm.type || !dbForm.database || !dbForm.user || !dbForm.password) {
      setDbFormStatus('Semua field wajib diisi!');
      return;
    }

    setIsSavingDatabase(true);
    setDbFormStatus('Menyimpan database...');

    try {
      const response = await fetch('http://localhost:5002/api/database/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dbForm),
      });

      const result = await response.json();

      if (result.success) {
        setDbFormStatus(`✓ ${result.message}`);
        
        // Reset form
        setDbForm({
          name: '',
          type: 'postgresql',
          database: '',
          user: '',
          password: ''
        });

        // Refresh list database
        await fetchAvailableDatabases();
      } else {
        setDbFormStatus(`✗ ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving database:', error);
      setDbFormStatus('✗ Gagal menyimpan database!');
    } finally {
      setIsSavingDatabase(false);
    }
  };

  // Handler untuk hapus database
  const handleDeleteDatabase = async (dbValue, dbName) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus database "${dbName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5002/api/database/${dbValue}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        alert(`Database "${dbName}" berhasil dihapus!`);
        
        // Jika database yang dihapus sedang dipilih, pilih database pertama
        if (selectedDatabase === dbValue && availableDatabases.length > 1) {
          setSelectedDatabase(availableDatabases[0].value);
        }

        // Refresh list database
        await fetchAvailableDatabases();
      } else {
        alert(`Gagal menghapus database: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting database:', error);
      alert('Gagal menghapus database!');
    }
  };

  // Filter tables berdasarkan view mode
  const visibleTables = viewMode === 'catalog'
    ? tablesData.filter(t => !hiddenTables.includes(t.name))
    : tablesData.filter(t => hiddenTables.includes(t.name));

  return (
    <div className="dashboard-container">
      <Sidebar activeTabProp={activeTab}>
        {isLoading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Memuat data...</p>
          </div>
        ) : error ? (
          <div className="error">
            <i className="fas fa-exclamation-triangle"></i> Error: {error}
          </div>
        ) : (
          <div className="dashboard-content">
            <div className="data-explorer">
              <h1>Katalog Data</h1>

              {/* Database Selection */}
              <div className="database-viewing-section" style={{ marginBottom: '20px' }}>
                <h2>Pilih Database untuk Dilihat</h2>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                  <label style={{ marginRight: '10px', fontWeight: 'bold' }}>
                    Database:
                  </label>
                  <select
                    value={selectedDatabase}
                    onChange={(e) => setSelectedDatabase(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      backgroundColor: 'white',
                      minWidth: '200px'
                    }}
                  >
                    {availableDatabases.map((database, index) => (
                      <option key={index} value={database.value}>
                        {database.name} ({database.host}:{database.port || 'default'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Section - Hanya untuk Admin */}
              {isAdmin() && (
                <>
                  <div className="upload-section">
                    <h2>Unggah Data</h2>
                    <div className="upload-container">
                      <p style={{ marginBottom: '10px', fontWeight: '500' }}>
                        Pilih Database untuk Upload:{' '}
                        <button
                          onClick={() => {
                            document.getElementById('db-modal').style.display = 'block';
                          }}
                          style={{
                            padding: '5px 15px',
                            backgroundColor: '#2196F3',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Tampilkan Pilihan Database
                        </button>
                      </p>

                      <div
                        id="db-modal"
                        style={{
                          display: 'none',
                          position: 'fixed',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          zIndex: 1000
                        }}
                        onClick={(e) => {
                          if (e.target.id === 'db-modal') {
                            e.target.style.display = 'none';
                          }
                        }}
                      >
                        <div
                          style={{
                            backgroundColor: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            maxWidth: '500px',
                            margin: '100px auto'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <h3>Pilih Database untuk Upload</h3>
                          {availableDatabases.map((db, index) => (
                            <div key={index} style={{ marginBottom: '8px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedDatabasesForUpload.includes(db.value)}
                                  onChange={() => handleDatabaseCheckbox(db.value)}
                                  style={{ marginRight: '8px' }}
                                />
                                <span>
                                  {db.name} ({db.host}:{db.port || 'default'})
                                </span>
                              </label>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              document.getElementById('db-modal').style.display = 'none';
                            }}
                            style={{
                              marginTop: '15px',
                              padding: '8px 20px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer'
                            }}
                          >
                            Tutup
                          </button>
                        </div>
                      </div>

                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="upload-input"
                        disabled={isUploading}
                      />

                      {selectedFile && (
                        <div style={{ marginTop: '15px' }}>
                          <p style={{ fontWeight: '500', marginBottom: '10px' }}>
                            File dipilih: <strong>{selectedFile.name}</strong>
                          </p>

                          <button
                            onClick={handleUpload}
                            disabled={isUploading || selectedDatabasesForUpload.length === 0}
                            className="upload-button"
                          >
                            {isUploading ? 'Mengunggah...' : `Unggah ke ${selectedDatabasesForUpload.length} Database`}
                          </button>
                        </div>
                      )}

                      {uploadStatus && (
                        <div
                          className={uploadStatus.includes('Berhasil') ? 'save-success-message' : 'input-error-message'}
                          style={{ marginTop: '10px' }}
                        >
                          {uploadStatus}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Kelola Koneksi Database Section - Hanya untuk Admin */}
                  <div className="upload-section" style={{ marginTop: '30px' }}>
                    <h2>Kelola Koneksi Database</h2>
                    
                    {/* Form Tambah Database */}
                    <div className="upload-container" style={{ marginBottom: '20px' }}>
                      <h3 style={{ marginBottom: '15px', fontSize: '1.1rem' }}>Tambah Database Baru</h3>
                      
                      <div style={{ display: 'grid', gap: '15px' }}>
                        {/* Nama Database (Label) */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Nama Database (Label): <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={dbForm.name}
                            onChange={(e) => handleDbFormChange('name', e.target.value)}
                            placeholder="Contoh: PostgreSQL Keuangan"
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                        </div>

                        {/* Jenis Database */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Jenis Database: <span style={{ color: 'red' }}>*</span>
                          </label>
                          <select
                            value={dbForm.type}
                            onChange={(e) => handleDbFormChange('type', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          >
                            <option value="postgresql">PostgreSQL (Port: 5432)</option>
                            <option value="mysql">MySQL (Port: 3306)</option>
                          </select>
                        </div>

                        {/* Nama Database */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Nama Database: <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={dbForm.database}
                            onChange={(e) => handleDbFormChange('database', e.target.value)}
                            placeholder="Contoh: db_keuangan"
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                        </div>

                        {/* Username */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Username: <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="text"
                            value={dbForm.user}
                            onChange={(e) => handleDbFormChange('user', e.target.value)}
                            placeholder="Contoh: admin"
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                        </div>

                        {/* Password */}
                        <div>
                          <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                            Password: <span style={{ color: 'red' }}>*</span>
                          </label>
                          <input
                            type="password"
                            value={dbForm.password}
                            onChange={(e) => handleDbFormChange('password', e.target.value)}
                            placeholder="Masukkan password database"
                            style={{
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ddd'
                            }}
                          />
                        </div>

                        {/* Info Host dan Port */}
                        <div style={{
                          padding: '10px',
                          backgroundColor: '#e3f2fd',
                          borderRadius: '4px',
                          fontSize: '0.9rem'
                        }}>
                          <p style={{ margin: 0 }}>
                            <strong>Host:</strong> localhost (tetap)
                          </p>
                          <p style={{ margin: '5px 0 0 0' }}>
                            <strong>Port:</strong> {dbForm.type === 'postgresql' ? '5432' : '3306'} (otomatis)
                          </p>
                        </div>

                        {/* Tombol Test dan Simpan */}
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={handleTestConnection}
                            disabled={isTestingConnection || !dbForm.type || !dbForm.database || !dbForm.user || !dbForm.password}
                            style={{
                              flex: 1,
                              padding: '10px',
                              backgroundColor: '#ff9800',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isTestingConnection ? 'not-allowed' : 'pointer',
                              opacity: isTestingConnection ? 0.6 : 1
                            }}
                          >
                            {isTestingConnection ? 'Mengetes...' : 'Test Koneksi'}
                          </button>

                          <button
                            onClick={handleSaveDatabase}
                            disabled={isSavingDatabase || !dbForm.name || !dbForm.type || !dbForm.database || !dbForm.user || !dbForm.password}
                            style={{
                              flex: 1,
                              padding: '10px',
                              backgroundColor: '#4CAF50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: isSavingDatabase ? 'not-allowed' : 'pointer',
                              opacity: isSavingDatabase ? 0.6 : 1
                            }}
                          >
                            {isSavingDatabase ? 'Menyimpan...' : 'Simpan Database'}
                          </button>
                        </div>

                        {/* Status Message */}
                        {dbFormStatus && (
                          <div
                            className={dbFormStatus.includes('✓') ? 'save-success-message' : 'input-error-message'}
                          >
                            {dbFormStatus}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* List Database yang Tersedia */}
                    <div className="upload-container">
                      <h3 style={{ marginBottom: '15px', fontSize: '1.1rem' }}>Database yang Tersedia</h3>
                      
                      {availableDatabases.length === 0 ? (
                        <p style={{ color: '#666', fontStyle: 'italic' }}>Belum ada database tersedia</p>
                      ) : (
                        <div className="data-table-container">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Nama</th>
                                <th>Jenis</th>
                                <th>Database</th>
                                <th style={{ width: '100px', textAlign: 'center' }}>Aksi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {availableDatabases.map((db, index) => (
                                <tr key={index}>
                                  <td>{db.name}</td>
                                  <td>
                                    <span style={{
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      backgroundColor: db.type === 'postgresql' ? '#e3f2fd' : '#fff3e0',
                                      color: db.type === 'postgresql' ? '#1976d2' : '#f57c00',
                                      fontSize: '0.85rem',
                                      fontWeight: '500'
                                    }}>
                                      {db.type.toUpperCase()}
                                    </span>
                                  </td>
                                  <td>{db.database}</td>
                                  <td style={{ textAlign: 'center' }}>
                                    <button
                                      onClick={() => handleDeleteDatabase(db.value, db.name)}
                                      className="delete-button"
                                      style={{ fontSize: '0.85rem' }}
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Toggle View Mode */}
              <div style={{ marginBottom: '20px', textAlign: 'right' }}>
                {viewMode === 'catalog' ? (
                  <button
                    onClick={() => setViewMode('hidden')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#ff9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <i className="fas fa-eye-slash" style={{ marginRight: '8px' }}></i>
                    Disembunyikan ({hiddenTables.length})
                  </button>
                ) : (
                  <button
                    onClick={() => setViewMode('catalog')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    <i className="fas fa-database" style={{ marginRight: '8px' }}></i>
                    Katalog Data
                  </button>
                )}
              </div>

              {/* Tables Catalog */}
              <div className="catalog-section">
                <h2>
                  {viewMode === 'catalog'
                    ? `Katalog Data - ${availableDatabases.find(db => db.value === selectedDatabase)?.name || ''}`
                    : 'Tabel yang Disembunyikan'}
                </h2>

                {loadingTables ? (
                  <div style={{ padding: '20px', textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <p>Memuat daftar tabel...</p>
                  </div>
                ) : visibleTables.length === 0 ? (
                  <div className="no-data-message">
                    {viewMode === 'catalog'
                      ? 'Tidak ada tabel di database ini'
                      : 'Tidak ada tabel yang disembunyikan'}
                  </div>
                ) : (
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          {viewMode === 'catalog' && <th style={{ width: '50px' }}>Pilih</th>}
                          <th>Nama File</th>
                          <th style={{ width: '150px' }}>Jumlah Baris</th>
                          <th style={{ width: '150px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTables.map((table) => (
                          <tr key={table.name}>
                            {viewMode === 'catalog' && (
                              <td style={{ textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedTables.includes(table.name)}
                                  onChange={() => handleTableSelect(table.name)}
                                />
                              </td>
                            )}
                            <td>{table.name}</td>
                            <td style={{ textAlign: 'center' }}>{table.rowCount.toLocaleString()}</td>
                            <td style={{ textAlign: 'center' }}>
                              {viewMode === 'catalog' ? (
                                <button
                                  className="delete-button"
                                  onClick={() => handleHideTable(table.name)}
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  <i className="fas fa-eye-slash" style={{ marginRight: '5px' }}></i>
                                  Sembunyikan
                                </button>
                              ) : (
                                <button
                                  className="view-button"
                                  onClick={() => handleUnhideTable(table.name)}
                                  style={{ fontSize: '0.85rem' }}
                                >
                                  <i className="fas fa-eye" style={{ marginRight: '5px' }}></i>
                                  Tampilkan
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Preview Data */}
              {selectedTables.length > 0 && viewMode === 'catalog' && (
                <div className="results-section" style={{ marginTop: '30px' }}>
                  <h2>Preview Data</h2>
                  {selectedTables.map((tableName) => (
                    <div key={tableName} style={{ marginBottom: '40px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '10px'
                      }}>
                        <h3 style={{ margin: 0 }}>{tableName}</h3>
                        {previewData[tableName] && (
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: '#666',
                            fontStyle: 'italic'
                          }}>
                            Menampilkan {previewData[tableName].length} dari {
                              tablesData.find(t => t.name === tableName)?.rowCount || 0
                            } baris
                          </span>
                        )}
                      </div>
                      
                      {loadingPreview[tableName] ? (
                        <div style={{ padding: '20px', textAlign: 'center' }}>
                          <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                          <p>Memuat preview data...</p>
                        </div>
                      ) : previewData[tableName] && previewData[tableName].length > 0 ? (
                        <div className="table-scroll">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th style={{ width: '50px', textAlign: 'center' }}>#</th>
                                {getColumns(previewData[tableName]).map((col, i) => (
                                  <th key={i}>{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {previewData[tableName].map((row, i) => (
                                <tr key={i}>
                                  <td style={{ textAlign: 'center', color: '#999' }}>{i + 1}</td>
                                  {getColumns(previewData[tableName]).map((col, j) => (
                                    <td key={j}>{row[col]}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="no-data-message">Tidak ada data untuk preview</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Sidebar>
    </div>
  );
};

export default KatalogData;