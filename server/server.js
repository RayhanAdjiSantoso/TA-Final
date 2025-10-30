const express = require('express');
const { Pool } = require('pg');
const mysql = require('mysql2/promise');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const csv = require('csv-parse');
const fs = require('fs');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Import auth routes
const authRoutes = require('./routes/auth');

// Konfigurasi koneksi PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'TA',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Verifikasi koneksi database
pool.query('SELECT current_database()', (err, res) => {
  if (err) {
    console.error('Error checking database:', err);
  } else {
    console.log('Connected to database:', res.rows[0].current_database);
  }
});

// Gunakan auth routes
app.use('/api/auth', authRoutes);

// Fungsi helper untuk menangani error
const handleQueryError = (error, operation, res) => {
  console.error(`Error ${operation}:`, error);
  res.status(500).json({ error: error.message });
};

// Endpoint untuk mendapatkan semua tabel
app.get('/api/tables', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    res.json(result.rows.map(row => row.table_name));
  } catch (error) {
    handleQueryError(error, 'fetching tables', res);
  }
});

// Endpoint untuk mendapatkan data dari tabel tertentu
app.get('/api/data/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM ${table} LIMIT 1000`);
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, `fetching data from ${table}`, res);
  }
});

// Konfigurasi multer untuk upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'text/csv') {
      return cb(new Error('Hanya file CSV yang diperbolehkan!'));
    }
    cb(null, true);
  }
});

// Endpoint untuk mendapatkan tabel dari database tertentu
app.get('/api/database/:dbValue/tables', async (req, res) => {
  const { dbValue } = req.params;
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === dbValue);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      let result;
      
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        result = await dbPool.query(
          `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
          [dbConfig.database]
        );
        
        const filteredTables = result[0]
          .map(row => row.TABLE_NAME)
          .filter(table => 
            table !== 'visualisasi' && 
            table !== 'parameter_visualisasi' && 
            table !== 'analisis' && 
            table !== 'analisis_visualisasi' && 
            table !== 'metadata' && 
            table !== 'kolom_definisi' &&
            table !== 'users'
          );
        
        res.json(filteredTables);
      } else {
        result = await dbPool.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        
        const filteredTables = result.rows
          .map(row => row.table_name)
          .filter(table => 
            table !== 'visualisasi' && 
            table !== 'parameter_visualisasi' && 
            table !== 'analisis' && 
            table !== 'analisis_visualisasi' && 
            table !== 'metadata' && 
            table !== 'kolom_definisi' &&
            table !== 'users'
          );
        
        res.json(filteredTables);
      }
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `fetching tables from database ${dbValue}`, res);
  }
});

// Endpoint untuk mendapatkan daftar database yang tersedia
app.get('/api/databases', async (req, res) => {
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    res.json(databases);
  } catch (error) {
    handleQueryError(error, 'fetching databases', res);
  }
});

// Fungsi untuk membuat koneksi database berdasarkan konfigurasi
const createDatabaseConnection = (dbConfig) => {
  if (dbConfig.value && dbConfig.value.includes('mysql')) {
    return mysql.createPool({
      user: dbConfig.user,
      host: dbConfig.host,
      database: dbConfig.database,
      password: dbConfig.password,
      port: dbConfig.port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  } else {
    return new Pool({
      user: dbConfig.user,
      host: dbConfig.host,
      database: dbConfig.database,
      password: dbConfig.password,
      port: dbConfig.port,
    });
  }
};

// Endpoint untuk upload file CSV
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file yang diunggah!' });
  }

  const filePath = req.file.path;
  const tableName = path.parse(req.file.originalname).name.toLowerCase();
  
  let selectedDatabases = [];
  try {
    selectedDatabases = JSON.parse(req.body.databases || '[]');
  } catch (error) {
    return res.status(400).json({ error: 'Format database selection tidak valid!' });
  }

  if (selectedDatabases.length === 0) {
    return res.status(400).json({ error: 'Pilih minimal satu database!' });
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const records = [];
    let headers = [];

    const parser = csv.parse({
      columns: true,
      skip_empty_lines: true
    });

    parser.on('readable', function() {
      let record;
      while (record = parser.read()) {
        records.push(record);
        if (headers.length === 0) {
          headers = Object.keys(record);
        }
      }
    });

    parser.on('end', async function() {
      const uploadResults = [];
      const errors = [];

      for (const dbConfig of selectedDatabases) {
        try {
          const dbPool = createDatabaseConnection(dbConfig);
          
          if (dbConfig.value.includes('mysql')) {
            await dbPool.query('SELECT 1');
            
            const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${headers.map(h => `\`${h}\` TEXT`).join(', ')})`;
            await dbPool.query(createTableQuery);
      
            for (const record of records) {
              const values = headers.map(h => record[h]);
              const placeholders = headers.map(() => '?').join(', ');
              const insertQuery = `INSERT INTO ${tableName} (${headers.map(h => `\`${h}\``).join(', ')}) VALUES (${placeholders})`;
              await dbPool.query(insertQuery, values);
            }
            
            await dbPool.end();
          } else {
            await dbPool.query('SELECT 1');
            
            const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${headers.map(h => `"${h}" TEXT`).join(', ')})`;
            await dbPool.query(createTableQuery);
      
            for (const record of records) {
              const values = headers.map(h => record[h]);
              const insertQuery = `INSERT INTO ${tableName} (${headers.map(h => `"${h}"`).join(', ')}) VALUES (${headers.map((_, i) => `$${i + 1}`).join(', ')})`;
              await dbPool.query(insertQuery, values);
            }
            
            await dbPool.end();
          }
      
          uploadResults.push({
            database: dbConfig.name,
            status: 'success',
            recordsInserted: records.length
          });
      
        } catch (error) {
          console.error(`Error uploading to ${dbConfig.name}:`, error);
          errors.push({
            database: dbConfig.name,
            error: error.message
          });
        }
      }

      fs.unlinkSync(filePath);

      if (uploadResults.length > 0) {
        res.json({
          success: true,
          message: `File berhasil diunggah ke ${uploadResults.length} dari ${selectedDatabases.length} database!`,
          tableName: tableName,
          results: uploadResults,
          errors: errors.length > 0 ? errors : undefined
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Gagal mengunggah ke semua database!',
          errors: errors
        });
      }
    });

    parser.write(fileContent);
    parser.end();

  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: 'Gagal membaca file!' });
  }
});

