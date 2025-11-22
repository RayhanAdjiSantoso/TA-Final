import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import ProtectedRoute from './ProtectedRoute';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const BuatVisualisasi = () => {
  const navigate = useNavigate();
  const { isLoading, error, availableTables, fetchData, executeQuery } = useData();
  const { user } = useAuth();
  
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState([]);
  const [queryError, setQueryError] = useState(null);
  const [querySuccess, setQuerySuccess] = useState(false);
  const [showVisualization, setShowVisualization] = useState(false);
  const [queryParams, setQueryParams] = useState([{ name: '', value: '' }]);
  
  const [selectedParameters, setSelectedParameters] = useState({
    xAxis: '',
    yAxis: '',
    groupBy: ''
  });
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  
  const [chartTitle, setChartTitle] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [visualizationError, setVisualizationError] = useState(false);
  
  const [availableDatabases, setAvailableDatabases] = useState([]);
  const [selectedDatabase, setSelectedDatabase] = useState('');
  const [selectedDatabaseForSave, setSelectedDatabaseForSave] = useState('');
  const [hiddenTables, setHiddenTables] = useState([]);

  const fetchAvailableDatabases = async () => {
    try {
      const response = await fetch('http://localhost:5002/api/databases');
      if (response.ok) {
        const databases = await response.json();
        setAvailableDatabases(databases);
        if (databases.length > 0) {
          // Gunakan id_database (numerik) bukan value (string)
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

  // useEffect untuk load hidden tables
  useEffect(() => {
    const loadHiddenTables = () => {
      try {
        const saved = localStorage.getItem('hiddenTables');
        const parsed = saved ? JSON.parse(saved) : [];
        setHiddenTables(parsed);
        console.log('Loaded hidden tables for validation:', parsed);
      } catch (error) {
        console.error('Error loading hidden tables:', error);
        setHiddenTables([]);
      }
    };
    
    loadHiddenTables();
  }, []);

  const getColumns = (data) => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  };

  const addQueryParam = () => {
    setQueryParams([...queryParams, { name: '', value: '' }]);
  };

  const removeQueryParam = (index) => {
    const newParams = [...queryParams];
    newParams.splice(index, 1);
    setQueryParams(newParams);
  };

  const handleParamChange = (index, field, value) => {
    const newParams = [...queryParams];
    newParams[index][field] = value;
    setQueryParams(newParams);
  };

  const runQuery = async () => {
    if (!sqlQuery.trim()) {
      setQueryError('Query wajib diisi!');
      return;
    }
    
    const forbiddenKeywords = [
      'insert', 'update', 'delete', 'drop', 'alter', 'create', 'truncate',
      'replace', 'merge', 'call', 'exec', 'execute', 'grant', 'revoke',
      'into', 'set', 'dblink', 'load', 'outfile'
    ];
    const queryLower = sqlQuery.toLowerCase();
    
    for (const keyword of forbiddenKeywords) {
      if (queryLower.includes(keyword)) {
        setQueryError(`Query ${keyword.toUpperCase()} tidak diizinkan!`);
        return;
      }
    }
    
    // VALIDASI TABEL TERSEMBUNYI
    try {
      const validationResponse = await fetch('http://localhost:5002/api/validate-query-tables', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: sqlQuery,
          hiddenTables: hiddenTables
        })
      });
      
      const validationResult = await validationResponse.json();
      
      if (!validationResult.valid) {
        setQueryError(
          `Tidak dapat menjalankan query! ` +
          `Tabel berikut sedang disembunyikan: ${validationResult.blockedTables.join(', ')}. ` +
          `Silakan tampilkan kembali tabel tersebut di Katalog Data.`
        );
        return;
      }
    } catch (error) {
      console.error('Error validating hidden tables:', error);
    }
    
    try {
      setQueryError(null);
      
      const params = {};
      queryParams.forEach(param => {
        if (param.name && param.value) {
          let value = String(param.value).trim(); // PENTING: Konversi ke string dulu!
          
          console.log(`Processing parameter "${param.name}": original value = "${param.value}" (type: ${typeof param.value})`);
          
          // KONVERSI OTOMATIS: Deteksi format tanggal integer (YYYYMMDD) dan konversi ke string YYYY-MM-DD
          if (/^\d{8}$/.test(value)) {
            // Format: YYYYMMDD -> YYYY-MM-DD
            const converted = `${value.substring(0,4)}-${value.substring(4,6)}-${value.substring(6,8)}`;
            console.log(`✓ Auto-converted date parameter "${param.name}": ${value} -> ${converted}`);
            value = converted;
          }
          // Deteksi format DD/MM/YYYY dan konversi ke YYYY-MM-DD
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
            const [day, month, year] = value.split('/');
            const converted = `${year}-${month}-${day}`;
            console.log(`✓ Auto-converted date parameter "${param.name}": ${param.value} -> ${converted}`);
            value = converted;
          }
          // Format YYYY-MM-DD sudah benar
          else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            console.log(`✓ Date parameter "${param.name}" already in correct format: ${value}`);
          }
          else {
            console.log(`→ Parameter "${param.name}" kept as-is: ${value}`);
          }
          
          params[param.name] = value;
        }
      });
      
      console.log('=== FINAL PARAMS BEING SENT ===');
      console.log('Params object:', params);
      console.log('Params with types:', Object.entries(params).map(([key, val]) => 
        `${key}: ${typeof val} = "${val}"`
      ));
      console.log('================================');
      
      const result = await executeQuery(sqlQuery, params);
      setQueryResult(result);
      
      if (result.length > 0) {
        setAvailableColumns(Object.keys(result[0]));
      }
      
      setChartTitle('');
      setChartDescription('');
      setTitleError(false);
      setSaveSuccess(false);
      setSelectedParameters({
        xAxis: '',
        yAxis: '',
        groupBy: ''
      });
      setChartData([]);
      setChartType('bar');
      setShowVisualization(false);
      
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

  const handleParameterChange = (paramName, value) => {
    setSelectedParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
    setShowVisualization(false);
  };

  const handleRunVisualization = () => {
    if (!selectedParameters.xAxis || !selectedParameters.yAxis) {
      setVisualizationError(true);
      return;
    }
    setVisualizationError(false);
    
    let data = [...queryResult];
    
    if (chartType === 'boxplot') {
      const grouped = {};
      data.forEach(item => {
        const key = item[selectedParameters.xAxis];
        if (!grouped[key]) {
          grouped[key] = [];
        }
        const value = parseFloat(item[selectedParameters.yAxis]);
        if (!isNaN(value)) {
          grouped[key].push(value);
        }
      });
      
      data = Object.keys(grouped).map(key => {
        const values = grouped[key].sort((a, b) => a - b);
        const n = values.length;
        
        if (n === 0) return null;
        
        const getPercentile = (arr, p) => {
          const index = (arr.length - 1) * p;
          const lower = Math.floor(index);
          const upper = Math.ceil(index);
          const weight = index % 1;
          
          if (lower === upper) {
            return arr[lower];
          }
          return arr[lower] * (1 - weight) + arr[upper] * weight;
        };
        
        const min = values[0];
        const max = values[n - 1];
        const q1 = getPercentile(values, 0.25);
        const median = getPercentile(values, 0.5);
        const q3 = getPercentile(values, 0.75);
        
        const iqr = q3 - q1;
        const lowerWhisker = Math.max(min, q1 - 1.5 * iqr);
        const upperWhisker = Math.min(max, q3 + 1.5 * iqr);
        
        const outliers = values.filter(v => v < lowerWhisker || v > upperWhisker);
        const mean = values.reduce((a, b) => a + b, 0) / n;
        
        return {
          category: key,
          min: min,
          q1: q1,
          median: median,
          q3: q3,
          max: max,
          lowerWhisker: lowerWhisker,
          upperWhisker: upperWhisker,
          outliers: outliers,
          mean: mean,
          count: n
        };
      }).filter(item => item !== null);
    }
    else if (selectedParameters.groupBy) {
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
      
      data = Object.values(grouped).map(item => ({
        ...item,
        [selectedParameters.yAxis]: item[selectedParameters.yAxis] / item.count
      }));
    }
    
    if (chartType !== 'boxplot') {
      data = data.map(item => ({
        ...item,
        [selectedParameters.yAxis]: parseFloat(item[selectedParameters.yAxis]) || 0
      }));
    }
    
    setChartData(data);
    setShowVisualization(true);
  };

  const handleSaveVisualization = async () => {
    if (!chartTitle.trim()) {
      setTitleError(true);
      return;
    }
    
    setTitleError(false);
    
    try {
      // Simpan parameter query sebagai JSON string
      const parameterQueryObject = {};
      queryParams.forEach(param => {
        if (param.name && param.value) {
          parameterQueryObject[param.name] = param.value;
        }
      });
      
      const parameterQueryString = Object.keys(parameterQueryObject).length > 0 
        ? JSON.stringify(parameterQueryObject)
        : null;
      
      console.log('=== SAVING VISUALIZATION ===');
      console.log('Query parameters:', parameterQueryObject);
      console.log('Parameter query string:', parameterQueryString);
      
      const visualisasiData = {
        judul: chartTitle,
        deskripsi: chartDescription,
        jenis_grafik: chartType,
        query_sql: sqlQuery,
        parameter_query: parameterQueryString, // Tambahkan parameter_query
        chart_data: JSON.stringify(chartData),
        database: selectedDatabaseForSave,
        created_by: user.id_user
      };
      
      const parameterData = {
        parameter_x: selectedParameters.xAxis,
        parameter_y: selectedParameters.yAxis,
        parameter_group: selectedParameters.groupBy || null
      };
      
      console.log('Visualisasi data being sent:', visualisasiData);
      
      const response = await fetch('http://localhost:5002/api/visualizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visualisasi: visualisasiData, parameter: parameterData }),
      });
      
      if (response.ok) {
        setSaveSuccess(true);
        setSaveError(false);
        
        setTimeout(() => {
          setSaveSuccess(false);
          setChartTitle('');
          setChartDescription('');
          setSqlQuery('');
          setQueryResult([]);
          setChartData([]);
          setQueryParams([{ name: '', value: '' }]); // Reset query params
          setSelectedParameters({
            xAxis: '',
            yAxis: '',
            groupBy: ''
          });
          
          navigate('/visualisasi');
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Gagal menyimpan visualisasi');
      }
    } catch (err) {
      setSaveError(true);
      setSaveSuccess(false);
      console.error('Error saving visualization:', err);
    }
  };

  const handleBack = () => {
    navigate('/visualisasi');
  };

  // Custom BoxPlot Component using Recharts
  const CustomBoxPlot = ({ data, xAxisKey, yAxisKey }) => {
    if (!data || data.length === 0) return null;

    // Get min and max for Y axis domain
    const allValues = data.flatMap(d => [d.min, d.max]);
    const yMin = Math.min(...allValues);
    const yMax = Math.max(...allValues);
    const yPadding = (yMax - yMin) * 0.1;

    // Transform data for recharts
    const chartData = data.map(item => ({
      name: item.category,
      min: item.min,
      q1: item.q1,
      median: item.median,
      q3: item.q3,
      max: item.max,
      lowerWhisker: item.lowerWhisker,
      upperWhisker: item.upperWhisker,
      mean: item.mean,
      count: item.count,
      outliers: item.outliers
    }));

    const renderBoxPlot = (props) => {
      const { x, y, width, height, index } = props;
      
      if (!chartData[index]) return null;
      
      const item = chartData[index];
      const boxWidth = Math.min(60, width * 0.6);
      const centerX = x + width / 2;
      
      // Calculate Y positions based on chart height and data range
      const dataRange = yMax - yMin + 2 * yPadding;
      const scaleY = (value) => {
        return y + height - ((value - (yMin - yPadding)) / dataRange * height);
      };
      
      const q1Y = scaleY(item.q1);
      const q3Y = scaleY(item.q3);
      const medianY = scaleY(item.median);
      const lowerWhiskerY = scaleY(item.lowerWhisker);
      const upperWhiskerY = scaleY(item.upperWhisker);

      return (
        <g>
          {/* Lower whisker line */}
          <line
            x1={centerX}
            y1={lowerWhiskerY}
            x2={centerX}
            y2={q1Y}
            stroke="#333"
            strokeWidth={2}
          />
          <line
            x1={centerX - boxWidth / 4}
            y1={lowerWhiskerY}
            x2={centerX + boxWidth / 4}
            y2={lowerWhiskerY}
            stroke="#333"
            strokeWidth={2}
          />

          {/* Box */}
          <rect
            x={centerX - boxWidth / 2}
            y={q3Y}
            width={boxWidth}
            height={Math.abs(q1Y - q3Y)}
            fill="#8884d8"
            fillOpacity={0.6}
            stroke="#333"
            strokeWidth={2}
          />

          {/* Median line */}
          <line
            x1={centerX - boxWidth / 2}
            y1={medianY}
            x2={centerX + boxWidth / 2}
            y2={medianY}
            stroke="#333"
            strokeWidth={3}
          />

          {/* Upper whisker line */}
          <line
            x1={centerX}
            y1={q3Y}
            x2={centerX}
            y2={upperWhiskerY}
            stroke="#333"
            strokeWidth={2}
          />
          <line
            x1={centerX - boxWidth / 4}
            y1={upperWhiskerY}
            x2={centerX + boxWidth / 4}
            y2={upperWhiskerY}
            stroke="#333"
            strokeWidth={2}
          />

          {/* Outliers */}
          {item.outliers && item.outliers.map((outlier, idx) => {
            const outlierY = scaleY(outlier);
            return (
              <circle
                key={`outlier-${idx}`}
                cx={centerX}
                cy={outlierY}
                r={3}
                fill="red"
                stroke="#333"
                strokeWidth={1}
              />
            );
          })}
        </g>
      );
    };

    const CustomTooltip = ({ active, payload }) => {
      if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
          <div style={{
            backgroundColor: 'white',
            padding: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <p style={{ margin: '2px 0', fontWeight: 'bold' }}>{data.name}</p>
            <p style={{ margin: '2px 0' }}>Count: {data.count}</p>
            <p style={{ margin: '2px 0' }}>Min: {data.min.toFixed(2)}</p>
            <p style={{ margin: '2px 0' }}>Q1: {data.q1.toFixed(2)}</p>
            <p style={{ margin: '2px 0' }}>Median: {data.median.toFixed(2)}</p>
            <p style={{ margin: '2px 0' }}>Mean: {data.mean.toFixed(2)}</p>
            <p style={{ margin: '2px 0' }}>Q3: {data.q3.toFixed(2)}</p>
            <p style={{ margin: '2px 0' }}>Max: {data.max.toFixed(2)}</p>
            <p style={{ margin: '2px 0' }}>Outliers: {data.outliers.length}</p>
          </div>
        );
      }
      return null;
    };

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[yMin - yPadding, yMax + yPadding]} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="median" shape={renderBoxPlot} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const renderChart = () => {
    if (chartData.length === 0) return null;
    
    const { xAxis, yAxis } = selectedParameters;
    
    const getColor = (index) => {
      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
      return colors[index % colors.length];
    };
    
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxis} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yAxis} stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid />
              <XAxis type="number" dataKey={xAxis} name={xAxis} />
              <YAxis type="number" dataKey={yAxis} name={yAxis} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name={`${xAxis} vs ${yAxis}`} data={chartData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={150}
                fill="#8884d8"
                dataKey={yAxis}
                nameKey={xAxis}
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
      case 'boxplot':
        return (
          <CustomBoxPlot 
            data={chartData} 
            xAxisKey={xAxis}
            yAxisKey={yAxis}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ProtectedRoute allowedRoles={['Admin', 'Analis']}>
      <div className="dashboard-container">
        <Sidebar activeTabProp="visualisasi" />
        
        <div className="dashboard-content">
          <div className="content-header">
            <h2>Buat Visualisasi</h2>
          </div>

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
              
            <div className="form-group">
              <label htmlFor="database-select">Database untuk Menyimpan:</label>
              <select
                id="database-select"
                value={selectedDatabaseForSave}
                onChange={(e) => setSelectedDatabaseForSave(parseInt(e.target.value))} // Parse ke integer
                style={{
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  width: '100%'
                }}
              >
                {availableDatabases.map((database) => (
                  <option key={database.id_database} value={database.id_database}> {/* Gunakan id_database */}
                    {database.name} ({database.host}:{database.port || 'default'})
                  </option>
                ))}
              </select>
            </div>
            
            <button 
              className="save-button"
              onClick={handleSaveVisualization}
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
        
          <div className="content-body">
            <div className="query-section">
              <h2>Query SQL</h2>
              <div className="query-input-container">
                <textarea 
                  className="sql-input"
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  placeholder="Masukkan query SQL (gunakan :namaParameter untuk parameter)"
                  rows={4}
                />
                
                <div className="query-params-container" style={{ marginTop: '10px' }}>
                  <h3>Parameter Query</h3>
                  {queryParams.map((param, index) => (
                    <div key={index} className="query-param-row" style={{ 
                      display: 'flex', 
                      marginBottom: '8px',
                      alignItems: 'center'
                    }}>
                      <input
                        type="text"
                        placeholder="Nama Parameter"
                        value={param.name}
                        onChange={(e) => handleParamChange(index, 'name', e.target.value)}
                        style={{
                          padding: '8px',
                          marginRight: '8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          flex: '1'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Nilai Parameter"
                        value={param.value}
                        onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                        style={{
                          padding: '8px',
                          marginRight: '8px',
                          borderRadius: '4px',
                          border: '1px solid #ddd',
                          flex: '1'
                        }}
                      />
                      <button
                        onClick={() => removeQueryParam(index)}
                        style={{
                          padding: '8px',
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addQueryParam}
                    style={{
                      padding: '8px',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      marginTop: '8px'
                    }}
                  >
                    Tambah Parameter
                  </button>
                </div>
                
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
            
            {queryResult.length > 0 && (
              <div className="query-result-section">
                <h2>Hasil Query - 10 Baris Pertama</h2>
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
              </div>
            )}

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
                    <option value="boxplot">Box Plot</option>
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
              
              <div className="chart-container">
                {showVisualization && renderChart()}
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
      </div>
    </ProtectedRoute>
  );
};

export default BuatVisualisasi;