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

// Konfigurasi koneksi PostgreSQL default (untuk sistem metadata)
const systemPool = new Pool({
  user: process.env.DB_USER || 'rayhanadjisantoso',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'TA_FIN',
  password: process.env.DB_PASSWORD || 'rayhan123',
  port: process.env.DB_PORT || 5432,
});

// Verifikasi koneksi database sistem
systemPool.query('SELECT current_database()', (err, res) => {
  if (err) {
    console.error('Error checking database:', err);
  } else {
    console.log('Connected to system database:', res.rows[0].current_database);
  }
});

// Gunakan auth routes
app.use('/api/auth', authRoutes);

// Fungsi helper untuk menangani error
const handleQueryError = (error, operation, res) => {
  console.error(`Error ${operation}:`, error);
  res.status(500).json({ error: error.message });
};

// Fungsi untuk membuat koneksi database berdasarkan konfigurasi
const createDatabaseConnection = (dbConfig) => {
  console.log('Creating connection for:', {
    jenis: dbConfig.jenis,
    host: dbConfig.host,
    username: dbConfig.username,
    database: dbConfig.nama_database,
    hasPassword: !!dbConfig.password,
    passwordLength: dbConfig.password ? dbConfig.password.length : 0
  });

  if (dbConfig.jenis === 'mysql') {
    const mysqlConfig = {
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 3306,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.nama_database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };
    
    console.log('MySQL config (password hidden):', {
      ...mysqlConfig,
      password: '***'
    });
    
    return mysql.createPool(mysqlConfig);
  } else {
    const pgConfig = {
      host: dbConfig.host || 'localhost',
      port: dbConfig.port || 5432,
      user: dbConfig.username,
      password: dbConfig.password,
      database: dbConfig.nama_database
    };
    
    console.log('PostgreSQL config (password hidden):', {
      ...pgConfig,
      password: '***'
    });
    
    return new Pool(pgConfig);
  }
};

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

// ==================== DATABASE MANAGEMENT ENDPOINTS ====================

// Endpoint untuk mendapatkan ID visualisasi yang terkait dengan analisis tertentu
app.get('/api/analisis/:id/visualisasi', async (req, res) => {
  const { id } = req.params;
  try {
    const checkResult = await systemPool.query(
      'SELECT id_analisis FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    const result = await systemPool.query(
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

// Endpoint untuk mendapatkan analisis dari database tertentu
app.get('/api/database/:dbId/analisis', async (req, res) => {
  const { dbId } = req.params;
  
  try {
    const id = dbId.replace('db_', '');
    
    const result = await systemPool.query(
      `SELECT * FROM analisis 
       WHERE penyimpanan_database = $1 OR penyimpanan_database = $2
       ORDER BY created_at DESC`,
      [id, dbId]
    );
    
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, `fetching analisis from database ${dbId}`, res);
  }
});

// Endpoint untuk mendapatkan analisis dengan detail visualisasi
app.get('/api/database/:dbId/analisis-with-visualisasi', async (req, res) => {
  const { dbId } = req.params;
  
  try {
    const id = dbId.replace('db_', '');
    
    const result = await systemPool.query(`
      SELECT 
        a.*,
        STRING_AGG(v.judul, ', ') as visualisasi_judul,
        COUNT(DISTINCT av.id_visualisasi) as jumlah_visualisasi
      FROM analisis a
      LEFT JOIN analisis_visualisasi av ON a.id_analisis = av.id_analisis
      LEFT JOIN visualisasi v ON av.id_visualisasi = v.id_visualisasi
      WHERE a.penyimpanan_database = $1 OR a.penyimpanan_database = $2
      GROUP BY a.id_analisis, a.judul, a.rumusan_masalah, a.interpretasi_hasil, a.penyimpanan_database, a.created_at
      ORDER BY a.created_at DESC
    `, [id, dbId]);
    
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, `fetching analisis with visualisasi from database ${dbId}`, res);
  }
});

// ==================== TABLE DATA ENDPOINTS ====================

// Endpoint untuk mendapatkan jumlah baris dalam tabel
app.get('/api/database/:dbId/table/:table/count', async (req, res) => {
  const { dbId, table } = req.params;
  
  try {
    const id = dbId.replace('db_', '');
    
    // Ambil informasi database
    const dbResult = await systemPool.query(
      'SELECT * FROM database_db WHERE id_database = $1',
      [id]
    );
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbConfig = dbResult.rows[0];
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      const result = await dbPool.query(`SELECT COUNT(*) as count FROM ${table}`);
      const count = result.rows ? result.rows[0].count : result[0][0].count;
      res.json({ count: parseInt(count) });
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `counting rows in table ${table}`, res);
  }
});

// Endpoint untuk mendapatkan data dari tabel tertentu di database tertentu
app.get('/api/database/:dbId/data/:table', async (req, res) => {
  const { dbId, table } = req.params;
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const id = dbId.replace('db_', '');
    
    // Ambil informasi database
    const dbResult = await systemPool.query(
      'SELECT * FROM database_db WHERE id_database = $1',
      [id]
    );
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbConfig = dbResult.rows[0];
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      const query = `SELECT * FROM ${table} LIMIT ${limit}`;
      const result = await dbPool.query(query);
      const data = result.rows || result[0];
      
      res.json(data);
    } finally {
      await dbPool.end();
    }
  } catch (error) {
    handleQueryError(error, `fetching data from table ${table} in database ${dbId}`, res);
  }
});