// Endpoint untuk menjalankan query SQL kustom
app.post('/api/query', async (req, res) => {
  const { query, params } = req.body;
  try {
    if (params && Object.keys(params).length > 0) {
      let modifiedQuery = query;
      const values = [];
      let paramIndex = 1;
      
      const paramMap = {};
      
      const paramRegex = /:(\w+)\b/g;
      let match;
      while ((match = paramRegex.exec(query)) !== null) {
        const paramName = match[1];
        if (!paramMap[paramName] && params[paramName] !== undefined) {
          paramMap[paramName] = paramIndex++;
          values.push(params[paramName]);
        }
      }
      
      for (const [paramName, index] of Object.entries(paramMap)) {
        const replaceRegex = new RegExp(`:${paramName}\\b`, 'g');
        modifiedQuery = modifiedQuery.replace(replaceRegex, `$${index}`);
      }
      
      const result = await pool.query(modifiedQuery, values);
      res.json(result.rows);
    } else {
      const result = await pool.query(query);
      res.json(result.rows);
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint untuk menyimpan visualisasi
app.post('/api/visualizations', async (req, res) => {
  const { visualisasi, parameter } = req.body;
  
  // Validasi input
  if (!visualisasi || !parameter) {
    return res.status(400).json({ error: 'Data visualisasi dan parameter wajib diisi' });
  }
  
  if (!visualisasi.judul || !visualisasi.jenis_grafik || !visualisasi.query_sql) {
    return res.status(400).json({ error: 'Judul, jenis grafik, dan query SQL wajib diisi' });
  }
  
  if (!parameter.parameter_x || !parameter.parameter_y) {
    return res.status(400).json({ error: 'Parameter X dan Y wajib diisi' });
  }
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === visualisasi.database);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    // Pastikan chart_data dalam format string
    const chartDataString = typeof visualisasi.chart_data === 'string' 
      ? visualisasi.chart_data 
      : JSON.stringify(visualisasi.chart_data || []);
    
    // Set default value untuk berparameter
    const berparameter = visualisasi.berparameter !== undefined 
      ? visualisasi.berparameter 
      : false;
    
    // Sanitasi deskripsi (bisa null)
    const deskripsi = visualisasi.deskripsi || null;
    
    // Log untuk debugging
    console.log('Saving visualization to:', dbConfig.name);
    console.log('Data:', {
      judul: visualisasi.judul,
      jenis_grafik: visualisasi.jenis_grafik,
      berparameter: berparameter,
      chart_data_length: chartDataString.length,
      parameter_x: parameter.parameter_x,
      parameter_y: parameter.parameter_y,
      parameter_group: parameter.parameter_group
    });
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        // MySQL Transaction
        await dbPool.query('START TRANSACTION');
        
        try {
          const [visualizationResult] = await dbPool.query(
            `INSERT INTO visualisasi (judul, deskripsi, jenis_grafik, query_sql, berparameter, chart_data, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [
              visualisasi.judul, 
              deskripsi, 
              visualisasi.jenis_grafik, 
              visualisasi.query_sql, 
              berparameter, 
              chartDataString
            ]
          );
          
          const visualizationId = visualizationResult.insertId;
          
          console.log('Visualization inserted with ID:', visualizationId);
          
          await dbPool.query(
            `INSERT INTO parameter_visualisasi (id_visualisasi, parameter_x, parameter_y, group_by, created_at) 
             VALUES (?, ?, ?, ?, NOW())`,
            [
              visualizationId, 
              parameter.parameter_x, 
              parameter.parameter_y, 
              parameter.parameter_group || null
            ]
          );
          
          await dbPool.query('COMMIT');
          
          console.log('Transaction committed successfully');
          
        } catch (error) {
          await dbPool.query('ROLLBACK');
          console.error('MySQL transaction error, rolled back:', error);
          throw error;
        }
        
      } else {
        // PostgreSQL Transaction
        await dbPool.query('BEGIN');
        
        try {
          const visualizationResult = await dbPool.query(
            `INSERT INTO visualisasi (judul, deskripsi, jenis_grafik, query_sql, berparameter, chart_data, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id_visualisasi`,
            [
              visualisasi.judul, 
              deskripsi, 
              visualisasi.jenis_grafik, 
              visualisasi.query_sql, 
              berparameter, 
              chartDataString
            ]
          );
          
          const visualizationId = visualizationResult.rows[0].id_visualisasi;
          
          console.log('Visualization inserted with ID:', visualizationId);
          
          await dbPool.query(
            `INSERT INTO parameter_visualisasi (id_visualisasi, parameter_x, parameter_y, group_by, created_at) 
             VALUES ($1, $2, $3, $4, NOW())`,
            [
              visualizationId, 
              parameter.parameter_x, 
              parameter.parameter_y, 
              parameter.parameter_group || null
            ]
          );
          
          await dbPool.query('COMMIT');
          
          console.log('Transaction committed successfully');
          
        } catch (error) {
          await dbPool.query('ROLLBACK');
          console.error('PostgreSQL transaction error, rolled back:', error);
          throw error;
        }
      }
      
      res.status(201).json({ 
        success: true, 
        message: 'Visualisasi berhasil disimpan' 
      });
      
    } finally {
      await dbPool.end();
    }
    
  } catch (error) {
    console.error('Error saving visualization:', error);
    console.error('Error stack:', error.stack);
    
    // Kirim response error yang lebih detail
    res.status(500).json({ 
      error: 'Gagal menyimpan visualisasi',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint untuk menghapus visualisasi
app.delete('/api/visualizations/:id', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  
  try {
    const checkResult = await client.query(
      'SELECT id_visualisasi FROM visualisasi WHERE id_visualisasi = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visualisasi tidak ditemukan' });
    }

    const usageCheck = await client.query(
      'SELECT COUNT(*) as count FROM analisis_visualisasi WHERE id_visualisasi = $1',
      [id]
    );
    
    if (usageCheck.rows[0].count > 0) {
      return res.status(403).json({ 
        error: 'Visualisasi tidak dapat dihapus karena sedang digunakan dalam katalog analisis',
        usage_count: usageCheck.rows[0].count
      });
    }

    await client.query('BEGIN');

    await client.query(
      'DELETE FROM parameter_visualisasi WHERE id_visualisasi = $1',
      [id]
    );

    const deleteResult = await client.query(
      'DELETE FROM visualisasi WHERE id_visualisasi = $1',
      [id]
    );

    if (deleteResult.rowCount === 0) {
      throw new Error('Tidak ada data yang dihapus');
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Visualisasi berhasil dihapus' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Gagal menghapus visualisasi', 
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// Endpoint untuk menyimpan analisis
app.post('/api/analisis', async (req, res) => {
  const { judul, masalah, interpretasi_hasil, visualisasi_ids, database, created_by } = req.body;
  
  if (!judul || !visualisasi_ids || !visualisasi_ids.length) {
    return res.status(400).json({ error: 'Judul dan visualisasi wajib diisi' });
  }
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === database);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        await dbPool.query('BEGIN');
        
        const [analisisResult] = await dbPool.query(
          `INSERT INTO analisis (judul, masalah, interpretasi_hasil, created_at) 
           VALUES (?, ?, ?, NOW())`,
          [judul, masalah || null, interpretasi_hasil || null]
        );
        
        const analisisId = analisisResult.insertId;
        
        for (const visId of visualisasi_ids) {
          await dbPool.query(
            `INSERT INTO analisis_visualisasi (id_analisis, id_visualisasi, created_at) 
             VALUES (?, ?, NOW())`,
            [analisisId, visId]
          );
        }
        
        await dbPool.query('COMMIT');
      } else {
        await dbPool.query('BEGIN');
        
        const analisisResult = await dbPool.query(
          `INSERT INTO analisis (judul, masalah, interpretasi_hasil, created_at) 
           VALUES ($1, $2, $3, NOW()) RETURNING id_analisis`,
          [judul, masalah || null, interpretasi_hasil || null]
        );
        
        const analisisId = analisisResult.rows[0].id_analisis;
        
        for (const visId of visualisasi_ids) {
          await dbPool.query(
            `INSERT INTO analisis_visualisasi (id_analisis, id_visualisasi, created_at) 
             VALUES ($1, $2, NOW())`,
            [analisisId, visId]
          );
        }
        
        await dbPool.query('COMMIT');
      }
      
      res.status(201).json({ 
        success: true, 
        message: 'Analisis berhasil disimpan'
      });
    } catch (error) {
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        await dbPool.query('ROLLBACK');
      } else {
        await dbPool.query('ROLLBACK');
      }
      throw error;
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, 'saving analisis', res);
  }
});

// Endpoint untuk update analisis (untuk EndUser)
app.put('/api/analisis/:id', async (req, res) => {
  const { id } = req.params;
  const { judul, masalah, interpretasi_hasil } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE analisis 
       SET judul = $1, masalah = $2, interpretasi_hasil = $3
       WHERE id_analisis = $4
       RETURNING *`,
      [judul, masalah, interpretasi_hasil, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    res.json({ message: 'Analisis berhasil diupdate', data: result.rows[0] });
  } catch (error) {
    handleQueryError(error, 'updating analisis', res);
  }
});

// Endpoint untuk menghapus analisis
app.delete('/api/analisis/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const checkResult = await pool.query(
      'SELECT id_analisis FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    await pool.query(
      'DELETE FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    res.json({ success: true, message: 'Analisis berhasil dihapus' });
  } catch (error) {
    handleQueryError(error, `deleting analisis with id ${id}`, res);
  }
});

// Endpoint untuk mendapatkan semua visualisasi
app.get('/api/visualizations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, p.parameter_x, p.parameter_y, p.group_by 
       FROM visualisasi v 
       LEFT JOIN parameter_visualisasi p ON v.id_visualisasi = p.id_visualisasi 
       ORDER BY v.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, 'fetching visualizations', res);
  }
});

// Endpoint untuk mendapatkan visualisasi berdasarkan ID
app.get('/api/visualizations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT v.*, p.parameter_x, p.parameter_y, p.group_by, p.id_parameter 
       FROM visualisasi v 
       LEFT JOIN parameter_visualisasi p ON v.id_visualisasi = p.id_visualisasi 
       WHERE v.id_visualisasi = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visualisasi tidak ditemukan' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    handleQueryError(error, `fetching visualization with id ${id}`, res);
  }
});

