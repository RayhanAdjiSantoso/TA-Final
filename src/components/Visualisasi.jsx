import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import Analisis from './Analisis';
import Sidebar from './Sidebar';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const HalamanVisualisasi = ({ activeTabProp }) => {
  const [activeTab, setActiveTab] = useState(activeTabProp || 'data');
  const { 
    isLoading, 
    error,
    availableTables, 
    fetchData, 
    executeQuery 
  } = useData();
  
  // Perbarui activeTab ketika activeTabProp berubah
  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);
  
  // State untuk fitur katalog data
  const [availableData, setAvailableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});
  
  // State untuk file yang disembunyikan
  const [hiddenFiles, setHiddenFiles] = useState([]);
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  
  // State untuk query SQL
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState([]);
  const [queryError, setQueryError] = useState(null);
  const [querySuccess, setQuerySuccess] = useState(false); // State baru untuk pesan sukses query
  
  // State untuk pemilihan parameter dan jenis grafik
  const [selectedParameters, setSelectedParameters] = useState({
    xAxis: '',
    yAxis: '',
    groupBy: ''
  });
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  
  // State untuk judul, deskripsi, dan status penyimpanan visualisasi
  const [chartTitle, setChartTitle] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [visualizationError, setVisualizationError] = useState(false); // State baru untuk error visualisasi
  
  // State untuk unggah file
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Fungsi untuk menangani pemilihan file
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadError('');
    } else {
      setSelectedFile(null);
      setUploadError('Hanya file CSV yang diperbolehkan!');
    }
  };

  // Fungsi untuk mengunggah file
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError('Unggah file terlebih dahulu!');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('http://localhost:5002/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setUploadStatus('File berhasil diunggah!');
        setSelectedFile(null);
        // Reset form file input
        document.getElementById('csv-upload').value = '';
        // Refresh daftar tabel yang tersedia
        if (availableTables.length > 0) {
          const filteredTables = availableTables.filter(
            table => table !== 'visualisasi' && table !== 'parameter_visualisasi' && table !== 'analisis' && table !== 'analisis_visualisasi' && table !== 'metadata' && table !== 'kolom_definisi'
          );
          
          const tableData = filteredTables.map(table => ({
            name: table,
            checked: false,
            hidden: false
          }));
          
          setAvailableData(tableData);
        }
        // Hilangkan pesan sukses setelah 3 detik
        setTimeout(() => setUploadStatus(''), 3000);
      } else {
        setUploadError(result.error || 'Gagal mengunggah file!');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadError('Terjadi kesalahan saat mengunggah file!');
    }
  };

  // Mengambil daftar tabel saat komponen dimuat
  useEffect(() => {
    if (availableTables.length > 0) {
      // Filter tabel visualisasi dan parameter_visualisasi
      const filteredTables = availableTables.filter(
        table => table !== 'visualisasi' && table !== 'parameter_visualisasi' && table!== 'analisis' && table!== 'analisis_visualisasi' && table!== 'metadata' && table!== 'kolom_definisi'
      );
      
      // Cek localStorage untuk status file tersembunyi
      const savedHiddenStatus = localStorage.getItem('hiddenFiles');
      let hiddenFilesData = [];
      
      if (savedHiddenStatus) {
        try {
          hiddenFilesData = JSON.parse(savedHiddenStatus);
        } catch (e) {
          console.error('Error parsing hidden files from localStorage:', e);
          hiddenFilesData = [];
        }
      }
      
      const tableData = filteredTables.map(table => {
        // Cek apakah file ini tersembunyi berdasarkan data dari localStorage
        const isHidden = hiddenFilesData.includes(table);
        return {
          name: table,
          checked: false,
          hidden: isHidden
        };
      });
      
      setAvailableData(tableData);
      
      // Update state hiddenFiles berdasarkan data dari localStorage
      const hiddenFiles = tableData.filter(file => file.hidden);
      setHiddenFiles(hiddenFiles);
    }
  }, [availableTables]);

  // Fungsi untuk menyembunyikan file
  const handleHideFile = (index) => {
    if (window.confirm('Apakah Anda yakin ingin menyembunyikan file ini?')) {
      const updatedData = [...availableData];
      const fileToHide = updatedData[index];
      
      // Tandai file sebagai tersembunyi
      fileToHide.hidden = true;
      
      // Jika file sedang dicentang, hapus dari data yang dipilih
      if (fileToHide.checked) {
        fileToHide.checked = false;
        const newSelectedData = { ...selectedData };
        delete newSelectedData[fileToHide.name];
        setSelectedData(newSelectedData);
      }
      
      setAvailableData(updatedData);
      const updatedHiddenFiles = [...hiddenFiles, fileToHide];
      setHiddenFiles(updatedHiddenFiles);
      
      // Simpan status file tersembunyi ke localStorage
      const hiddenFileNames = updatedData
        .filter(file => file.hidden)
        .map(file => file.name);
      localStorage.setItem('hiddenFiles', JSON.stringify(hiddenFileNames));
    }
  };
  
  // Fungsi untuk mengembalikan file yang disembunyikan
  const handleRestoreFile = (index) => {
    const fileToRestore = availableData.filter(data => data.hidden)[index];
    
    // Tandai file sebagai tidak tersembunyi
    const updatedAvailableData = [...availableData];
    const fileIndex = updatedAvailableData.findIndex(file => file.name === fileToRestore.name);
    
    if (fileIndex !== -1) {
      updatedAvailableData[fileIndex].hidden = false;
      setAvailableData(updatedAvailableData);
      
      // Update hiddenFiles state
      const updatedHiddenFiles = updatedAvailableData.filter(file => file.hidden);
      setHiddenFiles(updatedHiddenFiles);
      
      // Simpan status file tersembunyi yang diperbarui ke localStorage
      const hiddenFileNames = updatedAvailableData
        .filter(file => file.hidden)
        .map(file => file.name);
      localStorage.setItem('hiddenFiles', JSON.stringify(hiddenFileNames));
    }
  };

  // Fungsi untuk mengurutkan data
  const sortedAvailableData = [...availableData].sort((a, b) => {
    if (!showHiddenFiles) {
      // Hanya urutkan data yang tidak disembunyikan
      if (a.hidden && !b.hidden) return 1;
      if (!a.hidden && b.hidden) return -1;
    }
    return a.name.localeCompare(b.name);
  });
  
  // Fungsi untuk menangani perubahan checkbox
  const handleCheckboxChange = async (index) => {
  const updatedData = [...availableData];
  const currentData = sortedAvailableData[index];
  const originalIndex = updatedData.findIndex(item => item.name === currentData.name);
  
  updatedData[originalIndex].checked = !updatedData[originalIndex].checked;
  setAvailableData(updatedData);
  
  // Jika checkbox dicentang, ambil data
  if (updatedData[originalIndex].checked) {
    try {
      const tableName = updatedData[originalIndex].name;
      const data = await fetchData(tableName);
      setSelectedData(prev => ({
        ...prev,
        [tableName]: data
      }));
    } catch (error) {
      console.error(`Error fetching data:`, error);
    }
  } else {
    // Jika checkbox tidak dicentang, hapus data
    const newSelectedData = { ...selectedData };
    delete newSelectedData[updatedData[originalIndex].name];
    setSelectedData(newSelectedData);
  }
};

  // State baru untuk mengontrol tampilan visualisasi
  const [showVisualization, setShowVisualization] = useState(false);
  
  // Fungsi untuk menjalankan query SQL
  const runQuery = async () => {
    if (!sqlQuery.trim()) {
      setQueryError('Query wajib diisi!');
      return;
    }
    
    // Validasi untuk mencegah query modifikasi data
    const forbiddenKeywords = [
      'insert',     // Menambahkan data ke tabel
      'update',     // Mengubah data yang ada
      'delete',     // Menghapus data dari tabel
      'drop',       // Menghapus tabel, view, atau database
      'alter',      // Mengubah struktur tabel (tambah/hapus kolom, ubah tipe)
      'create',     // Membuat objek baru (tabel, view, dll)
      'truncate',   // Menghapus semua baris dalam tabel tanpa bisa rollback
      'replace',    // Kombinasi insert dan delete
      'merge',      // Gabungan insert/update/delete berdasarkan kondisi
      'call',       // Memanggil prosedur tersimpan
      'exec',       // Menjalankan prosedur/fungsi (alias dari EXECUTE)
      'execute',    // Menjalankan prosedur atau dynamic SQL
      'grant',      // Memberikan hak akses ke pengguna
      'revoke',     // Mencabut hak akses pengguna
      'into',       // SELECT INTO bisa membuat tabel baru
      'set',        // Mengubah variabel sesi atau konfigurasi
      'dblink',     // PostgreSQL: akses database eksternal – potensi kebocoran data
      'load',       // MySQL: LOAD DATA INFILE – bisa masukkan file dari server
      'outfile'     // MySQL: SELECT INTO OUTFILE – bisa tulis file ke server, risiko keamanan tinggi
    ];
    const queryLower = sqlQuery.toLowerCase();
    
    for (const keyword of forbiddenKeywords) {
      if (queryLower.includes(keyword)) {
        setQueryError(`Query ${keyword.toUpperCase()} tidak diizinkan!`);
        return;
      }
    }
    
    // Validasi query untuk file tersembunyi
    const hiddenTableNames = availableData
      .filter(file => file.hidden)
      .map(file => file.name);
    
    // Cek apakah query menggunakan tabel yang disembunyikan
    let queryUsesHiddenTable = false;
    for (const tableName of hiddenTableNames) {
      // Cek apakah query mengandung nama tabel yang disembunyikan
      // Gunakan regex untuk mencocokkan nama tabel yang berdiri sendiri
      // atau diikuti dengan spasi, titik, koma, atau karakter lainnya
      const tableRegex = new RegExp(`\\b${tableName}\\b`, 'i');
      if (tableRegex.test(sqlQuery)) {
        queryUsesHiddenTable = true;
        break;
      }
    }
    
    if (queryUsesHiddenTable) {
      setQueryError('Query tidak dapat dijalankan karena menggunakan tabel yang disembunyikan!');
      return;
    }
    
    try {
      setQueryError(null);
      const result = await executeQuery(sqlQuery);
      setQueryResult(result);
      
      // Update kolom untuk visualisasi jika hasil query result tidak kosong
      if (result.length > 0) {
        setAvailableColumns(Object.keys(result[0]));
      }
      
      // Reset judul dan deskripsi
      setChartTitle('');
      setChartDescription('');
      setTitleError(false);
      setSaveSuccess(false);
      
      // Reset parameters visualisasi
      setSelectedParameters({
        xAxis: '',
        yAxis: '',
        groupBy: ''
      });
      setChartData([]);
      setChartType('bar');
      setShowVisualization(false);
      
      // Menampilkan pesan sukses setelah query berhasil dijalankan
      setQuerySuccess(true);
      setTimeout(() => {
        setQuerySuccess(false);
      }, 3000);

    } catch (error) {
      console.error('Error executing SQL query:', error);
      setQueryError(error.message);
      setQueryResult([]);
    }
  };
  
  // Fungsi untuk mendapatkan kolom dari hasil query
  const getColumns = (data) => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  };
  
  // Fungsi untuk mengupdate parameter grafik
  const handleParameterChange = (paramName, value) => {
    setSelectedParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
    setShowVisualization(false); // Reset tampilan visualisasi saat parameter berubah
  };

  // Fungsi untuk menjalankan visualisasi
  const handleRunVisualization = () => {
    if (!selectedParameters.xAxis || !selectedParameters.yAxis) {
      setVisualizationError(true);
      return;
    }
    setVisualizationError(false);
    
    // Generate data untuk visualisasi
    let data = [...queryResult];
    
    // Jika ada groupBy, lakukan agregasi
    if (selectedParameters.groupBy) {
      const grouped = {};
      data.forEach(item => {
        const key = item[selectedParameters.groupBy];
        if (!grouped[key]) {
          grouped[key] = {
            [selectedParameters.xAxis]: item[selectedParameters.xAxis],
            [selectedParameters.groupBy]: key,
            [selectedParameters.yAxis]: 0,
            count: 0
          };
        }
        grouped[key][selectedParameters.yAxis] += parseFloat(item[selectedParameters.yAxis]) || 0;
        grouped[key].count += 1;
      });
      
      // Konversi kembali ke array
      data = Object.values(grouped).map(item => ({
        ...item,
        [selectedParameters.yAxis]: item[selectedParameters.yAxis] / item.count
      }));
    }
    
    // Pastikan nilai numerik untuk sumbu Y
    data = data.map(item => ({
      ...item,
      [selectedParameters.yAxis]: parseFloat(item[selectedParameters.yAxis]) || 0
    }));
    
    setChartData(data);
    setShowVisualization(true);
  };
  
  // Fungsi untuk menghasilkan data grafik berdasarkan parameter yang dipilih
  useEffect(() => {
    if (queryResult.length > 0 && selectedParameters.xAxis && selectedParameters.yAxis) {
      let data = [...queryResult];
      
      // Jika ada groupBy, lakukan agregasi
      if (selectedParameters.groupBy) {
        const grouped = {};
        data.forEach(item => {
          const key = item[selectedParameters.groupBy];
          if (!grouped[key]) {
            grouped[key] = {
              [selectedParameters.xAxis]: item[selectedParameters.xAxis],
              [selectedParameters.groupBy]: key,
              [selectedParameters.yAxis]: 0,
              count: 0
            };
          }
          grouped[key][selectedParameters.yAxis] += parseFloat(item[selectedParameters.yAxis]) || 0;
          grouped[key].count += 1;
        });
        
        // Konversi kembali ke array
        data = Object.values(grouped).map(item => ({
          ...item,
          [selectedParameters.yAxis]: item[selectedParameters.yAxis] / item.count
        }));
      }
      
      // Pastikan nilai numerik untuk sumbu Y
      data = data.map(item => ({
        ...item,
        [selectedParameters.yAxis]: parseFloat(item[selectedParameters.yAxis]) || 0
      }));
      
      setChartData(data);
    }
  }, [queryResult, selectedParameters]);
  
  // Fungsi untuk menyimpan visualisasi
  const saveVisualization = async () => {
    // Reset pesan status
    setSaveSuccess(false);
    setSaveError(false);
    setVisualizationError(false);
    
    // Validasi judul dan visualisasi (keduanya wajib diisi)
    let hasError = false;
    
    if (!chartTitle.trim()) {
      setTitleError(true);
      hasError = true;
    } else {
      setTitleError(false);
    }
    
    if (chartData.length === 0 || !selectedParameters.xAxis || !selectedParameters.yAxis) {
      setVisualizationError(true);
      hasError = true;
    }
    
    if (hasError) {
      return;
    }
    
    setTitleError(false);
    
    // Buat objek visualisasi
    const visualization = {
      judul: chartTitle,
      deskripsi: chartDescription,
      jenis_grafik: chartType,
      query_sql: sqlQuery,
      berparameter: !!selectedParameters.xAxis || !!selectedParameters.yAxis || !!selectedParameters.groupBy,
      chart_data: JSON.stringify(chartData) // Simpan data chart yang sebenarnya
    };
    
    // Buat objek parameter jika ada
    const parameter = {
      parameter_x: selectedParameters.xAxis,
      parameter_y: selectedParameters.yAxis,
      group_by: selectedParameters.groupBy || null
    };
    
    try {
      // Kirim data ke server
      const response = await fetch('http://localhost:5002/api/visualizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visualization, parameter })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSaveSuccess(true);

        // Timeout 3 detik untuk menghilangkan pesan sukses
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
        
        // Tampilkan pop-up konfirmasi
        if (window.confirm('Visualisasi berhasil disimpan! Apakah anda ingin menggunakan hasil query yang sama?')) {
          // Jika iya, pertahankan query dan hasil query, reset parameter saja
          setSelectedParameters({
            xAxis: '',
            yAxis: '',
            groupBy: ''
          });
          setChartData([]);
          setChartTitle('');
          setChartDescription('');
        } else {
          // Jika tidak, reset semua
          setSqlQuery('');
          setQueryResult([]);
          setChartData([]);
          setChartTitle('');
          setChartDescription('');
          setSelectedParameters({
            xAxis: '',
            yAxis: '',
            groupBy: ''
          });
          setAvailableColumns([]);
          setChartType('bar');
        }
      } else {
        setSaveError(true);
        console.error('Error saving visualization:', result.error);
      }
    } catch (error) {
      setSaveError(true);
      console.error('Error saving visualization:', error);
    }
  };

  // Render grafik berdasarkan jenis yang dipilih
  const renderChart = () => {
    if (!showVisualization || chartData.length === 0 || !selectedParameters.xAxis || !selectedParameters.yAxis) {
      return (
        <div className="no-chart-data">
          {!showVisualization ? 'Klik tombol "Jalankan Visualisasi" untuk menampilkan grafik' : 'Pilih parameter terlebih dahulu'}
        </div>
      );
    }
    
    const dataKey = selectedParameters.xAxis;
    const valueKey = selectedParameters.yAxis;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'bar' ? (
          <BarChart data={chartData}>
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
        ) : chartType === 'line' ? (
          <LineChart data={chartData}>
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
        ) : chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
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
            <Scatter name={`${dataKey} vs ${valueKey}`} data={chartData} fill="#8884d8" />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    );
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
            {activeTab === 'data' && (
              <div className="data-explorer">
                <h1>Membuat Visualisasi</h1>

                {/* Unggah Data */}
                <div className="upload-section" style={{ marginBottom: '20px' }}>
                  <h2>Unggah Data</h2>
                  <div className="upload-container">
                    <input
                      type="file"
                      id="csv-upload"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="upload-input"
                    />
                  </div>
                  <button
                    className="upload-button"
                    onClick={handleUpload}
                  >
                    Unggah
                  </button>

                  {uploadError && (
                  <div className="input-error-message" style={{ marginTop: '10px' }}>
                    {uploadError}
                  </div>
                )}
                {uploadStatus && (
                  <div className="save-success-message" style={{ marginTop: '10px' }}>
                    {uploadStatus}
                  </div>
                )}
                </div>

                {/* Katalog Data */}
                <div className="catalog-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h2>Katalog Data</h2>
                    <button 
                      className={showHiddenFiles ? "save-button" : "cancel-button"}
                      onClick={() => setShowHiddenFiles(!showHiddenFiles)}
                      style={{ padding: '5px 10px', marginLeft: '10px' }}
                    >
                      {showHiddenFiles ? "Katalog Data" : "Disembunyikan"}
                    </button>
                  </div>
                  
                  {!showHiddenFiles ? (
                    <div className="data-table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Pilih</th>
                            <th>Nama File</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedAvailableData.filter(data => !data.hidden).map((data, index) => (
                            <tr key={index}>
                              <td>
                                <input 
                                  type="checkbox" 
                                  checked={data.checked} 
                                  onChange={() => handleCheckboxChange(index)}
                                />
                              </td>
                              <td>{data.name}</td>
                              <td>
                                <button 
                                  className="delete-button"
                                  onClick={() => handleHideFile(index)}
                                  style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                                >
                                  Sembunyikan
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="data-table-container">
                      <h3>File yang Disembunyikan</h3>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Nama File</th>
                            <th>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedAvailableData.filter(data => data.hidden).map((data, index) => (
                            <tr key={index}>
                              <td>{data.name}</td>
                              <td>
                                <button 
                                  className="save-button"
                                  onClick={() => handleRestoreFile(index)}
                                  style={{ padding: '3px 8px', fontSize: '0.8rem' }}
                                >
                                  Kembalikan
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Preview Data */}
                {Object.keys(selectedData).length > 0 && (
                  <div className="preview-section">
                    <h2>Preview Data</h2>
                    {Object.entries(selectedData).map(([name, data]) => {
                      const columns = data.length > 0 ? Object.keys(data[0]) : [];
                      return (
                        <div key={name} className="preview-table-container">
                          <h4>{name}</h4>
                          <div className="data-table-container"
                            style={{
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              overflowX: 'auto',
                              overflowY: 'visible',
                              maxHeight: 'none',
                              height: 'auto'
                            }}>
                            <table className="data-table" style={{
                              width: '100%',
                              whiteSpace: 'nowrap'
                            }}>
                              <thead>
                                <tr>
                                  {columns.map((col, i) => (
                                    <th key={i} style={{
                                      padding: '8px 12px',
                                      borderBottom: '2px solid #dee2e6',
                                      backgroundColor: '#f8f9fa'
                                    }}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {data.slice(0, 10).map((row, i) => (
                                  <tr key={i} style={{
                                    borderBottom: '1px solid #dee2e6'
                                  }}>
                                    {columns.map((col, j) => (
                                      <td key={j} style={{
                                        padding: '8px 12px'
                                      }}>
                                        {typeof row[col] === 'string' && row[col].includes('T17:00:00.000Z')
                                          ? row[col].split('T')[0]
                                          : row[col]}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Masukan Query SQL */}
                <div className="query-section">
                  <h2>Query SQL</h2>
                  <div className="query-input-container">
                    <textarea 
                      className="sql-input"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="Masukkan query SQL"
                      rows={4}
                    />
                    <button 
                      className="execute-button"
                      onClick={runQuery}
                    >
                      Jalankan Query
                    </button>
                  </div>
                  {queryError && (
                    <div className="input-error-message">
                      {queryError}
                    </div>
                  )}
                  {querySuccess && (
                    <div className="save-success-message">
                      Query berhasil dijalankan!
                    </div>
                  )}
                </div>
                
                {/* Hasil Query */}
                <div className="query-result-section">
                <h2>Hasil Query</h2>
                {queryError && (
                  <div className="input-error-message">
                    {queryError}
                  </div>
                )}
                {queryResult.length > 0 && (
                  <div className="data-table-container" 
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      overflowX: 'auto',
                      overflowY: 'visible',
                      maxHeight: 'none',
                      height: 'auto'
                    }}>
                    <table className="data-table" style={{
                      width: '100%',
                      whiteSpace: 'nowrap'
                    }}>
                      <thead>
                        <tr>
                          {getColumns(queryResult).map((col, i) => (
                            <th key={i} style={{
                              padding: '8px 12px',
                              borderBottom: '2px solid #dee2e6',
                              backgroundColor: '#f8f9fa'
                            }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {queryResult.slice(0, 10).map((row, i) => (
                          <tr key={i} style={{
                            borderBottom: '1px solid #dee2e6'
                          }}>
                            {getColumns(queryResult).map((col, j) => (
                              <td key={j} style={{
                                padding: '8px 12px'
                              }}>
                                {typeof row[col] === 'string' && row[col].includes('T17:00:00.000Z')
                                  ? row[col].split('T')[0]
                                  : row[col]}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                </div>
                
                {/* Chart Parameter Selection */}
                <div className="chart-params-section">
                  <h2>Visualisasi Data</h2>
                  <div className="chart-params-container">
                    <div className="chart-param-group">
                      <label>Jenis Grafik:</label>
                      <select 
                        value={chartType} 
                        onChange={(e) => setChartType(e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="scatter">Scatter Plot</option>
                        <option value="pie">Pie Chart</option>
                      </select>
                    </div>
                    
                    <div className="chart-param-group">
                      <label>Parameter X:</label>
                      <select 
                        value={selectedParameters.xAxis} 
                        onChange={(e) => handleParameterChange('xAxis', e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="">Pilih Parameter</option>
                        {availableColumns.map((col, i) => (
                          <option key={i} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="chart-param-group">
                      <label>Parameter Y:</label>
                      <select 
                        value={selectedParameters.yAxis} 
                        onChange={(e) => handleParameterChange('yAxis', e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="">Pilih Parameter</option>
                        {availableColumns.map((col, i) => (
                          <option key={i} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="chart-param-group">
                      <label>Group By (Opsional):</label>
                      <select 
                        value={selectedParameters.groupBy} 
                        onChange={(e) => handleParameterChange('groupBy', e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="">Tidak Ada</option>
                        {availableColumns.map((col, i) => (
                          <option key={i} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>

                    <button 
                      className="execute-button"
                      onClick={handleRunVisualization}
                      style={{ marginTop: '10px' }}
                    >
                      Jalankan Visualisasi
                    </button>
                    
                    {visualizationError && (
                      <div className="input-error-message">
                        Pilih parameter terlebih dahulu!
                      </div>
                    )}
                  </div>
                  
                  {/* Chart Visualization */}
                  <div className="chart-container">
                    {renderChart()}
                  </div>
                </div>

                {/* Chart Title, Description, and Save Button */}
                <div className="chart-save-section">
                  <div className="chart-input-group">
                    <label htmlFor="chart-title">Judul Visualisasi: <span className="required">*</span></label>
                    <input 
                      id="chart-title"
                      type="text" 
                      value={chartTitle} 
                      onChange={(e) => setChartTitle(e.target.value)}
                      className={`chart-input ${titleError ? 'input-error' : ''}`}
                      placeholder="Masukkan judul visualisasi"
                    />
                    {titleError && <div className="input-error-message">Judul visualisasi wajib diisi!</div>}
                  </div>
                  
                  <div className="chart-input-group">
                    <label htmlFor="chart-description">Deskripsi (Opsional):</label>
                    <textarea 
                      id="chart-description"
                      value={chartDescription} 
                      onChange={(e) => setChartDescription(e.target.value)}
                      className="chart-input"
                      placeholder="Masukkan deskripsi visualisasi"
                      rows={3}
                    />
                  </div>
                  
                  <button 
                    className="save-button"
                    onClick={saveVisualization}
                  >
                    Simpan Visualisasi
                  </button>
                    
                  {saveSuccess && (
                    <div className="save-success-message">
                      Visualisasi berhasil disimpan!
                    </div>
                  )}
                    
                  {saveError && (
                    <div className="input-error-message">
                      Visualisasi gagal disimpan!
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'analisis' && <Analisis />}
          </div>
        )}
      </Sidebar>
    </div>
  );
};

export default HalamanVisualisasi;