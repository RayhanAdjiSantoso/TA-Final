import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import EditParameterModal from './EditParameterModal';
import PDF from './PDF';
import Sidebar from './Sidebar';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const KatalogAnalisis = ({ activeTabProp }) => {
  const [activeTab, setActiveTab] = useState(activeTabProp || 'analisis');
  const navigate = useNavigate();
  const { isLoading, error, fetchData, executeQuery } = useData();
  const { user, isAdmin, isAnalis, isEndUser } = useAuth();
  const pdfRef = useRef(null);
  
  // State untuk data
  const [visualisasiData, setVisualisasiData] = useState([]);
  const [parameterData, setParameterData] = useState([]);
  const [analisisData, setAnalisisData] = useState([]);
  
  // State untuk seleksi
  const [selectedAnalisis, setSelectedAnalisis] = useState(null);
  const [previewVisualisasi, setPreviewVisualisasi] = useState([]);
  
  // State untuk chart data
  const [chartDataMap, setChartDataMap] = useState({});
  
  // State untuk pesan
  const [successMessage, setSuccessMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // State untuk database selection
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  // State untuk edit parameter (EndUser)
  const [showEditParameterModal, setShowEditParameterModal] = useState(false);
  const [editingVisualisasi, setEditingVisualisasi] = useState(null);

  // State untuk edit analisis (EndUser)
  const [isEditingAnalisis, setIsEditingAnalisis] = useState(false);
  const [editedJudul, setEditedJudul] = useState('');
  const [editedMasalah, setEditedMasalah] = useState('');
  const [editedInterpretasi, setEditedInterpretasi] = useState('');

  // Perbarui activeTab ketika activeTabProp berubah
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
  
  // Ambil data saat komponen dimuat atau database berubah
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const visualisasiResponse = await fetch(`http://localhost:5002/api/database/${selectedDatabase}/visualisasi`);
        if (visualisasiResponse.ok) {
          const visualisasi = await visualisasiResponse.json();
          const sortedVisualisasi = [...visualisasi].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
          });
          setVisualisasiData(sortedVisualisasi);
        }

        const analisisResponse = await fetch(`http://localhost:5002/api/database/${selectedDatabase}/analisis-with-visualisasi`);
        if (analisisResponse.ok) {
          const analisis = await analisisResponse.json();
          setAnalisisData(analisis);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    if (selectedDatabase) {
      fetchAllData();
    }
  }, [selectedDatabase]);
  
  // Fungsi untuk memilih analisis dari katalog
  const handleAnalisisSelect = async (analisis) => {
    console.log('=== HANDLE ANALISIS SELECT ===');
    console.log('Analisis clicked:', analisis);
    
    if (selectedAnalisis && selectedAnalisis.id_analisis === analisis.id_analisis) {
      setSelectedAnalisis(null);
      setPreviewVisualisasi([]);
      setChartDataMap({});
      setIsEditingAnalisis(false);
      return;
    }
    
    setSelectedAnalisis(analisis);
    setEditedJudul(analisis.judul || '');
    setEditedMasalah(analisis.rumusan_masalah || '');
    setEditedInterpretasi(analisis.interpretasi_hasil || '');
    setIsEditingAnalisis(false);
    
    try {
      console.log('=== DEBUG VISUALISASI ===');
      console.log('Selected database:', selectedDatabase);
      console.log('Analisis ID:', analisis.id_analisis);
      console.log('Analisis penyimpanan_database:', analisis.penyimpanan_database);
      
      // Fetch visualisasi IDs yang terkait dengan analisis
      const idsResponse = await fetch(`http://localhost:5002/api/analisis/${analisis.id_analisis}/visualisasi`);
      console.log('IDs Response status:', idsResponse.status);
      
      if (!idsResponse.ok) {
        const errorText = await idsResponse.text();
        console.error('Response error:', errorText);
        throw new Error('Gagal mengambil data visualisasi untuk analisis');
      }
      
      const visualisasiIds = await idsResponse.json();
      console.log('Visualisasi IDs dari API:', visualisasiIds);
      
      if (visualisasiIds.length === 0) {
        console.warn('No visualisasi IDs found for this analisis');
        setPreviewVisualisasi([]);
        setChartDataMap({});
        return;
      }
      
      // Fetch detail visualisasi langsung dari API berdasarkan IDs
      // Ini akan mengambil visualisasi dari database manapun
      const visualisasiPromises = visualisasiIds.map(id => 
        fetch(`http://localhost:5002/api/visualizations/${id}`).then(res => res.json())
      );
      
      const relatedVisualizations = await Promise.all(visualisasiPromises);
      console.log('Fetched visualizations details:', relatedVisualizations.map(v => ({
        id: v.id_visualisasi,
        judul: v.judul,
        db: v.penyimpanan_database
      })));
      
      if (relatedVisualizations.length > 0) {
        const newChartDataMap = {};
        
        for (const vis of relatedVisualizations) {
          console.log('Processing visualization:', vis.id_visualisasi, vis.judul);
          let chartData;
          
          if (vis.chart_data) {
            console.log('Using chart_data from vis');
            const parsed = typeof vis.chart_data === 'string' 
              ? JSON.parse(vis.chart_data) 
              : vis.chart_data;
            chartData = parsed;
          } else if (vis.query_sql) {
            console.log('Executing query_sql:', vis.query_sql);
            chartData = await executeQuery(vis.query_sql);
          }
          
          console.log('Chart data for vis', vis.id_visualisasi, ':', chartData?.length, 'rows');
          newChartDataMap[vis.id_visualisasi] = chartData;
        }
        
        console.log('Final chartDataMap:', Object.keys(newChartDataMap));
        setChartDataMap(newChartDataMap);
        setPreviewVisualisasi(relatedVisualizations);
      } else {
        console.warn('No related visualizations found!');
        setPreviewVisualisasi([]);
        setChartDataMap({});
      }
    } catch (err) {
      console.error('Error loading visualizations for analysis:', err);
      console.error('Error stack:', err.stack);
    }
  };

  // Fungsi untuk EndUser edit parameter visualisasi
  const handleEditParameter = (visualisasi) => {
    setEditingVisualisasi(visualisasi);
    setShowEditParameterModal(true);
  };

  // Fungsi untuk menyimpan hasil edit parameter
  const handleSaveParameterEdit = (newChartData, params) => {
    // Update chart data dengan data baru
    setChartDataMap(prev => ({
      ...prev,
      [editingVisualisasi.id_visualisasi]: newChartData
    }));

    setSaveSuccess(true);
    setSuccessMessage('Parameter berhasil diperbarui dan visualisasi di-refresh!');
    setTimeout(() => {
      setSaveSuccess(false);
      setSuccessMessage('');
    }, 3000);
  };

  // Fungsi untuk EndUser mulai edit analisis
  const handleStartEditAnalisis = () => {
    setIsEditingAnalisis(true);
  };

  // Fungsi untuk EndUser batal edit analisis
  const handleCancelEditAnalisis = () => {
    setIsEditingAnalisis(false);
    setEditedJudul(selectedAnalisis.judul || '');
    setEditedMasalah(selectedAnalisis.rumusan_masalah || '');
    setEditedInterpretasi(selectedAnalisis.interpretasi_hasil || '');
  };

  // Fungsi untuk EndUser simpan edit analisis
  const handleSaveEditAnalisis = async () => {
    try {
      const response = await fetch(`http://localhost:5002/api/analisis/${selectedAnalisis.id_analisis}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          judul: editedJudul,
          masalah: editedMasalah,
          interpretasi_hasil: editedInterpretasi
        }),
      });

      if (!response.ok) throw new Error('Gagal menyimpan perubahan analisis');

      // Update data analisis di state
      const updatedAnalisisData = analisisData.map(item => 
        item.id_analisis === selectedAnalisis.id_analisis 
          ? { ...item, judul: editedJudul, rumusan_masalah: editedMasalah, interpretasi_hasil: editedInterpretasi }
          : item
      );
      setAnalisisData(updatedAnalisisData);

      // Update selected analisis
      setSelectedAnalisis({
        ...selectedAnalisis,
        judul: editedJudul,
        rumusan_masalah: editedMasalah,
        interpretasi_hasil: editedInterpretasi
      });

      setIsEditingAnalisis(false);
      setSaveSuccess(true);
      setSuccessMessage('Analisis berhasil diperbarui!');
      setTimeout(() => {
        setSaveSuccess(false);
        setSuccessMessage('');
      }, 3000);

    } catch (err) {
      console.error('Error saving analisis:', err);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  };

  // Fungsi helper untuk konversi data ke number
  const parseChartData = (data, xKey, yKey, chartType) => {
    if (!data) return [];
    
    return data.map(item => {
      const parsedItem = { ...item };
      
      // Konversi yKey ke number jika berupa string
      if (yKey && parsedItem[yKey] !== undefined && parsedItem[yKey] !== null) {
        const numValue = parseFloat(parsedItem[yKey]);
        if (!isNaN(numValue)) {
          parsedItem[yKey] = numValue;
        }
      }
      
      // Hanya untuk scatter chart, konversi xKey ke number
      if (chartType === 'scatter' && xKey && parsedItem[xKey] !== undefined && parsedItem[xKey] !== null) {
        const numValue = parseFloat(parsedItem[xKey]);
        if (!isNaN(numValue)) {
          parsedItem[xKey] = numValue;
        }
      }
      
      return parsedItem;
    });
  };
  
  // Fungsi untuk render grafik berdasarkan jenis
  const renderChart = (visualisasi, chartData) => {
    if (!chartData || chartData.length === 0) {
      return <div className="no-chart-data">Tidak ada data untuk visualisasi ini</div>;
    }
    
    const dataKey = visualisasi.parameter_x;
    const valueKey = visualisasi.parameter_y;
    
    if (!dataKey || !valueKey) {
      return <div className="no-chart-data">Parameter visualisasi tidak lengkap</div>;
    }
    
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

    const parsedChartData = parseChartData(chartData, dataKey, valueKey, visualisasi.jenis_grafik);
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        {visualisasi.jenis_grafik === 'bar' ? (
          <BarChart data={parsedChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend 
              payload={[
                { value: `Sumbu X: ${dataKey}`, type: 'line', color: '#666' },
                { value: `Sumbu Y: ${valueKey}`, type: 'rect', color: '#8884d8' }
              ]}
            />
            <Bar dataKey={valueKey} fill="#8884d8" name={valueKey} />
          </BarChart>
        ) : visualisasi.jenis_grafik === 'line' ? (
          <LineChart data={parsedChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend 
              payload={[
                { value: `Sumbu X: ${dataKey}`, type: 'line', color: '#666' },
                { value: `Sumbu Y: ${valueKey}`, type: 'line', color: '#8884d8' }
              ]}
            />
            <Line type="monotone" dataKey={valueKey} stroke="#8884d8" name={valueKey} />
          </LineChart>
        ) : visualisasi.jenis_grafik === 'pie' ? (
          <PieChart>
            <Pie
              data={parsedChartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={150}
              fill="#8884d8"
              dataKey={valueKey}
              nameKey={dataKey}
              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend 
              payload={[
                { value: `Category: ${dataKey}`, type: 'rect', color: '#666' },
                { value: `Values: ${valueKey}`, type: 'rect', color: '#8884d8' }
              ]}
            />
          </PieChart>
        ) : (
          <ScatterChart>
            <CartesianGrid />
            <XAxis type="number" dataKey={dataKey} name={dataKey} />
            <YAxis type="number" dataKey={valueKey} name={valueKey} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend 
              payload={[
                { value: `Sumbu X: ${dataKey}`, type: 'rect', color: '#666' },
                { value: `Sumbu Y: ${valueKey}`, type: 'rect', color: '#8884d8' }
              ]}
            />
            <Scatter name={`${dataKey} vs ${valueKey}`} data={parsedChartData} fill="#8884d8" />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    );
  };
  
  // Format tanggal untuk tampilan
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Fungsi untuk menghapus analisis (Hanya Admin dan Analis)
  const handleDeleteAnalisis = async (id) => {
    if (!isAdmin() && !isAnalis()) {
      alert('Anda tidak memiliki izin untuk menghapus analisis!');
      return;
    }

    if (window.confirm('Apakah Anda yakin ingin menghapus analisis ini?')) {
      try {
        const response = await fetch(`http://localhost:5002/api/analisis/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Gagal menghapus analisis');

        if (selectedAnalisis && selectedAnalisis.id_analisis === id) {
          setSelectedAnalisis(null);
          setPreviewVisualisasi([]);
          setChartDataMap({});
        }

        // PERUBAHAN DI SINI - Gunakan endpoint baru
        const getResponse = await fetch(`http://localhost:5002/api/database/${selectedDatabase}/analisis-with-visualisasi`);
        if (getResponse.ok) {
          const analisis = await getResponse.json();
          setAnalisisData(analisis);
        }

        setSaveSuccess(true);
        setSuccessMessage("Analisis berhasil dihapus!");
        setTimeout(() => {
          setSaveSuccess(false);
          setSuccessMessage("");
        }, 3000);
      } catch (err) {
        console.error('Error deleting analisis:', err);
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3000);
      }
    }
  };

  // Fungsi untuk download PDF
  const downloadPDF = async () => {
    const success = await PDF.downloadAnalisisPDF(selectedAnalisis, previewVisualisasi);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };  

  // Fungsi untuk mengarahkan ke halaman pembuatan analisis (Hanya Admin dan Analis)
  const handleCreateAnalisis = () => {
    if (!isAdmin() && !isAnalis()) {
      alert('Anda tidak memiliki izin untuk membuat analisis!');
      return;
    }
    navigate('/analisis/buat');
  };

  return (
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
            <h1>Katalog Analisis</h1>

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
            
            {/* Katalog Analisis */}
            <div className="catalog-section">
              <h2>Katalog Analisis</h2>
              
              {saveSuccess && (
                <div className="save-success-message">{successMessage}</div>
              )}
              
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Judul</th>
                      <th>Visualisasi</th>
                      <th>Tanggal Dibuat</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analisisData.length > 0 ? (
                      analisisData.map((item) => (
                        <tr 
                          key={item.id_analisis} 
                          className={selectedAnalisis && selectedAnalisis.id_analisis === item.id_analisis ? 'selected-row' : ''}
                        >
                          <td>{item.judul}</td>
                          <td>
                            {item.visualisasi_judul || '-'}
                            {item.jumlah_visualisasi > 1 && (
                              <span className="visualisasi-count"> ({item.jumlah_visualisasi})</span>
                            )}
                          </td>
                          <td>{formatDate(item.created_at)}</td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className={selectedAnalisis && selectedAnalisis.id_analisis === item.id_analisis ? 'cancel-button' : 'view-button'}
                                onClick={() => handleAnalisisSelect(item)}
                              >
                                {selectedAnalisis && selectedAnalisis.id_analisis === item.id_analisis ? 'Tutup' : 'Lihat'}
                              </button>
                              
                              {/* Tombol Hapus - Hanya untuk Admin dan Analis */}
                              {(isAdmin() || isAnalis()) && (
                                <button 
                                  className="delete-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAnalisis(item.id_analisis);
                                  }}
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="no-data">Belum ada analisis tersimpan</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Preview Analisis */}
              {selectedAnalisis && (
                <div className="analisis-preview" id="analisis-preview">
                  <h2>Preview Analisis</h2>
                  <div className="analisis-content">
                    
                    {/* Judul - Editable untuk EndUser */}
                    {isEditingAnalisis && (isEndUser() || isAnalis()) ? (
                      <div className="form-group">
                        <label>Judul Analisis:</label>
                        <input
                          type="text"
                          className="form-input"
                          value={editedJudul}
                          onChange={(e) => setEditedJudul(e.target.value)}
                        />
                      </div>
                    ) : (
                      <h3>{selectedAnalisis.judul}</h3>
                    )}
                    
                    {/* Rumusan Masalah - Editable untuk EndUser */}
                    <div className="analisis-section">
                      <h4>Rumusan Masalah:</h4>
                      {isEditingAnalisis && (isEndUser() || isAnalis()) ? (
                        <textarea
                          className="form-textarea"
                          value={editedMasalah}
                          onChange={(e) => setEditedMasalah(e.target.value)}
                          rows={4}
                        />
                      ) : (
                        <p>{selectedAnalisis.rumusan_masalah}</p>
                      )}
                    </div>
                    
                    {/* Visualisasi */}
                    <div className="analisis-section">
                      <h4>Visualisasi:</h4>
                      {previewVisualisasi.map(vis => (
                        <div key={vis.id_visualisasi} className="chart-item" id={`chart-${vis.id_visualisasi}`}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h4>{vis.judul}</h4>
                            
                            {/* Tombol Edit Parameter - Hanya untuk EndUser */}
                            {isEndUser() && vis.query_sql && vis.query_sql.includes(':') && (
                              <button
                                className="view-button"
                                onClick={() => handleEditParameter(vis)}
                                style={{ fontSize: '0.9rem', padding: '5px 10px' }}
                              >
                                Edit Parameter
                              </button>
                            )}
                          </div>
                          <div className="chart-container">
                            {renderChart(vis, chartDataMap[vis.id_visualisasi])}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Interpretasi Hasil - Editable untuk EndUser */}
                    <div className="analisis-section">
                      <h4>Interpretasi Hasil:</h4>
                      {isEditingAnalisis && (isEndUser() || isAnalis()) ? (
                        <textarea
                          className="form-textarea"
                          value={editedInterpretasi}
                          onChange={(e) => setEditedInterpretasi(e.target.value)}
                          rows={6}
                        />
                      ) : (
                        <p>{selectedAnalisis.interpretasi_hasil}</p>
                      )}
                    </div>
                    
                    {/* Tombol Aksi */}
                    <div className="button-group">
                      {/* Tombol untuk EndUser */}
                      {(isEndUser() || isAnalis()) && !isEditingAnalisis && (
                        <button 
                          className="save-button" 
                          onClick={handleStartEditAnalisis}
                          style={{ marginRight: '10px' }}
                        >
                          Edit Analisis
                        </button>
                      )}
                      
                      {/* Tombol Simpan dan Batal saat editing - EndUser */}
                      {(isEndUser() || isAnalis()) && isEditingAnalisis && (
                        <>
                          <button 
                            className="save-button" 
                            onClick={handleSaveEditAnalisis}
                            style={{ marginRight: '10px' }}
                          >
                            Simpan Perubahan
                          </button>
                          <button 
                            className="cancel-button" 
                            onClick={handleCancelEditAnalisis}
                            style={{ marginRight: '10px' }}
                          >
                            Batal
                          </button>
                        </>
                      )}
                      
                      {/* Tombol Download PDF - Semua user */}
                      <button className="download-button" onClick={downloadPDF}>
                        Download PDF
                      </button>
                    </div>
                    
                    {downloadSuccess && (
                      <div className="save-success-message">PDF berhasil diunduh!</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Tombol Buat Analisis - Hanya untuk Admin dan Analis */}
              {(isAdmin() || isAnalis()) && (
                <div className="button-container" style={{ marginTop: '20px', textAlign: 'center' }}>
                  <button 
                    className="create-button" 
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                    onClick={handleCreateAnalisis}
                  >
                    Buat Analisis
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Edit Parameter untuk EndUser */}
      <EditParameterModal
        isOpen={showEditParameterModal}
        onClose={() => setShowEditParameterModal(false)}
        visualisasi={editingVisualisasi}
        onSave={handleSaveParameterEdit}
      />
    </Sidebar>
  );
};

export default KatalogAnalisis;