// Endpoint untuk update visualisasi (chart_data) - untuk EndUser edit parameter
app.put('/api/visualizations/:id', async (req, res) => {
  const { id } = req.params;
  const { chart_data } = req.body;
  
  try {
    const result = await pool.query(
      `UPDATE visualisasi 
       SET chart_data = $1
       WHERE id_visualisasi = $2
       RETURNING *`,
      [chart_data, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visualisasi tidak ditemukan' });
    }
    
    res.json({ success: true, message: 'Visualisasi berhasil diupdate', data: result.rows[0] });
  } catch (error) {
    handleQueryError(error, 'updating visualization', res);
  }
});

// Endpoint untuk mendapatkan ID visualisasi yang terkait dengan analisis tertentu
app.get('/api/analisis/:id/visualisasi', async (req, res) => {
  const { id } = req.params;
  try {
    const checkResult = await pool.query(
      'SELECT id_analisis FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    const result = await pool.query(
      `SELECT id_visualisasi 
       FROM analisis_visualisasi 
       WHERE id_analisis = $1`,
      [id]
    );
    
    const visualisasiIds = result.rows.map(row => row.id_visualisasi);
    res.json(visualisasiIds);
  } catch (error) {
    handleQueryError(error, `fetching visualisasi for analisis with id ${id}`, res);
  }
});

// Endpoint untuk mendapatkan visualisasi dari database tertentu
app.get('/api/database/:dbValue/visualisasi', async (req, res) => {
  const { dbValue } = req.params;
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === dbValue);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      let result;
      
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        result = await dbPool.query(
          `SELECT * FROM visualisasi ORDER BY created_at DESC`
        );
        res.json(result[0]);
      } else {
        result = await dbPool.query(
          `SELECT * FROM visualisasi ORDER BY created_at DESC`
        );
        res.json(result.rows);
      }
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `fetching visualisasi from database ${dbValue}`, res);
  }
});