// Endpoint untuk mendapatkan kolom dari tabel tertentu
app.get('/api/database/:dbId/table/:table/columns', async (req, res) => {
  const { dbId, table } = req.params;
  
  try {
    const id = dbId.replace('db_', '');
    
    // Ambil id_tabel dari tabel_db
    const tableResult = await systemPool.query(
      `SELECT id_tabel FROM tabel_db 
       WHERE id_database = $1 AND nama_tabel = $2`,
      [id, table]
    );
    
    if (tableResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tabel tidak ditemukan' });
    }
    
    const tabelId = tableResult.rows[0].id_tabel;
    
    // Ambil kolom dari kolom_db
    const columnsResult = await systemPool.query(
      `SELECT nama_kolom, tipe_data 
       FROM kolom_db 
       WHERE id_tabel = $1 
       ORDER BY id_kolom`,
      [tabelId]
    );
    
    res.json(columnsResult.rows);
  } catch (error) {
    handleQueryError(error, `fetching columns for table ${table}`, res);
  }
});

// ==================== VALIDATION ENDPOINTS ====================

// Endpoint untuk mengecek apakah tabel tersembunyi
app.post('/api/validate-query-tables', async (req, res) => {
  const { query, hiddenTables } = req.body;
  
  if (!hiddenTables || hiddenTables.length === 0) {
    return res.json({ valid: true });
  }
  
  try {
    const queryLower = query.toLowerCase();
    
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
        const tableName = match[1].trim();
        const sqlKeywords = ['select', 'where', 'group', 'order', 'having', 'limit', 'offset', 'inner', 'outer', 'left', 'right', 'cross'];
        if (!sqlKeywords.includes(tableName)) {
          tablesInQuery.add(tableName);
        }
      }
    }
    
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

// ==================== LEGACY ENDPOINTS (Untuk kompatibilitas) ====================

// Endpoint untuk mendapatkan semua tabel (legacy - menggunakan system database)
app.get('/api/tables', async (req, res) => {
  try {
    const result = await systemPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    res.json(result.rows.map(row => row.table_name));
  } catch (error) {
    handleQueryError(error, 'fetching tables', res);
  }
});

// Endpoint untuk mendapatkan data dari tabel tertentu (legacy)
app.get('/api/data/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const result = await systemPool.query(`SELECT * FROM ${table} LIMIT 1000`);
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, `fetching data from ${table}`, res);
  }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 
