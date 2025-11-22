CREATE TABLE database_db (
    id_database INT AUTO_INCREMENT PRIMARY KEY,
    nama_database VARCHAR(100) NOT NULL,
    label VARCHAR(100) NOT NULL,
    jenis VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tabel_db (
    id_tabel INT AUTO_INCREMENT PRIMARY KEY,
    id_database INT NOT NULL,
    nama_tabel VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_database) REFERENCES database_db(id_database)
        ON DELETE CASCADE
);

CREATE TABLE kolom_db (
    id_kolom INT AUTO_INCREMENT PRIMARY KEY,
    id_tabel INT NOT NULL,
    nama_kolom VARCHAR(100) NOT NULL,
    tipe_data VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tabel) REFERENCES tabel_db(id_tabel)
        ON DELETE CASCADE
);

CREATE TABLE visualisasi (
    id_visualisasi INT AUTO_INCREMENT PRIMARY KEY,
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

CREATE TABLE analisis (
    id_analisis INT AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(100) NOT NULL,
    rumusan_masalah TEXT NOT NULL,
    interpretasi_hasil TEXT NOT NULL,
    penyimpanan_database VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tabel_visualisasi (
    id_tabel INT NOT NULL,
    id_visualisasi INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_tabel, id_visualisasi),
    FOREIGN KEY (id_tabel) REFERENCES tabel_db(id_tabel)
        ON DELETE CASCADE,
    FOREIGN KEY (id_visualisasi) REFERENCES visualisasi(id_visualisasi)
        ON DELETE CASCADE
);

CREATE TABLE analisis_visualisasi (
    id_analisis INT NOT NULL,
    id_visualisasi INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_analisis, id_visualisasi),
    FOREIGN KEY (id_analisis) REFERENCES analisis(id_analisis)
        ON DELETE CASCADE,
    FOREIGN KEY (id_visualisasi) REFERENCES visualisasi(id_visualisasi)
        ON DELETE CASCADE
);