// Endpoint untuk mendapatkan parameter visualisasi dari database tertentu
app.get('/api/database/:dbValue/parameter_visualisasi', async (req, res) => {
  const { dbValue } = req.params;
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === dbValue);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      let result;
      
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        result = await dbPool.query(
          `SELECT * FROM parameter_visualisasi`
        );
        res.json(result[0]);
      } else {
        result = await dbPool.query(
          `SELECT * FROM parameter_visualisasi`
        );
        res.json(result.rows);
      }
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `fetching parameter_visualisasi from database ${dbValue}`, res);
  }
});

// Endpoint untuk mendapatkan analisis dari database tertentu
app.get('/api/database/:dbValue/analisis', async (req, res) => {
  const { dbValue } = req.params;
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === dbValue);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      let result;
      
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        result = await dbPool.query(
          `SELECT * FROM analisis ORDER BY created_at DESC`
        );
        res.json(result[0]);
      } else {
        result = await dbPool.query(
          `SELECT * FROM analisis ORDER BY created_at DESC`
        );
        res.json(result.rows);
      }
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `fetching analisis from database ${dbValue}`, res);
  }
});

// Endpoint untuk mendapatkan jumlah baris dalam tabel
app.get('/api/database/:dbValue/table/:table/count', async (req, res) => {
  const { dbValue, table } = req.params;
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === dbValue);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      const result = await dbPool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = dbConfig.value.includes('mysql') ? result[0][0].count : result.rows[0].count;
      res.json({ count: parseInt(count) });
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `counting rows in table ${table}`, res);
  }
});

