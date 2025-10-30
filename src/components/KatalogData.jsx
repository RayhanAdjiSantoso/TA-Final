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
  
  // PERBAIKAN: Initialize hiddenTables langsung dari localStorage
  const [hiddenTables, setHiddenTables] = useState(() => {
    try {
      const saved = localStorage.getItem('hiddenTables');
      const parsed = saved ? JSON.parse(saved) : [];
      console.log('Initial load hiddenTables:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error loading initial hidden tables:', error);
      return [];
    }
  });

  // Simpan hidden tables ke localStorage setiap kali berubah
  useEffect(() => {
    try {
      localStorage.setItem('hiddenTables', JSON.stringify(hiddenTables));
      console.log('Saved hidden tables to localStorage:', hiddenTables);
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
        if (databases.length > 0) {
          setSelectedDatabase(databases[0].value);
        }
      }
    } catch (error) {
      console.error('Error fetching databases:', error);
      const defaultDatabases = [
        { name: 'PostgreSQL Primary', value: 'postgresql_primary', host: 'localhost', port: 5432 },
        { name: 'MySQL Secondary', value: 'mysql_secondary', host: 'localhost', port: 3306 }
      ];
      setAvailableDatabases(defaultDatabases);
      setSelectedDatabase(defaultDatabases[0].value);
    }
  };

  useEffect(() => {
    fetchAvailableDatabases();
  }, []);

  // Fetch tabel dan row count saat database berubah
  useEffect(() => {
    const fetchTablesWithRowCount = async () => {
      if (!selectedDatabase) return;

      console.log('Fetching tables with hiddenTables:', hiddenTables);

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
                console.log(`Table ${tableName} isHidden:`, isHidden);
                
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

          console.log('Tables with count:', tablesWithCount);
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
  }, [selectedDatabase, hiddenTables]); // PENTING: hiddenTables sebagai dependency

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
      console.log('Hiding table:', tableName);
      const newHiddenTables = [...hiddenTables, tableName];
      setHiddenTables(newHiddenTables);
      console.log('New hiddenTables:', newHiddenTables);
      
      setSelectedTables(selectedTables.filter(t => t !== tableName));
      const newPreviewData = { ...previewData };
      delete newPreviewData[tableName];
      setPreviewData(newPreviewData);
    }
  };

  // Handle unhide table
  const handleUnhideTable = (tableName) => {
    console.log('Unhiding table:', tableName);
    const newHiddenTables = hiddenTables.filter(t => t !== tableName);
    setHiddenTables(newHiddenTables);
    console.log('New hiddenTables:', newHiddenTables);
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

    const selectedDbConfigs = availableDatabases.filter(db =>
      selectedDatabasesForUpload.includes(db.value)
    );
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
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus('Gagal mengunggah file!');
    } finally {
      setIsUploading(false);
    }
  };

  // Filter tables based on view mode
  const visibleTables = viewMode === 'catalog'
    ? tablesData.filter(t => !hiddenTables.includes(t.name))
    : tablesData.filter(t => hiddenTables.includes(t.name));

  console.log('Current viewMode:', viewMode);
  console.log('Current hiddenTables:', hiddenTables);
  console.log('Visible tables:', visibleTables.map(t => t.name));

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
                          <div style={{ 
                            marginTop: '10px', 
                            padding: '8px', 
                            backgroundColor: '#f5f5f5',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            color: '#666',
                            textAlign: 'center'
                          }}>
                            <i className="fas fa-info-circle"></i> Preview terbatas pada 10 baris pertama
                          </div>
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