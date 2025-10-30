const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Konfigurasi database PostgreSQL (sama dengan server.js)
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'TA',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Endpoint untuk login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Validasi input
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Username dan password wajib diisi!' 
      });
    }

    // Cari user berdasarkan username
    const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
    const result = await pool.query(query, [username]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username atau password salah!' 
      });
    }

    const user = result.rows[0];

    // Verifikasi password (untuk development gunakan plain text)
    // PRODUCTION: gunakan bcrypt.compare(password, user.password)
    const isPasswordValid = password === user.password;

    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Username atau password salah!' 
      });
    }

    // Jangan kirim password ke client
    const { password: _, ...userWithoutPassword } = user;

    // Kirim data user
    res.json({
      success: true,
      ...userWithoutPassword
    });

  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Endpoint untuk register user baru (opsional - hanya untuk Admin)
router.post('/register', async (req, res) => {
  const { username, password, email, nama_lengkap, role } = req.body;

  try {
    // Validasi input
    if (!username || !password || !email || !nama_lengkap || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Semua field wajib diisi!' 
      });
    }

    // Validasi role
    const validRoles = ['Admin', 'Analis', 'EndUser'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Role tidak valid!' 
      });
    }

    // Cek apakah username sudah ada
    const checkQuery = 'SELECT * FROM users WHERE username = $1 OR email = $2';
    const checkResult = await pool.query(checkQuery, [username, email]);

    if (checkResult.rows.length > 0) {
      return res.status(409).json({ 
        success: false, 
        message: 'Username atau email sudah terdaftar!' 
      });
    }

    // Insert user baru (untuk development simpan password plain text)
    // PRODUCTION: hash password dengan bcrypt
    const insertQuery = `
      INSERT INTO users (username, password, email, nama_lengkap, role) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id_user, username, email, nama_lengkap, role, is_active, created_at
    `;
    const insertResult = await pool.query(insertQuery, [
      username,
      password, // PRODUCTION: gunakan hashedPassword
      email,
      nama_lengkap,
      role
    ]);

    res.status(201).json({
      success: true,
      message: 'User berhasil didaftarkan!',
      user: insertResult.rows[0]
    });

  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Endpoint untuk mendapatkan info user berdasarkan ID
router.get('/user/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = 'SELECT id_user, username, email, nama_lengkap, role, is_active FROM users WHERE id_user = $1';
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan!' 
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Endpoint untuk update user
router.put('/user/:id', async (req, res) => {
  const { id } = req.params;
  const { nama_lengkap, email } = req.body;

  try {
    const query = `
      UPDATE users 
      SET nama_lengkap = $1, email = $2, updated_at = CURRENT_TIMESTAMP 
      WHERE id_user = $3 
      RETURNING id_user, username, email, nama_lengkap, role, is_active
    `;
    const result = await pool.query(query, [nama_lengkap, email, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan!' 
      });
    }

    res.json({
      success: true,
      message: 'User berhasil diupdate!',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Endpoint untuk mendapatkan semua users (hanya Admin)
router.get('/users', async (req, res) => {
  try {
    const query = 'SELECT id_user, username, email, nama_lengkap, role, is_active, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);

    res.json({
      success: true,
      users: result.rows
    });

  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Endpoint untuk deactivate user (soft delete)
router.put('/user/:id/deactivate', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP 
      WHERE id_user = $1 
      RETURNING id_user, username, is_active
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan!' 
      });
    }

    res.json({
      success: true,
      message: 'User berhasil dinonaktifkan!',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

// Endpoint untuk activate user
router.put('/user/:id/activate', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      UPDATE users 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP 
      WHERE id_user = $1 
      RETURNING id_user, username, is_active
    `;
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User tidak ditemukan!' 
      });
    }

    res.json({
      success: true,
      message: 'User berhasil diaktifkan!',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Error activating user:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan server' 
    });
  }
});

module.exports = router;