// Endpoint untuk mendapatkan analisis dengan detail visualisasi dari database tertentu
app.get('/api/database/:dbValue/analisis-with-visualisasi', async (req, res) => {
  const { dbValue } = req.params;
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === dbValue);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      let result;
      
      if (dbConfig.value && dbConfig.value.includes('mysql')) {
        // Query untuk MySQL
        result = await dbPool.query(`
          SELECT 
            a.*,
            GROUP_CONCAT(v.judul SEPARATOR ', ') as visualisasi_judul,
            COUNT(DISTINCT av.id_visualisasi) as jumlah_visualisasi
          FROM analisis a
          LEFT JOIN analisis_visualisasi av ON a.id_analisis = av.id_analisis
          LEFT JOIN visualisasi v ON av.id_visualisasi = v.id_visualisasi
          GROUP BY a.id_analisis
          ORDER BY a.created_at DESC
        `);
        res.json(result[0]);
      } else {
        // Query untuk PostgreSQL
        result = await dbPool.query(`
          SELECT 
            a.*,
            STRING_AGG(v.judul, ', ') as visualisasi_judul,
            COUNT(DISTINCT av.id_visualisasi) as jumlah_visualisasi
          FROM analisis a
          LEFT JOIN analisis_visualisasi av ON a.id_analisis = av.id_analisis
          LEFT JOIN visualisasi v ON av.id_visualisasi = v.id_visualisasi
          GROUP BY a.id_analisis, a.judul, a.masalah, a.interpretasi_hasil, a.created_at
          ORDER BY a.created_at DESC
        `);
        res.json(result.rows);
      }
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `fetching analisis with visualisasi from database ${dbValue}`, res);
  }
});

