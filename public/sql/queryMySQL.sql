CREATE TABLE visualisasi (
  id_visualisasi INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  jenis_grafik VARCHAR(50) NOT NULL,
  query_sql TEXT NOT NULL,
  berparameter BOOLEAN DEFAULT FALSE,
  chart_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE parameter_visualisasi (
  id_parameter INT AUTO_INCREMENT PRIMARY KEY,
  id_visualisasi INT NOT NULL,
  parameter_x VARCHAR(100),
  parameter_y VARCHAR(100),
  group_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_visualisasi) REFERENCES visualisasi(id_visualisasi) ON DELETE CASCADE
);

CREATE TABLE analisis (
  id_analisis INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(255) NOT NULL,
  masalah TEXT,
  interpretasi_hasil TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analisis_visualisasi (
  id_analisis INT NOT NULL,
  id_visualisasi INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_analisis, id_visualisasi),
  FOREIGN KEY (id_analisis) REFERENCES analisis(id_analisis) ON DELETE CASCADE,
  FOREIGN KEY (id_visualisasi) REFERENCES visualisasi(id_visualisasi) ON DELETE RESTRICT
);

-- Tabel untuk data master unit
CREATE TABLE master_unit (
  id_unit INT AUTO_INCREMENT PRIMARY KEY,
  nomor_unit VARCHAR(50) NOT NULL,
  lantai VARCHAR(10),
  blok VARCHAR(10),
  luas_unit DECIMAL(10,2),
  status VARCHAR(50)
);

-- Tabel untuk tagihan air
CREATE TABLE tagihan_air (
  id_tagihan INT AUTO_INCREMENT PRIMARY KEY,
  id_unit INT NOT NULL,
  periode DATE NOT NULL,
  meter_awal INT,
  meter_akhir INT,
  pemakaian INT,
  tarif DECIMAL(10,2),
  total_tagihan DECIMAL(10,2),
  status_pembayaran VARCHAR(50),
  FOREIGN KEY (id_unit) REFERENCES master_unit(id_unit)
);