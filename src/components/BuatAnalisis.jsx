import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const BuatAnalisis = () => {
  const navigate = useNavigate();
  const { fetchData, executeQuery } = useData();
  const { user } = useAuth();
  
  // State untuk data
  const [visualisasiData, setVisualisasiData] = useState([]);
  
  // State untuk seleksi
  const [selectedVisualisasi, setSelectedVisualisasi] = useState([]);
  
  // State untuk form
  const [judul, setJudul] = useState('');
  const [rumusanMasalah, setRumusanMasalah] = useState('');
  const [interpretasiHasil, setInterpretasiHasil] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // State untuk chart data
  const [chartDataMap, setChartDataMap] = useState({});
  
  // State untuk pesan
  const [successMessage, setSuccessMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  
  // State untuk database selection
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedDatabaseForSave, setSelectedDatabaseForSave] = useState('');

  // Fungsi untuk mengambil daftar database yang tersedia
  const fetchAvailableDatabases = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/databases');
      if (response.ok) {
        const databases = await response.json();
        setAvailableDatabases(databases);
        if (databases.length > 0) {
          // Gunakan id_database (integer)
          setSelectedDatabase(databases[0].id_database); 
          setSelectedDatabaseForSave(databases[0].id_database);
        }
      }
    } catch (error) {
      console.error('Error fetching databases:', error);
      const defaultDatabases = [
        { id_database: 1, name: 'PostgreSQL Primary', value: 'postgresql_primary', host: 'localhost', port: 5432 },
        { id_database: 2, name: 'MySQL Secondary', value: 'mysql_secondary', host: 'localhost', port: 3306 }
      ];
      setAvailableDatabases(defaultDatabases);
      setSelectedDatabase(defaultDatabases[0].id_database);
      setSelectedDatabaseForSave(defaultDatabases[0].id_database);
    }
  };

  useEffect(() => {
    fetchAvailableDatabases();
  }, []);
  
  // Ambil data saat komponen dimuat atau database berubah
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        // Fetch SEMUA visualisasi tanpa filter database
        const visualisasiResponse = await fetch('http://localhost:5002/api/visualizations');
        
        if (visualisasiResponse.ok) {
          const visualisasi = await visualisasiResponse.json();
          const sortedVisualisasi = [...visualisasi].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
          });
          setVisualisasiData(sortedVisualisasi);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    fetchAllData();
  }, []);

  // Fungsi untuk menyimpan analisis
  const saveAnalisis = async () => {
    setSaveSuccess(false);
    setSaveError(false);
    
    // Validasi input
    const errors = {};
    if (!judul.trim()) errors.judul = 'Judul wajib diisi';
    if (!rumusanMasalah.trim()) errors.rumusanMasalah = 'Rumusan masalah wajib diisi';
    if (!interpretasiHasil.trim()) errors.interpretasiHasil = 'Interpretasi hasil wajib diisi';
    if (selectedVisualisasi.length === 0) errors.visualisasi = 'Pilih minimal satu visualisasi';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    
    try {
      const response = await fetch('http://localhost:5002/api/analisis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          judul,
          masalah: rumusanMasalah,
          interpretasi_hasil: interpretasiHasil,
          visualisasi_ids: selectedVisualisasi.map(v => v.id_visualisasi),
          database: selectedDatabaseForSave,
          created_by: user.id_user // Simpan siapa yang membuat
        })
      });
      
      if (response.ok) {
        setSaveSuccess(true);
        setSuccessMessage('Analisis berhasil disimpan!');
        
        // Reset form setelah berhasil menyimpan
        setTimeout(() => {
          setSaveSuccess(false);
          setSuccessMessage('');
          setJudul('');
          setRumusanMasalah('');
          setInterpretasiHasil('');
          setSelectedVisualisasi([]);
          setChartDataMap({});
          
          navigate('/analisis');
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan analisis');
      }
    } catch (error) {
      console.error('Error saving analisis:', error);
      setSaveError(true);
    }
  };
  
  // Fungsi untuk memilih visualisasi
  const handleVisualisasiSelect = async (id) => {
    const isSelected = selectedVisualisasi.some(v => v.id_visualisasi === id);
    
    if (isSelected) {
      setSelectedVisualisasi(selectedVisualisasi.filter(v => v.id_visualisasi !== id));
      
      const newChartDataMap = { ...chartDataMap };
      delete newChartDataMap[id];
      setChartDataMap(newChartDataMap);
    } else {
      const selected = visualisasiData.find(v => v.id_visualisasi === id);
      
      if (selected) {
        try {
          let chartData;
          
          if (selected.chart_data) {
            chartData = JSON.parse(selected.chart_data);
          } else if (selected.query_sql) {
            chartData = await executeQuery(selected.query_sql);
          }
          
          setSelectedVisualisasi([...selectedVisualisasi, selected]);
          setChartDataMap(prev => ({
            ...prev,
            [id]: chartData
          }));
        } catch (err) {
          console.error('Error executing visualization query:', err);
        }
      }
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
    if (!chartData || chartData.length === 0) return null;
    
    // Ambil parameter langsung dari visualisasi
    const parameter_x = visualisasi.parameter_x;
    const parameter_y = visualisasi.parameter_y;
    
    if (!parameter_x || !parameter_y) return null;

    // Parse chart data
    const parsedChartData = parseChartData(chartData, parameter_x, parameter_y, visualisasi.jenis_grafik);
    
    const getColor = (index) => {
      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
      return colors[index % colors.length];
    };
    
    switch (visualisasi.jenis_grafik) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={parsedChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={parameter_x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={parameter_y} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={parsedChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={parameter_x} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={parameter_y} stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="number" dataKey={parameter_x} name={parameter_x} />
              <YAxis type="number" dataKey={parameter_y} name={parameter_y} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={`${parameter_x} vs ${parameter_y}`} data={parsedChartData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={parsedChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={120}
                fill="#8884d8"
                dataKey={parameter_y}
                nameKey={parameter_x}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getColor(index)} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };
  
  // Format tanggal untuk tampilan
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Fungsi untuk kembali ke katalog analisis
  const handleBack = () => {
    navigate('/analisis');
  };

  return (
    <ProtectedRoute allowedRoles={['Admin', 'Analis']}>
      <div className="dashboard-container">
        <Sidebar activeTabProp="analisis" />
        
        <div className="dashboard-content">
          <div className="content-header">
            <h2>Buat Analisis</h2>
          </div>
          
          <div className="content-body">
            {/* Katalog Visualisasi */}
            <div className="catalog-section">
              <h2>Katalog Visualisasi</h2>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pilih</th>
                      <th>Judul</th>
                      <th className="description-column">Deskripsi</th>
                      <th>Jenis Grafik</th>
                      <th>Tanggal Dibuat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visualisasiData.map((item) => (
                      <tr key={item.id_visualisasi}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedVisualisasi.some(v => v.id_visualisasi === item.id_visualisasi)}
                            onChange={() => handleVisualisasiSelect(item.id_visualisasi)}
                          />
                        </td>
                        <td>{item.judul}</td>
                        <td>{item.deskripsi}</td>
                        <td>{item.jenis_grafik}</td>
                        <td>{formatDate(item.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {formErrors.visualisasi && <div className="input-error-message">{formErrors.visualisasi}</div>}
            </div>
            
            {/* Preview Visualisasi */}
            {selectedVisualisasi.length > 0 && (
              <div className="visualization-preview">
                <h2>Preview Visualisasi</h2>
                {selectedVisualisasi.map(vis => (
                  <div key={vis.id_visualisasi} className="chart-item" id={`chart-${vis.id_visualisasi}`}>
                    <h4>{vis.judul}</h4>
                    <div className="chart-container">
                      {renderChart(vis, chartDataMap[vis.id_visualisasi])}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Form Analisis */}
            <div className="form-section">
              <div className="form-group">
                <label htmlFor="judul">Judul Analisis: <span className="required">*</span></label>
                <input
                  type="text"
                  id="judul"
                  className="form-input"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Masukkan judul analisis"
                />
                {formErrors.judul && <div className="input-error-message">{formErrors.judul}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="rumusan">Rumusan Masalah: <span className="required">*</span></label>
                <textarea
                  id="rumusan"
                  className="form-textarea"
                  value={rumusanMasalah}
                  onChange={(e) => setRumusanMasalah(e.target.value)}
                  placeholder="Masukkan rumusan masalah"
                  rows={4}
                />
                {formErrors.rumusanMasalah && <div className="input-error-message">{formErrors.rumusanMasalah}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="interpretasi">Interpretasi Hasil: <span className="required">*</span></label>
                <textarea
                  id="interpretasi"
                  className="form-textarea"
                  value={interpretasiHasil}
                  onChange={(e) => setInterpretasiHasil(e.target.value)}
                  placeholder="Masukkan interpretasi hasil"
                  rows={6}
                />
                {formErrors.interpretasiHasil && <div className="input-error-message">{formErrors.interpretasiHasil}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="database-select">Database untuk Menyimpan:</label>
                <select
                  id="database-select"
                  value={selectedDatabaseForSave}
                  onChange={(e) => setSelectedDatabaseForSave(parseInt(e.target.value))}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    backgroundColor: 'white',
                    width: '100%'
                  }}
                >
                  {availableDatabases.map((database, index) => (
                    <option key={database.id_database} value={database.id_database}>
                      {database.name} ({database.host}:{database.port || 'default'})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="button-group">
                <button className="save-button" onClick={saveAnalisis}>Simpan Analisis</button>
              </div>

              {saveSuccess && (
                <div className="save-success-message">{successMessage}</div>
              )}
              
              {saveError && (
                <div className="input-error-message">Analisis gagal disimpan!</div>
              )}
            </div>
          </div>

          <div className="button-container" style={{ marginTop: '20px', textAlign: 'center' }}>
            <button 
              className="back-button" 
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
              onClick={handleBack}
            >
              Kembali ke Katalog
            </button>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default BuatAnalisis;