// untuk test koneksi database
app.post('/api/database/test-connection', async (req, res) => {
  const { type, database, user, password } = req.body;
  
  // Validasi input
  if (!type || !database || !user || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Semua field wajib diisi!' 
    });
  }
  
  const host = 'localhost';
  const port = type === 'postgresql' ? 5432 : 3306;
  
  try {
    if (type === 'mysql') {
      const connection = await mysql.createConnection({
        host: host,
        port: port,
        user: user,
        password: password,
        database: database
      });
      
      await connection.query('SELECT 1');
      await connection.end();
      
      res.json({ 
        success: true, 
        message: 'Koneksi berhasil!',
        details: { type, host, port, database }
      });
    } else {
      const testPool = new Pool({
        host: host,
        port: port,
        user: user,
        password: password,
        database: database
      });
      
      await testPool.query('SELECT 1');
      await testPool.end();
      
      res.json({ 
        success: true, 
        message: 'Koneksi berhasil!',
        details: { type, host, port, database }
      });
    }
  } catch (error) {
    console.error('Connection test error:', error);
    res.json({ 
      success: false, 
      error: `Gagal terhubung: ${error.message}`
    });
  }
});

// Endpoint untuk menambah database baru
app.post('/api/database/add', async (req, res) => {
  const { name, type, database, user, password } = req.body;
  
  // Validasi input
  if (!name || !type || !database || !user || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Semua field wajib diisi!' 
    });
  }
  
  // Validasi tipe database
  if (type !== 'postgresql' && type !== 'mysql') {
    return res.status(400).json({ 
      success: false, 
      error: 'Tipe database harus postgresql atau mysql!' 
    });
  }
  
  try {
    // Cek apakah label sudah ada
    const checkLabel = await systemPool.query(
      'SELECT id_database FROM database_db WHERE label = $1',
      [name]
    );
    
    if (checkLabel.rows.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Nama database (label) sudah digunakan!' 
      });
    }
    
    // Simpan ke tabel database_db
    const result = await systemPool.query(
      `INSERT INTO database_db (nama_database, label, jenis, username, password, created_at) 
       VALUES ($1, $2, $3, $4, $5, NOW()) 
       RETURNING id_database, nama_database, label, jenis, username`,
      [database, name, type, user, password]
    );
    
    const newDatabase = result.rows[0];
    
    res.json({ 
      success: true, 
      message: 'Database berhasil ditambahkan!',
      database: {
        id_database: newDatabase.id_database,
        nama_database: newDatabase.nama_database,
        label: newDatabase.label,
        jenis: newDatabase.jenis,
        username: newDatabase.username,
        host: 'localhost',
        port: type === 'postgresql' ? 5432 : 3306
      }
    });
  } catch (error) {
    console.error('Error adding database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint untuk mendapatkan daftar database
app.get('/api/databases', async (req, res) => {
  try {
    const result = await systemPool.query(
      'SELECT id_database, nama_database, label, jenis, username, password, created_at FROM database_db ORDER BY created_at DESC'
    );
    
    // Format response untuk kompatibilitas dengan frontend
    const databases = result.rows.map(db => ({
      id_database: db.id_database,
      name: db.label,
      value: `db_${db.id_database}`,
      type: db.jenis,
      host: 'localhost',
      port: db.jenis === 'postgresql' ? 5432 : 3306,
      database: db.nama_database,
      user: db.username,
      password: db.password,
      nama_database: db.nama_database,
      label: db.label,
      jenis: db.jenis,
      username: db.username
    }));
    
    // Optional: Log untuk debug (password di-hide)
    console.log('Databases loaded:', databases.map(db => ({
      ...db,
      password: db.password ? '***' : 'MISSING'
    })));
    
    res.json(databases);
  } catch (error) {
    handleQueryError(error, 'fetching databases', res);
  }
});

// Endpoint untuk menghapus database
app.delete('/api/database/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Normalize ID - hapus prefix 'db_' jika ada
    const dbId = id.replace('db_', '');
    
    // Cek apakah database ada
    const checkDb = await systemPool.query(
      'SELECT label FROM database_db WHERE id_database = $1',
      [dbId]
    );
    
    if (checkDb.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Database tidak ditemukan!' 
      });
    }
    
    const dbLabel = checkDb.rows[0].label;
    
    // Cek apakah database digunakan oleh visualisasi
    const checkVisualisasi = await systemPool.query(
      'SELECT COUNT(*) as count FROM visualisasi WHERE penyimpanan_database = $1 OR penyimpanan_database = $2',
      [dbId, `db_${dbId}`]
    );
    
    if (parseInt(checkVisualisasi.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Database tidak dapat dihapus karena masih digunakan oleh visualisasi!' 
      });
    }
    
    // Cek apakah database digunakan oleh analisis
    const checkAnalisis = await systemPool.query(
      'SELECT COUNT(*) as count FROM analisis WHERE penyimpanan_database = $1 OR penyimpanan_database = $2',
      [dbId, `db_${dbId}`]
    );
    
    if (parseInt(checkAnalisis.rows[0].count) > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Database tidak dapat dihapus karena masih digunakan oleh analisis!' 
      });
    }
    
    // Hapus kolom-kolom dari tabel yang terkait
    await systemPool.query(
      `DELETE FROM kolom_db 
       WHERE id_tabel IN (
         SELECT id_tabel FROM tabel_db WHERE id_database = $1
       )`,
      [dbId]
    );
    
    // Hapus tabel-tabel terkait
    await systemPool.query('DELETE FROM tabel_db WHERE id_database = $1', [dbId]);
    
    // Hapus database
    await systemPool.query('DELETE FROM database_db WHERE id_database = $1', [dbId]);
    
    res.json({ 
      success: true, 
      message: `Database "${dbLabel}" berhasil dihapus!`
    });
  } catch (error) {
    console.error('Error deleting database:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Endpoint untuk mendapatkan tabel dari database tertentu
app.get('/api/database/:dbId/tables', async (req, res) => {
  const { dbId } = req.params;
  
  try {
    const id = dbId.replace('db_', '');
    
    // Ambil informasi database dari database_db
    const dbResult = await systemPool.query(
      'SELECT * FROM database_db WHERE id_database = $1',
      [id]
    );
    
    if (dbResult.rows.length === 0) {
      return res.status(404).json({ error: 'Database tidak ditemukan' });
    }
    
    const dbConfig = dbResult.rows[0];
    
    // Buat koneksi ke database target untuk mendapatkan tabel yang sebenarnya ada
    const dbPool = createDatabaseConnection(dbConfig);
    
    try {
      let actualTables = [];
      
      if (dbConfig.jenis === 'mysql') {
        const result = await dbPool.query('SHOW TABLES');
        actualTables = result[0].map(row => Object.values(row)[0]);
      } else {
        const result = await dbPool.query(
          `SELECT table_name 
           FROM information_schema.tables 
           WHERE table_schema = 'public' 
           AND table_type = 'BASE TABLE'
           ORDER BY table_name`
        );
        actualTables = result.rows.map(row => row.table_name);
      }
      
      await dbPool.end();
      
      // Sinkronisasi dengan tabel_db - tambahkan tabel yang belum ada di metadata
      for (const tableName of actualTables) {
        const checkTable = await systemPool.query(
          'SELECT id_tabel FROM tabel_db WHERE id_database = $1 AND nama_tabel = $2',
          [id, tableName]
        );
        
        if (checkTable.rows.length === 0) {
          // Insert tabel baru ke metadata
          const tableResult = await systemPool.query(
            'INSERT INTO tabel_db (id_database, nama_tabel, created_at) VALUES ($1, $2, NOW()) RETURNING id_tabel',
            [id, tableName]
          );
          
          const tableId = tableResult.rows[0].id_tabel;
          
          // Ambil kolom dari tabel dan simpan ke kolom_db
          let columns = [];
          if (dbConfig.jenis === 'mysql') {
            const tempPool = createDatabaseConnection(dbConfig);
            const colResult = await tempPool.query(`DESCRIBE ${tableName}`);
            columns = colResult[0].map(col => ({
              name: col.Field,
              type: col.Type
            }));
            await tempPool.end();
          } else {
            const tempPool = createDatabaseConnection(dbConfig);
            const colResult = await tempPool.query(
              `SELECT column_name, data_type 
               FROM information_schema.columns 
               WHERE table_name = $1 
               ORDER BY ordinal_position`,
              [tableName]
            );
            columns = colResult.rows.map(col => ({
              name: col.column_name,
              type: col.data_type
            }));
            await tempPool.end();
          }
          
          // Simpan metadata kolom
          for (const col of columns) {
            await systemPool.query(
              'INSERT INTO kolom_db (id_tabel, nama_kolom, tipe_data, created_at) VALUES ($1, $2, $3, NOW())',
              [tableId, col.name, col.type]
            );
          }
        }
      }
      
      res.json(actualTables);
      
    } catch (error) {
      await dbPool.end();
      throw error;
    }
  } catch (error) {
    handleQueryError(error, `fetching tables from database ${dbId}`, res);
  }
});

// ==================== FILE UPLOAD ENDPOINTS ====================

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
          
          if (dbConfig.jenis === 'mysql') {
            await dbPool.query('SELECT 1');
            
            // Buat tabel di database target
            const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${headers.map(h => `\`${h}\` TEXT`).join(', ')})`;
            await dbPool.query(createTableQuery);
      
            // Insert data
            for (const record of records) {
              const values = headers.map(h => record[h]);
              const placeholders = headers.map(() => '?').join(', ');
              const insertQuery = `INSERT INTO ${tableName} (${headers.map(h => `\`${h}\``).join(', ')}) VALUES (${placeholders})`;
              await dbPool.query(insertQuery, values);
            }
            
            await dbPool.end();
          } else {
            await dbPool.query('SELECT 1');
            
            // Buat tabel di database target
            const createTableQuery = `CREATE TABLE IF NOT EXISTS ${tableName} (${headers.map(h => `"${h}" TEXT`).join(', ')})`;
            await dbPool.query(createTableQuery);
      
            // Insert data
            for (const record of records) {
              const values = headers.map(h => record[h]);
              const insertQuery = `INSERT INTO ${tableName} (${headers.map(h => `"${h}"`).join(', ')}) VALUES (${headers.map((_, i) => `$${i + 1}`).join(', ')})`;
              await dbPool.query(insertQuery, values);
            }
            
            await dbPool.end();
          }
          
          // Simpan metadata tabel ke tabel_db
          const checkTable = await systemPool.query(
            'SELECT id_tabel FROM tabel_db WHERE id_database = $1 AND nama_tabel = $2',
            [dbConfig.id_database, tableName]
          );
          
          let tableId;
          
          if (checkTable.rows.length === 0) {
            // Insert tabel baru
            const tableResult = await systemPool.query(
              'INSERT INTO tabel_db (id_database, nama_tabel, created_at) VALUES ($1, $2, NOW()) RETURNING id_tabel',
              [dbConfig.id_database, tableName]
            );
            tableId = tableResult.rows[0].id_tabel;
            
            // Simpan metadata kolom ke kolom_db
            for (const header of headers) {
              await systemPool.query(
                'INSERT INTO kolom_db (id_tabel, nama_kolom, tipe_data, created_at) VALUES ($1, $2, $3, NOW())',
                [tableId, header, 'TEXT']
              );
            }
          }
      
          uploadResults.push({
            database: dbConfig.label,
            status: 'success',
            recordsInserted: records.length
          });
      
        } catch (error) {
          console.error(`Error uploading to ${dbConfig.label}:`, error);
          errors.push({
            database: dbConfig.label,
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

// ==================== QUERY ENDPOINTS ====================

// Endpoint untuk menjalankan query SQL kustom
app.post('/api/query', async (req, res) => {
  const { query, params, databaseId } = req.body;
  try {
    // PENTING: Jika tidak ada databaseId, cari tabel dari query untuk auto-detect database
    let targetDbId = databaseId;
    if (!targetDbId) {
      // Extract nama tabel dari query
      const tableMatches = query.match(/FROM\s+([a-z_][a-z0-9_]*)/i);
      if (tableMatches && tableMatches[1]) {
        const tableName = tableMatches[1].toLowerCase();
        // Cari tabel di database mana
        const tableResult = await systemPool.query(
          'SELECT id_database FROM tabel_db WHERE LOWER(nama_tabel) = $1 LIMIT 1',
          [tableName]
        );
        if (tableResult.rows.length > 0) {
          targetDbId = tableResult.rows[0].id_database;
          console.log(`Auto-detected table "${tableName}" in database ID: ${targetDbId}`);
        }
      }
    }

    // Jika masih tidak ada targetDbId, gunakan systemPool
    let dbPool = systemPool;
    let shouldCloseConnection = false;
    if (targetDbId) {
      const dbResult = await systemPool.query(
        'SELECT * FROM database_db WHERE id_database = $1',
        [targetDbId]
      );
      if (dbResult.rows.length > 0) {
        dbPool = createDatabaseConnection(dbResult.rows[0]);
        shouldCloseConnection = true;
        console.log(`Using database: ${dbResult.rows[0].label}`);
      }
    }

    // Proses query dengan parameter
    if (params && Object.keys(params).length > 0) {
      console.log('=== BACKEND RECEIVED PARAMS ===');
      console.log('Raw params:', params);
      console.log('Param types:', Object.entries(params).map(([key, val]) => 
        `${key}: ${typeof val} = "${val}"`
      ));
      
      let modifiedQuery = query;
      const values = [];
      let paramIndex = 1;
      const paramMap = {};

      // Temukan semua parameter unik
      const paramRegex = /:(\w+)\b/g;
      let match;
      while ((match = paramRegex.exec(query)) !== null) {
        const paramName = match[1];
        if (!paramMap[paramName] && params[paramName] !== undefined) {
          paramMap[paramName] = paramIndex++;
          values.push(params[paramName]); // Langsung push tanpa konversi
        }
      }

      // Replace parameter dengan placeholder PostgreSQL ($1, $2, dst)
      for (const [paramName, index] of Object.entries(paramMap)) {
        const replaceRegex = new RegExp(`:${paramName}\\b`, 'g');
        modifiedQuery = modifiedQuery.replace(replaceRegex, `$${index}`);
      }

      console.log('Modified query:', modifiedQuery);
      console.log('Values array:', values);
      console.log('Values types:', values.map((val, idx) => 
        `$${idx + 1}: ${typeof val} = "${val}"`
      ));
      console.log('================================');

      const result = await dbPool.query(modifiedQuery, values);
      const data = result.rows || result[0];
      if (shouldCloseConnection) await dbPool.end();
      res.json(data);
    } else {
      const result = await dbPool.query(query);
      const data = result.rows || result[0];
      if (shouldCloseConnection) await dbPool.end();
      res.json(data);
    }
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== HELPER FUNCTION ====================
// Fungsi untuk memastikan format database konsisten (db_XX)
function normalizeDbId(dbId) {
  if (!dbId) return null;
  
  // Konversi ke string dulu
  const dbIdStr = String(dbId);
  
  // Jika sudah ada prefix "db_", return as is
  if (dbIdStr.startsWith('db_')) return dbIdStr;
  
  // Jika hanya angka, tambahkan prefix
  return `db_${dbIdStr}`;
}

// ==================== VISUALIZATION ENDPOINTS ====================

// Endpoint untuk menyimpan visualisasi
app.post('/api/visualizations', async (req, res) => {
  const { visualisasi, parameter, tabel_ids } = req.body;
  
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
    const chartDataString = typeof visualisasi.chart_data === 'string' 
      ? visualisasi.chart_data 
      : JSON.stringify(visualisasi.chart_data || []);
    
    const deskripsi = visualisasi.deskripsi || null;
    const parameterQuery = visualisasi.parameter_query || null;
    
    // Normalize database ID format
    const penyimpananDatabase = normalizeDbId(visualisasi.database);
    
    // Insert visualisasi
    const result = await systemPool.query(
      `INSERT INTO visualisasi (
        judul, deskripsi, jenis_grafik, parameter_x, parameter_y, group_by,
        query_sql, parameter_query, chart_data, penyimpanan_database, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) 
      RETURNING id_visualisasi`,
      [
        visualisasi.judul,
        deskripsi,
        visualisasi.jenis_grafik,
        parameter.parameter_x,
        parameter.parameter_y,
        parameter.parameter_group || null,
        visualisasi.query_sql,
        parameterQuery,
        chartDataString,
        penyimpananDatabase
      ]
    );
    
    const visualizationId = result.rows[0].id_visualisasi;
    
    // Insert relasi tabel_visualisasi jika ada tabel_ids
    if (tabel_ids && tabel_ids.length > 0) {
      for (const tabelId of tabel_ids) {
        await systemPool.query(
          'INSERT INTO tabel_visualisasi (id_tabel, id_visualisasi, created_at) VALUES ($1, $2, NOW())',
          [tabelId, visualizationId]
        );
      }
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Visualisasi berhasil disimpan',
      id_visualisasi: visualizationId
    });
    
  } catch (error) {
    console.error('Error saving visualization:', error);
    res.status(500).json({ 
      error: 'Gagal menyimpan visualisasi',
      message: error.message
    });
  }
});

// Endpoint untuk mendapatkan semua visualisasi
app.get('/api/visualizations', async (req, res) => {
  try {
    const result = await systemPool.query(
      `SELECT * FROM visualisasi ORDER BY created_at DESC`
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
    const result = await systemPool.query(
      'SELECT * FROM visualisasi WHERE id_visualisasi = $1',
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

// Endpoint untuk update visualisasi (chart_data)
app.put('/api/visualizations/:id', async (req, res) => {
  const { id } = req.params;
  const { chart_data } = req.body;
  
  try {
    const result = await systemPool.query(
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

// Endpoint baru untuk update parameter_query saja
app.put('/api/visualizations/:id/parameters', async (req, res) => {
  const { id } = req.params;
  const { parameter_query } = req.body;
  
  try {
    console.log('Updating parameter_query for visualization:', id);
    console.log('New parameter_query:', parameter_query);
    
    const result = await systemPool.query(
      `UPDATE visualisasi 
       SET parameter_query = $1
       WHERE id_visualisasi = $2
       RETURNING *`,
      [parameter_query, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visualisasi tidak ditemukan' });
    }
    
    console.log('Parameter_query updated successfully');
    res.json({ 
      success: true, 
      message: 'Parameter query berhasil diupdate', 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('Error updating parameter_query:', error);
    handleQueryError(error, 'updating parameter query', res);
  }
});

// Endpoint untuk menghapus visualisasi
app.delete('/api/visualizations/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // Cek apakah visualisasi ada
    const checkResult = await systemPool.query(
      'SELECT id_visualisasi FROM visualisasi WHERE id_visualisasi = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Visualisasi tidak ditemukan' });
    }

    // Cek apakah visualisasi digunakan oleh analisis
    const usageCheck = await systemPool.query(
      'SELECT COUNT(*) as count FROM analisis_visualisasi WHERE id_visualisasi = $1',
      [id]
    );
    
    if (usageCheck.rows[0].count > 0) {
      return res.status(403).json({ 
        error: 'Visualisasi tidak dapat dihapus karena sedang digunakan dalam analisis',
        usage_count: usageCheck.rows[0].count
      });
    }

    // Hapus relasi tabel_visualisasi
    await systemPool.query(
      'DELETE FROM tabel_visualisasi WHERE id_visualisasi = $1',
      [id]
    );

    // Hapus visualisasi
    await systemPool.query(
      'DELETE FROM visualisasi WHERE id_visualisasi = $1',
      [id]
    );

    res.json({ success: true, message: 'Visualisasi berhasil dihapus' });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      error: 'Gagal menghapus visualisasi', 
      details: error.message 
    });
  }
});

// Endpoint untuk mendapatkan visualisasi dari database tertentu
app.get('/api/database/:dbId/visualisasi', async (req, res) => {
  const { dbId } = req.params;
  
  try {
    console.log('Requested dbId:', dbId);
    
    // Normalize database ID
    const normalizedDbId = normalizeDbId(dbId);
    console.log('Normalized dbId:', normalizedDbId);
    
    // Query dengan normalized ID
    const result = await systemPool.query(
      `SELECT * FROM visualisasi 
       WHERE penyimpanan_database = $1
       ORDER BY created_at DESC`,
      [normalizedDbId]
    );
    
    console.log('Found visualisasi:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching visualisasi:', error);
    handleQueryError(error, `fetching visualisasi from database ${dbId}`, res);
  }
});

// ==================== ANALYSIS ENDPOINTS ====================

// Endpoint untuk menyimpan analisis
app.post('/api/analisis', async (req, res) => {
  const { judul, masalah, interpretasi_hasil, visualisasi_ids, database } = req.body;
  
  if (!judul || !visualisasi_ids || !visualisasi_ids.length) {
    return res.status(400).json({ error: 'Judul dan visualisasi wajib diisi' });
  }
  
  try {
    // Normalize database ID format
    const penyimpananDatabase = normalizeDbId(database);
    
    // Insert analisis
    const result = await systemPool.query(
      `INSERT INTO analisis (judul, rumusan_masalah, interpretasi_hasil, penyimpanan_database, created_at) 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING id_analisis`,
      [judul, masalah || null, interpretasi_hasil || null, penyimpananDatabase]
    );
    
    const analisisId = result.rows[0].id_analisis;
    
    // Insert relasi analisis_visualisasi
    for (const visId of visualisasi_ids) {
      await systemPool.query(
        'INSERT INTO analisis_visualisasi (id_analisis, id_visualisasi, created_at) VALUES ($1, $2, NOW())',
        [analisisId, visId]
      );
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Analisis berhasil disimpan',
      id_analisis: analisisId
    });
    
  } catch (error) {
    handleQueryError(error, 'saving analisis', res);
  }
});

// Endpoint untuk update analisis
app.put('/api/analisis/:id', async (req, res) => {
  const { id } = req.params;
  const { judul, masalah, interpretasi_hasil } = req.body;
  
  try {
    const result = await systemPool.query(
      `UPDATE analisis 
       SET judul = $1, rumusan_masalah = $2, interpretasi_hasil = $3
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
    const checkResult = await systemPool.query(
      'SELECT id_analisis FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    // Hapus relasi analisis_visualisasi
    await systemPool.query(
      'DELETE FROM analisis_visualisasi WHERE id_analisis = $1',
      [id]
    );
    
    // Hapus analisis
    await systemPool.query(
      'DELETE FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    res.json({ success: true, message: 'Analisis berhasil dihapus' });
  } catch (error) {
    handleQueryError(error, `deleting analisis with id ${id}`, res);
  }
});

// Endpoint untuk mendapatkan analisis dari database tertentu dengan visualisasi
app.get('/api/database/:dbId/analisis-with-visualisasi', async (req, res) => {
  const { dbId } = req.params;
  
  try {
    console.log('Fetching analisis for database:', dbId);
    
    // Normalize database ID
    const normalizedDbId = normalizeDbId(dbId);
    console.log('Normalized dbId:', normalizedDbId);
    
    const result = await systemPool.query(
      `SELECT 
        a.id_analisis,
        a.judul,
        a.rumusan_masalah,
        a.interpretasi_hasil,
        a.penyimpanan_database,
        a.created_at,
        STRING_AGG(DISTINCT v.judul, ', ') as visualisasi_judul,
        COUNT(DISTINCT av.id_visualisasi) as jumlah_visualisasi
      FROM analisis a
      LEFT JOIN analisis_visualisasi av ON a.id_analisis = av.id_analisis
      LEFT JOIN visualisasi v ON av.id_visualisasi = v.id_visualisasi
      WHERE a.penyimpanan_database = $1
      GROUP BY a.id_analisis, a.judul, a.rumusan_masalah, a.interpretasi_hasil, 
               a.penyimpanan_database, a.created_at
      ORDER BY a.created_at DESC`,
      [normalizedDbId]
    );
    
    console.log('Found analisis:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching analisis with visualisasi:', error);
    handleQueryError(error, `fetching analisis from database ${dbId}`, res);
  }
});

// Endpoint untuk mendapatkan visualisasi IDs dari analisis tertentu
app.get('/api/analisis/:id/visualisasi', async (req, res) => {
  const { id } = req.params;
  
  try {
    console.log('Fetching visualisasi IDs for analisis:', id);
    
    const result = await systemPool.query(
      `SELECT id_visualisasi 
       FROM analisis_visualisasi 
       WHERE id_analisis = $1`,
      [id]
    );
    
    const visualisasiIds = result.rows.map(row => row.id_visualisasi);
    console.log('Found visualisasi IDs:', visualisasiIds);
    
    res.json(visualisasiIds);
  } catch (error) {
    console.error('Error fetching visualisasi IDs:', error);
    handleQueryError(error, `fetching visualisasi for analisis ${id}`, res);
  }
});