// Endpoint untuk mendapatkan data dari tabel tertentu di database tertentu
app.get('/api/database/:dbValue/data/:table', async (req, res) => {
  const { dbValue, table } = req.params;
  const limit = parseInt(req.query.limit) || 10; // Default 10, parse as integer
  
  try {
    const databases = [
      {
        name: 'PostgreSQL Primary',
        value: 'postgresql_primary',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'TA',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      {
        name: 'MySQL Secondary',
        value: 'mysql_secondary',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'ta_fin',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'rayhan2510'
      },
      {
        name: 'DWH Lake',
        value: 'mysql_dwh_lake',
        host: process.env.DB_HOST_2 || 'localhost',
        port: process.env.DB_PORT_2 || 3306,
        database: process.env.DB_NAME_2 || 'dwh_lake',
        user: process.env.DB_USER_2 || 'root',
        password: process.env.DB_PASSWORD_2 || 'TheJarrdin*DWH25'
      }
    ];
    
    const dbConfig = databases.find(db => db.value === dbValue);
    if (!dbConfig) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      // PERBAIKAN: Gunakan string concatenation yang aman untuk query
      const query = `SELECT * FROM ${table} LIMIT ${limit}`;
      console.log('Executing query:', query); // Debug log
      
      const result = await dbPool.query(query);
      const data = dbConfig.value.includes('mysql') ? result[0] : result.rows;
      
      console.log(`Returned ${data.length} rows from ${table}`); // Debug log
      res.json(data);
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `fetching data from table ${table} in database ${dbValue}`, res);
  }
});

// Endpoint untuk mengecek apakah tabel tersembunyi
app.post('/api/validate-query-tables', async (req, res) => {
  const { query, hiddenTables } = req.body;
  
  if (!hiddenTables || hiddenTables.length === 0) {
    return res.json({ valid: true });
  }
  
  try {
    // Extract table names from SQL query
    const queryLower = query.toLowerCase();
    
    // Pattern untuk mendeteksi nama tabel dalam query
    // Cocok dengan: FROM table_name, JOIN table_name, INTO table_name
    const tablePatterns = [
      /from\s+([a-z_][a-z0-9_]*)/gi,
      /join\s+([a-z_][a-z0-9_]*)/gi,
      /into\s+([a-z_][a-z0-9_]*)/gi,
      /update\s+([a-z_][a-z0-9_]*)/gi,
      /table\s+([a-z_][a-z0-9_]*)/gi
    ];
    
    const tablesInQuery = new Set();
    
    for (const pattern of tablePatterns) {
      let match;
      while ((match = pattern.exec(queryLower)) !== null) {
        // Ambil nama tabel (group 1)
        const tableName = match[1].trim();
        // Skip SQL keywords
        const sqlKeywords = ['select', 'where', 'group', 'order', 'having', 'limit', 'offset', 'inner', 'outer', 'left', 'right', 'cross'];
        if (!sqlKeywords.includes(tableName)) {
          tablesInQuery.add(tableName);
        }
      }
    }
    
    console.log('Tables found in query:', Array.from(tablesInQuery));
    console.log('Hidden tables:', hiddenTables);
    
    // Check jika ada tabel yang tersembunyi
    const blockedTables = [];
    for (const table of tablesInQuery) {
      if (hiddenTables.includes(table)) {
        blockedTables.push(table);
      }
    }
    
    if (blockedTables.length > 0) {
      return res.json({
        valid: false,
        blockedTables: blockedTables,
        message: `Query menggunakan tabel yang disembunyikan: ${blockedTables.join(', ')}`
      });
    }
    
    res.json({ valid: true });
    
  } catch (error) {
    console.error('Error validating query:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});