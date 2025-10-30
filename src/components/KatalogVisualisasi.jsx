import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import EditParameterModal from './EditParameterModal';
import Sidebar from './Sidebar';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const KatalogVisualisasi = ({ activeTabProp }) => {
  const [activeTab, setActiveTab] = useState(activeTabProp || 'visualisasi');  
  const navigate = useNavigate();
  const { isLoading, error, fetchData, executeQuery } = useData();
  const { user, isAdmin, isAnalis, isEndUser } = useAuth();
  
  // State untuk preview visualisasi
  const [previewVisualisasi, setPreviewVisualisasi] = useState(null);
  const [previewParameters, setPreviewParameters] = useState({
    xAxis: '',
    yAxis: '',
    groupBy: ''
  });
  const [previewChartType, setPreviewChartType] = useState('');
  const [previewChartData, setPreviewChartData] = useState([]);
  
  // State untuk pesan
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  
  // State untuk katalog visualisasi
  const [visualisasiData, setVisualisasiData] = useState([]);
  
  // State untuk database selection
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');

  // State untuk edit parameter (EndUser)
  const [showEditParameterModal, setShowEditParameterModal] = useState(false);
  const [editingVisualisasi, setEditingVisualisasi] = useState(null);

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
  
  // Mengambil data visualisasi saat komponen dimuat atau database berubah
  useEffect(() => {
    const fetchVisualisasiData = async () => {
      try {
        const response = await fetch(`http://localhost:5002/api/database/${selectedDatabase}/visualisasi`);
        if (response.ok) {
          const visualisasi = await response.json();
          const sortedVisualisasi = [...visualisasi].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
          });
          setVisualisasiData(sortedVisualisasi);
        }
      } catch (err) {
        console.error('Error fetching visualisasi data:', err);
      }
    };
    
    if (selectedDatabase) {
      fetchVisualisasiData();
    }
  }, [selectedDatabase]);
  
  // Format tanggal untuk tampilan
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Fungsi untuk EndUser edit parameter visualisasi
  const handleEditParameter = (visualisasi) => {
    setEditingVisualisasi(visualisasi);
    setShowEditParameterModal(true);
  };

  // Fungsi untuk menyimpan hasil edit parameter dan update visualisasi
  const handleSaveParameterEdit = async (newChartData, params) => {
    try {
      // Update chart_data di database
      const response = await fetch(`http://localhost:5002/api/visualizations/${editingVisualisasi.id_visualisasi}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chart_data: JSON.stringify(newChartData)
        }),
      });

      if (response.ok) {
        // Update visualisasi di state lokal
        setVisualisasiData(prev => prev.map(vis => 
          vis.id_visualisasi === editingVisualisasi.id_visualisasi 
            ? { ...vis, chart_data: JSON.stringify(newChartData) }
            : vis
        ));

        // Update preview jika sedang menampilkan visualisasi ini
        if (previewVisualisasi && previewVisualisasi.id_visualisasi === editingVisualisasi.id_visualisasi) {
          setPreviewChartData(newChartData);
        }

        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating visualization:', error);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  };

  // Fungsi untuk menampilkan preview visualisasi
  const handlePreviewVisualisasi = async (visualisasi) => {
    try {
      // Jika visualisasi yang sama diklik, tutup preview
      if (previewVisualisasi && previewVisualisasi.id_visualisasi === visualisasi.id_visualisasi) {
        setPreviewVisualisasi(null);
        return;
      }
      
      setPreviewVisualisasi(visualisasi);
      
      // Ambil data chart
      if (visualisasi.chart_data) {
        const chartData = JSON.parse(visualisasi.chart_data);
        setPreviewChartData(chartData);
      } else if (visualisasi.query_sql) {
        const result = await executeQuery(visualisasi.query_sql);
        setPreviewChartData(result);
      }
      
      // Ambil parameter visualisasi
      const parameter = await fetchData('parameter_visualisasi');
      const params = parameter.find(p => p.id_visualisasi === visualisasi.id_visualisasi);
      
      if (params) {
        setPreviewParameters({
          xAxis: params.parameter_x,
          yAxis: params.parameter_y,
          groupBy: params.parameter_group || ''
        });
        setPreviewChartType(visualisasi.jenis_grafik);
      }
    } catch (error) {
      console.error('Error previewing visualization:', error);
    }
  };
  
  // Fungsi untuk menghapus visualisasi (Hanya Admin dan Analis)
  const handleDeleteVisualisasi = async (id) => {
    if (!isAdmin() && !isAnalis()) {
      alert('Anda tidak memiliki izin untuk menghapus visualisasi!');
      return;
    }

    if (window.confirm('Apakah Anda yakin ingin menghapus visualisasi ini?')) {
      try {
        const response = await fetch(`http://localhost:5002/api/visualizations/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        const responseData = await response.text();
        
        if (!response.ok) {
          let errorMessage = 'Gagal menghapus visualisasi';
          
          try {
            const errorData = JSON.parse(responseData);
            errorMessage = errorData.error || errorData.message || errorMessage;
            
            if (response.status === 403 && errorData.usage_count) {
              errorMessage = `Visualisasi tidak dapat dihapus karena sedang digunakan dalam salah satu analisis`;
            }
          } catch (e) {
            errorMessage = responseData || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        const updatedVisualisasi = visualisasiData.filter(item => item.id_visualisasi !== id);
        setVisualisasiData(updatedVisualisasi);
        
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
        
      } catch (err) {
        console.error('Error deleting visualisasi:', err);
        alert(`${err.message}`);
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3000);
      }
    }
  };

  // Fungsi untuk mengarahkan ke halaman pembuatan visualisasi (Hanya Admin dan Analis)
  const handleCreateVisualisasi = () => {
    if (!isAdmin() && !isAnalis()) {
      alert('Anda tidak memiliki izin untuk membuat visualisasi!');
      return;
    }
    navigate('/visualisasi/buat');
  };
  
  // Render grafik berdasarkan jenis
  const renderChart = (isPreview = false) => {
    if (isPreview && previewVisualisasi) {
      const dataKey = previewParameters.xAxis;
      const valueKey = previewParameters.yAxis;
      const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
      
      return (
        <ResponsiveContainer width="100%" height={400}>
          {previewChartType === 'bar' ? (
            <BarChart data={previewChartData}>
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
          ) : previewChartType === 'line' ? (
            <LineChart data={previewChartData}>
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
          ) : previewChartType === 'pie' ? (
            <PieChart>
              <Pie
                data={previewChartData}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={150}
                fill="#8884d8"
                dataKey={valueKey}
                nameKey={dataKey}
                label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {previewChartData.map((entry, index) => (
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
              <Scatter name={`${dataKey} vs ${valueKey}`} data={previewChartData} fill="#8884d8" />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      );
    }
  };

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
              <h1>Katalog Visualisasi</h1>

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
              
              {/* Katalog Visualisasi */}
              <div className="catalog-section">
                <h2>Katalog Visualisasi</h2>
                {saveSuccess && (
                  <div className="save-success-message">
                    Visualisasi berhasil dihapus!
                  </div>
                )}
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Judul</th>
                        <th className="description-column">Deskripsi</th>
                        <th>Jenis Grafik</th>
                        <th>Tanggal Dibuat</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visualisasiData.map((item) => (
                        <tr key={item.id_visualisasi}>
                          <td>{item.judul}</td>
                          <td>{item.deskripsi}</td>
                          <td>{item.jenis_grafik}</td>
                          <td>{formatDate(item.created_at)}</td>
                          <td>
                            <div className="action-buttons">
                              <button 
                                className={previewVisualisasi && previewVisualisasi.id_visualisasi === item.id_visualisasi ? "cancel-button" : "view-button"}
                                onClick={() => handlePreviewVisualisasi(item)}
                              >
                                {previewVisualisasi && previewVisualisasi.id_visualisasi === item.id_visualisasi ? "Batal" : "Lihat"}
                              </button>
                              
                              {/* Tombol Edit Parameter - Hanya untuk EndUser jika ada parameter */}
                              {isEndUser() && item.query_sql && item.query_sql.includes(':') && (
                                <button 
                                  className="view-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditParameter(item);
                                  }}
                                  style={{ backgroundColor: '#2196F3' }}
                                >
                                  Edit
                                </button>
                              )}
                              
                              {/* Tombol Hapus - Hanya untuk Admin dan Analis */}
                              {(isAdmin() || isAnalis()) && (
                                <button 
                                  className="delete-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteVisualisasi(item.id_visualisasi);
                                  }}
                                >
                                  Hapus
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                  
                {/* Preview Visualisasi */}
                {previewVisualisasi && (
                  <div className="preview-section" style={{ marginTop: '20px', border: '1px solid #ddd', borderRadius: '4px', padding: '15px' }}>
                    <h2>Preview Visualisasi</h2>
                    <div className="preview-header">
                      <h3>{previewVisualisasi.judul}</h3>
                      <p className="visualization-description">{previewVisualisasi.deskripsi}</p>
                    </div>
                    <div className="data-table-container" style={{
                      padding: '15px',
                      marginBottom: '20px'
                    }}>
                      <div className="chart-container">
                        {renderChart(true)}
                      </div>
                    </div>
                  </div>
                )}
                  
                {/* Tombol Buat Visualisasi - Hanya untuk Admin dan Analis */}
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
                      onClick={handleCreateVisualisasi}
                    >
                      Buat Visualisasi
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Sidebar>
      
      {/* Modal Edit Parameter untuk EndUser */}
      <EditParameterModal
        isOpen={showEditParameterModal}
        onClose={() => setShowEditParameterModal(false)}
        visualisasi={editingVisualisasi}
        onSave={handleSaveParameterEdit}
      />
    </div>
  );
};

export default KatalogVisualisasi;