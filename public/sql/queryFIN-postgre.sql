-- ==================== TABEL DATABASE ====================
-- Tabel untuk menyimpan informasi database yang terhubung
CREATE TABLE database_db (
    id_database SERIAL PRIMARY KEY,
    nama_database VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    jenis VARCHAR(50) NOT NULL NOT NULL CHECK (jenis IN ('postgresql', 'mysql')),
    username VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk pencarian cepat berdasarkan label
CREATE INDEX idx_database_label ON database_db(label);

INSERT INTO database_db (nama_database, label, jenis, username, password, created_at)
VALUES 
    ('TA_FIN', 'PostgreSQL Primary', 'postgresql', 'rayhanadjisantoso', 'rayhan123', NOW()),
    ('ta_fin', 'MySQL Secondary', 'mysql', 'root', 'rayhan2510', NOW())

-- ==================== TABEL TABEL_DB ====================
-- Tabel untuk menyimpan nama tabel dari hasil unggah data
CREATE TABLE tabel_db (
    id_tabel SERIAL PRIMARY KEY,
    id_database INTEGER NOT NULL REFERENCES database_db(id_database) ON DELETE CASCADE,
    nama_tabel VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk pencarian cepat
CREATE INDEX idx_tabel_database ON tabel_db(id_database);
CREATE INDEX idx_tabel_nama ON tabel_db(nama_tabel);

-- ==================== TABEL KOLOM_DB ====================
-- Tabel untuk menyimpan nama kolom dari tabel yang diunggah
CREATE TABLE kolom_db (
    id_kolom SERIAL PRIMARY KEY,
    id_tabel INTEGER NOT NULL REFERENCES tabel_db(id_tabel) ON DELETE CASCADE,
    nama_kolom VARCHAR(100) NOT NULL,
    tipe_data VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk pencarian cepat
CREATE INDEX idx_kolom_tabel ON kolom_db(id_tabel);

-- ==================== TABEL VISUALISASI ====================
-- Tabel untuk menyimpan informasi visualisasi
CREATE TABLE visualisasi (
    id_visualisasi SERIAL PRIMARY KEY,
    judul VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    jenis_grafik VARCHAR(20) NOT NULL,
    parameter_x VARCHAR(50) NOT NULL,
    parameter_y VARCHAR(50) NOT NULL,
    group_by VARCHAR(50),
    query_sql TEXT NOT NULL,
    parameter_query VARCHAR(100),
    chart_data TEXT NOT NULL,
    penyimpanan_database VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk pencarian cepat
CREATE INDEX idx_visualisasi_judul ON visualisasi(judul);
CREATE INDEX idx_visualisasi_database ON visualisasi(penyimpanan_database);

-- ==================== TABEL ANALISIS ====================
-- Tabel untuk menyimpan informasi analisis
CREATE TABLE analisis (
    id_analisis SERIAL PRIMARY KEY,
    judul VARCHAR(100) NOT NULL,
    rumusan_masalah TEXT NOT NULL,
    interpretasi_hasil TEXT NOT NULL,
    penyimpanan_database VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index untuk pencarian cepat
CREATE INDEX idx_analisis_judul ON analisis(judul);
CREATE INDEX idx_analisis_database ON analisis(penyimpanan_database);

-- ==================== TABEL TABEL_VISUALISASI ====================
-- Tabel relasi many-to-many antara tabel_db dan visualisasi
CREATE TABLE tabel_visualisasi (
    id_tabel INTEGER NOT NULL REFERENCES tabel_db(id_tabel) ON DELETE CASCADE,
    id_visualisasi INTEGER NOT NULL REFERENCES visualisasi(id_visualisasi) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_tabel, id_visualisasi)
);

-- Index untuk pencarian cepat
CREATE INDEX idx_tabel_vis_tabel ON tabel_visualisasi(id_tabel);
CREATE INDEX idx_tabel_vis_visualisasi ON tabel_visualisasi(id_visualisasi);

-- ==================== TABEL ANALISIS_VISUALISASI ====================
-- Tabel relasi many-to-many antara analisis dan visualisasi
CREATE TABLE analisis_visualisasi (
    id_analisis INTEGER NOT NULL REFERENCES analisis(id_analisis) ON DELETE CASCADE,
    id_visualisasi INTEGER NOT NULL REFERENCES visualisasi(id_visualisasi) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_analisis, id_visualisasi)
);

-- Index untuk pencarian cepat
CREATE INDEX idx_analisis_vis_analisis ON analisis_visualisasi(id_analisis);
CREATE INDEX idx_analisis_vis_visualisasi ON analisis_visualisasi(id_visualisasi);

CREATE TABLE users (
    id_user SERIAL PRIMARY KEY,
    username CHARACTER VARYING(50) UNIQUE NOT NULL,
    password CHARACTER VARYING(50) NOT NULL,
    email CHARACTER VARYING(100) UNIQUE NOT NULL,
    nama_lengkap CHARACTER VARYING(100) NOT NULL,
    role CHARACTER VARYING(20) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

INSERT INTO users (id_user, username, password, email, nama_lengkap, role, is_active, created_at, updated_at) 
VALUES (1, 'admin1', 'admin123', 'admin@example.com', 'Administrator System', 'Admin', TRUE, '2025-10-13 16:22:37.979864', '2025-10-13 16:22:37.979864'),
(2, 'analis1', 'analis123', 'analis@example.com', 'Data Analyst', 'Analis', TRUE, '2025-10-13 16:22:37.979864', '2025-10-13 16:22:37.979864'),
(3, 'enduser1', 'user123', 'enduser@example.com', 'End User', 'EndUser', TRUE, '2025-10-13 16:22:37.979864', '2025-10-13 16:22:37.979864');

-- ========================================
-- CEK ISI TABEL
-- ========================================
SELECT * FROM database_db
SELECT * FROM tabel_db
SELECT * FROM kolom_db
SELECT * FROM visualisasi
SELECT * FROM tabel_visualisasi
SELECT * FROM analisis
SELECT * FROM analisis_visualisasi
SELECT * FROM users

-- ========================================
-- HAPUS TABEL
-- ========================================
DROP TABLE database_db
DROP TABLE tabel_db
DROP TABLE kolom_db
DROP TABLE visualisasi
DROP TABLE tabel_visualisasi
DROP TABLE analisis
DROP TABLE analisis_visualisasi
DROP TABLE users