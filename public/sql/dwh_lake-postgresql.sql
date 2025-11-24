-- ========================================
-- CREATE TABLE
-- ========================================
DROP TABLE IF EXISTS cb_out CASCADE;

CREATE TABLE cb_out (
  cb_out_id VARCHAR(15) NOT NULL,
  tanggal DATE DEFAULT NULL,
  cb_id VARCHAR(15) DEFAULT NULL,
  coa_out1 VARCHAR(30) DEFAULT NULL,
  coa_out2 VARCHAR(30) DEFAULT NULL,
  coa_out3 VARCHAR(30) DEFAULT NULL,
  amount_out DECIMAL(10,0) DEFAULT NULL,
  amount_out1 DECIMAL(10,0) DEFAULT NULL,
  amount_out2 DECIMAL(10,0) DEFAULT NULL,
  amount_out3 DECIMAL(10,0) DEFAULT NULL,
  total_amount_out DECIMAL(10,0) DEFAULT NULL,
  keterangan VARCHAR(500) DEFAULT NULL,
  status CHAR(1) DEFAULT NULL,
  created_by VARCHAR(30) DEFAULT NULL,
  created_date DATE DEFAULT NULL,
  reff VARCHAR(50) DEFAULT NULL,
  posted_by VARCHAR(30) DEFAULT NULL,
  posted_date DATE DEFAULT NULL,
  pay_with INT DEFAULT NULL,
  no_giro VARCHAR(30) DEFAULT NULL,
  bank VARCHAR(30) DEFAULT NULL,
  status_cair_giro CHAR(1) DEFAULT NULL,
  tanggal_cair_giro DATE DEFAULT NULL,
  tanggal_giro DATE DEFAULT NULL,
  contact_id VARCHAR(30) DEFAULT NULL,
  alokasi CHAR(1) DEFAULT NULL,
  charge DECIMAL(10,0) DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cb_out_id)
);


DROP TABLE IF EXISTS cb_out_detail CASCADE;

CREATE TABLE cb_out_detail (
  cb_out_id VARCHAR(30) NOT NULL,
  seq INT NOT NULL,
  coa VARCHAR(30) DEFAULT NULL,
  amount DECIMAL(10,0) DEFAULT NULL,
  keterangan VARCHAR(500) DEFAULT NULL,
  trans_id VARCHAR(15) DEFAULT NULL,
  status_tax CHAR(1) DEFAULT NULL,
  amount_tax DECIMAL(10,0) DEFAULT NULL,
  potong_pph CHAR(2) DEFAULT NULL,
  amount_pph DECIMAL(10,0) DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cb_out_id, seq)
);

-- Create index for better query performance
CREATE INDEX idx_cb_out_detail_coa ON cb_out_detail(coa);


DROP TABLE IF EXISTS cb_in CASCADE;

CREATE TABLE cb_in (
  cb_in_id VARCHAR(30) NOT NULL,
  tanggal DATE DEFAULT NULL,
  cb_id VARCHAR(15) NOT NULL,
  coa_in1 VARCHAR(30) DEFAULT NULL,
  coa_in2 VARCHAR(30) DEFAULT NULL,
  coa_in3 VARCHAR(30) DEFAULT NULL,
  amount_in DECIMAL(10,0) DEFAULT NULL,
  amount_in1 DECIMAL(10,0) DEFAULT NULL,
  amount_in2 DECIMAL(10,0) DEFAULT NULL,
  amount_in3 DECIMAL(10,0) NOT NULL,
  total_amount_in DECIMAL(10,0) DEFAULT NULL,
  keterangan VARCHAR(200) DEFAULT NULL,
  status CHAR(1) DEFAULT NULL,
  created_by VARCHAR(30) DEFAULT NULL,
  created_date DATE DEFAULT NULL,
  reff VARCHAR(50) DEFAULT NULL,
  posted_by VARCHAR(30) DEFAULT NULL,
  posted_date DATE DEFAULT NULL,
  pay_with INT DEFAULT NULL,
  no_giro VARCHAR(30) DEFAULT NULL,
  bank VARCHAR(30) DEFAULT NULL,
  status_cair_giro CHAR(1) DEFAULT NULL,
  tanggal_cair_giro DATE DEFAULT NULL,
  tanggal_giro DATE DEFAULT NULL,
  contact_id VARCHAR(30) DEFAULT NULL,
  alokasi CHAR(1) DEFAULT NULL,
  charge DECIMAL(10,0) DEFAULT NULL,
  token CHAR(1) DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cb_in_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_cb_in_tanggal ON cb_in(tanggal);
CREATE INDEX idx_cb_in_cb_id ON cb_in(cb_id);
CREATE INDEX idx_cb_in_status ON cb_in(status);


DROP TABLE IF EXISTS cb_in_detail CASCADE;

CREATE TABLE cb_in_detail (
  cb_in_id VARCHAR(30) NOT NULL,
  seq INT NOT NULL,
  coa VARCHAR(30) DEFAULT NULL,
  amount DECIMAL(10,0) DEFAULT NULL,
  keterangan VARCHAR(100) DEFAULT NULL,
  trans_id VARCHAR(15) DEFAULT NULL,
  status_tax CHAR(1) DEFAULT NULL,
  amount_tax DECIMAL(10,0) DEFAULT NULL,
  potong_pph CHAR(2) DEFAULT NULL,
  amount_pph DECIMAL(10,0) DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cb_in_id, seq)
);

-- Create indexes for better query performance
CREATE INDEX idx_cb_in_detail_coa ON cb_in_detail(coa);
CREATE INDEX idx_cb_in_detail_cb_in_id ON cb_in_detail(cb_in_id);

-- Add foreign key constraint (optional)
ALTER TABLE cb_in_detail 
ADD CONSTRAINT fk_cb_in_detail_cb_in 
FOREIGN KEY (cb_in_id) REFERENCES cb_in(cb_in_id) 
ON DELETE CASCADE;


DROP TABLE IF EXISTS ar_invoiceh CASCADE;

CREATE TABLE ar_invoiceh (
  inv_no VARCHAR(30) NOT NULL,
  inv_date DATE DEFAULT NULL,
  inv_ref VARCHAR(30) DEFAULT NULL,
  inv_credit_term INT DEFAULT NULL,
  inv_duedate DATE DEFAULT NULL,
  inv_descr VARCHAR(100) DEFAULT NULL,
  inv_tenant VARCHAR(30) DEFAULT NULL,
  inv_jurnalcategory CHAR(1) DEFAULT NULL,
  inv_contract VARCHAR(30) DEFAULT NULL,
  inv_netamount DECIMAL(10,0) DEFAULT NULL,
  inv_vatamount DECIMAL(10,0) DEFAULT NULL,
  inv_discamount DECIMAL(10,0) DEFAULT NULL,
  inv_rate DECIMAL(10,0) DEFAULT NULL,
  inv_taxrate DECIMAL(10,0) DEFAULT NULL,
  inv_createby VARCHAR(15) DEFAULT NULL,
  inv_createdate DATE DEFAULT NULL,
  inv_cancelby VARCHAR(15) DEFAULT NULL,
  inv_canceldate DATE DEFAULT NULL,
  inv_cancelreason VARCHAR(50) DEFAULT NULL,
  inv_postby VARCHAR(15) DEFAULT NULL,
  inv_postdate DATE DEFAULT NULL,
  inv_status CHAR(1) DEFAULT NULL,
  inv_cn DECIMAL(10,0) DEFAULT NULL,
  tahun VARCHAR(4) DEFAULT NULL,
  bulan VARCHAR(2) DEFAULT NULL,
  inv_pphamount DECIMAL(10,0) DEFAULT NULL,
  status_potong_pph CHAR(1) DEFAULT NULL,
  no_pajak VARCHAR(50) DEFAULT NULL,
  grossup CHAR(1) DEFAULT NULL,
  tgl_pajak DATE DEFAULT NULL,
  rc_id VARCHAR(15) DEFAULT NULL,
  previous DECIMAL(10,0) DEFAULT NULL,
  penalty DECIMAL(10,0) DEFAULT NULL,
  denda DECIMAL(10,0) DEFAULT NULL,
  edit_by VARCHAR(15) DEFAULT NULL,
  edit_date DATE DEFAULT NULL,
  status_hosting CHAR(1) DEFAULT NULL,
  filename VARCHAR(200) DEFAULT NULL,
  lunas CHAR(1) DEFAULT NULL,
  previous_scsf DECIMAL(10,0) DEFAULT NULL,
  previous_elwt DECIMAL(10,0) DEFAULT NULL,
  status_wa CHAR(1) DEFAULT NULL,
  previous_scsf_2016 DECIMAL(10,0) DEFAULT NULL,
  previous_elwt_2016 DECIMAL(10,0) DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (inv_no)
);

-- Create indexes for better query performance
CREATE INDEX idx_ar_invoiceh_inv_date ON ar_invoiceh(inv_date);
CREATE INDEX idx_ar_invoiceh_inv_tenant ON ar_invoiceh(inv_tenant);
CREATE INDEX idx_ar_invoiceh_inv_status ON ar_invoiceh(inv_status);
CREATE INDEX idx_ar_invoiceh_lunas ON ar_invoiceh(lunas);
CREATE INDEX idx_ar_invoiceh_tahun_bulan ON ar_invoiceh(tahun, bulan);


DROP TABLE IF EXISTS cb_payment_detail CASCADE;

CREATE TABLE cb_payment_detail (
  payment_id VARCHAR(30) NOT NULL,
  line_id INT NOT NULL,
  inv_no VARCHAR(30) DEFAULT NULL,
  seq INT DEFAULT NULL,
  sisa_net DECIMAL(10,0) DEFAULT NULL,
  sisa_vat DECIMAL(10,0) DEFAULT NULL,
  payment_net DECIMAL(10,0) DEFAULT NULL,
  payment_vat DECIMAL(10,0) DEFAULT NULL,
  payment_pph DECIMAL(10,0) DEFAULT NULL,
  other_income DECIMAL(10,0) DEFAULT NULL,
  other_expense DECIMAL(10,0) DEFAULT NULL,
  advance DECIMAL(10,0) DEFAULT NULL,
  status_potong CHAR(1) DEFAULT NULL,
  payment_penalty DECIMAL(10,0) DEFAULT NULL,
  sisa_penalty DECIMAL(10,0) DEFAULT NULL,
  sisa_pph INT DEFAULT NULL,
  type_bill VARCHAR(15) DEFAULT NULL,
  pph DECIMAL(10,0) DEFAULT NULL,
  pembayaran_ke INT DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (payment_id, line_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_cb_payment_detail_inv_no ON cb_payment_detail(inv_no);
CREATE INDEX idx_cb_payment_detail_type_bill ON cb_payment_detail(type_bill);
CREATE INDEX idx_cb_payment_detail_payment_id ON cb_payment_detail(payment_id);


DROP TABLE IF EXISTS ar_cn CASCADE;

CREATE TABLE ar_cn (
  cn_id VARCHAR(30) NOT NULL,
  cn_date DATE NOT NULL,
  inv_no VARCHAR(30) NOT NULL,
  inv_seq INT NOT NULL,
  type_bill VARCHAR(15) NOT NULL,
  cn_amount DECIMAL(10,0) NOT NULL,
  status CHAR(1) DEFAULT NULL,
  create_by VARCHAR(30) DEFAULT NULL,
  create_date DATE DEFAULT NULL,
  contract_id VARCHAR(30) DEFAULT NULL,
  cn_vat DECIMAL(10,0) DEFAULT NULL,
  keterangan VARCHAR(200) DEFAULT NULL,
  coa VARCHAR(30) DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (cn_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_ar_cn_inv_no ON ar_cn(inv_no);
CREATE INDEX idx_ar_cn_type_bill ON ar_cn(type_bill);
CREATE INDEX idx_ar_cn_cn_date ON ar_cn(cn_date);
CREATE INDEX idx_ar_cn_status ON ar_cn(status);


DROP TABLE IF EXISTS account_list_rpt CASCADE;

CREATE TABLE account_list_rpt (
  anum INT DEFAULT NULL,
  urut INT DEFAULT NULL,
  kode_perkiraan CHAR(15) DEFAULT NULL,
  tgl_jurnal DATE DEFAULT NULL,
  no_jurnal CHAR(15) DEFAULT NULL,
  no_manual CHAR(15) DEFAULT NULL,
  kode_periode CHAR(15) DEFAULT NULL,
  debit DECIMAL(30,2) DEFAULT NULL,
  credit DECIMAL(30,2) DEFAULT NULL,
  keterangan TEXT DEFAULT NULL,
  saldo DECIMAL(30,2) DEFAULT NULL,
  rmrk CHAR(100) DEFAULT NULL,
  user_id CHAR(15) DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_account_list_rpt_kode_perkiraan ON account_list_rpt(kode_perkiraan);
CREATE INDEX idx_account_list_rpt_no_jurnal ON account_list_rpt(no_jurnal);
CREATE INDEX idx_account_list_rpt_tgl_jurnal ON account_list_rpt(tgl_jurnal);
CREATE INDEX idx_account_list_rpt_kode_periode ON account_list_rpt(kode_periode);


DROP TABLE IF EXISTS trans_jurnal_detail CASCADE;

CREATE TABLE trans_jurnal_detail (
  kode_perkiraan VARCHAR(30) NOT NULL,
  no_jurnal VARCHAR(30) NOT NULL,
  debit DECIMAL(30,2) NOT NULL,
  kredit DECIMAL(30,2) NOT NULL,
  seq INT NOT NULL,
  description VARCHAR(255) DEFAULT NULL,
  kode_unit VARCHAR(15) DEFAULT NULL,
  kode_tenant VARCHAR(15) DEFAULT NULL,
  no_ref VARCHAR(30) DEFAULT NULL,
  no_seq INT DEFAULT NULL,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (kode_perkiraan, no_jurnal, seq)
);

-- Create indexes for better query performance
CREATE INDEX idx_trans_jurnal_detail_no_jurnal ON trans_jurnal_detail(no_jurnal);
CREATE INDEX idx_trans_jurnal_detail_kode_perkiraan ON trans_jurnal_detail(kode_perkiraan);
CREATE INDEX idx_trans_jurnal_detail_kode_unit ON trans_jurnal_detail(kode_unit);
CREATE INDEX idx_trans_jurnal_detail_kode_tenant ON trans_jurnal_detail(kode_tenant);

-- ========================================
-- INSERT DATA
-- ========================================
-- hapus dulu kolom load_timestamp dari csv

INSERT INTO cb_out VALUES 
('308/I/BK/2024','2024-01-03','BK02',NULL,NULL,NULL,165000918,NULL,NULL,NULL,165000918,'JASA KEBERSIHAN PT.MJM BULAN SEPTEMBER 2023','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('310/I/BK/2024','2024-01-03','BK09',NULL,NULL,NULL,114368100,NULL,NULL,NULL,114368100,'AIR PARONGPONG, PERPANJANG WEBSITE, WO 90% KPD KARYAWAN BP, REFUND C0507, B2003, D1134 & KONTRIBUSI JAN 2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('312/I/BK/2024','2024-01-17','BK09',NULL,NULL,NULL,127076737,0,0,0,127076737,'PEMBAYARAN VOUCHER NO : 312/I/BK/2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('314/I/BK/2024','2024-01-17','BK01',NULL,NULL,NULL,16800000,NULL,NULL,NULL,16800000,'50% PEMBAYARAN KE-3 ANGSURAN KE-2 DARI 6 TOTAL RP. 288.000.000 UNTUK PEMBELIAN SPAREPART UNIT LIFT PENUMPANG ','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('317/I/BK/2024','2024-01-30','BK10',NULL,NULL,NULL,241853123,0,0,0,241853123,'PEMBAYARAN VOUCHER NO : 317/I/BK/2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('319/II/BK/2024','2024-02-01','BK10',NULL,NULL,NULL,61750000,NULL,NULL,NULL,61750000,'PEMBAYARAN HONOR PANMUS','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('321/II/BK/2024','2024-02-02','BK10',NULL,NULL,NULL,70903897,NULL,NULL,NULL,70903897,'PEMBAYARAN REMUN JAN24 & PIHI-PK','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('324/II/BK/2024','2024-02-05','BK10',NULL,NULL,NULL,52950000,NULL,NULL,NULL,52950000,'PIHI NOV-DES 2023, PIHI JAN 2024 & INSENTIF KEPANITIAAN RUTA','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('326/II/BK/2024','2024-02-15','BK02',NULL,NULL,NULL,98733268,NULL,NULL,NULL,98733268,'PDAM, TELKOM & SAMPAH JAN24, SERVICE LIFT JAN24, INTERNET TELKOM, PASCABAYAR TR & COLLECTION, POLYBAG 140 PACK, CETAK SPANDUK U/ FASUM, REFUND DEPOSIT A1233, B1817, C1727, LEBIH BAYAR A1920 & B2315, PENGANGKUTAN SAMPAH FIT OUT & BIAYA BERLANGGANAN AKUN ZOOM','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('328/II/BK/2024','2024-02-15','BK03',NULL,NULL,NULL,352654330,NULL,NULL,NULL,352654330,'PEMBAYARAN LISTRIK PLN BULAN JANUARI 2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('330/II/BK/2024','2024-02-27','BK02',NULL,NULL,NULL,150841502,NULL,NULL,NULL,150841502,'SAMPAH FEB24, STP FEB23, FOTOCOPY JAN24, TK K BP JAN24, BM CONSULTAN FEE, BPJS, RETRIBUSI PEMERIKSAAN DAMKAR, CHEMICAL KOLAM, KERAMIK & SEALENT, PINTU ALUMUNIUM, SMARTCARD MOBIL & MOTOR, AC R.MEETING, TL, BULB & INLITE, EXTRAFFODING ENG, REFUND DEPOSIT B0529, MEETING PENGURUS, MEETING DGN POLSEK, PASCABAYAR KBP, PEMERIKSAAN BERKALA AIR OLEH DINAS KESEHATAN','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('VO-2403-0001','2024-02-28','BK15',NULL,NULL,NULL,14597835,0,0,0,14597835,'PETTY CASH FEBRUARI 2','P','MEY','2024-03-14',NULL,NULL,NULL,1,NULL,NULL,'Y',NULL,NULL,NULL,NULL,NULL,DEFAULT),
('309/I/BK/2024','2024-01-03','BK02',NULL,NULL,NULL,168182622,NULL,NULL,NULL,168182622,'JASA KEAMANAN BULAN DESEMBER 2023 & PENAMBAHAN ANGGOTA SECURIY','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('311/I/BK/2024','2024-01-11','BK02',NULL,NULL,NULL,114521121,NULL,NULL,NULL,114521121,'PEMBAYARAN VOUCHER NO : 311/I/BK/2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('313/I/BK/2024','2024-01-17','BK02',NULL,NULL,NULL,388503919,NULL,NULL,NULL,388503919,'PEMBAYARAN LISTRIK PLN BULAN DESEMBER 2023','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('316/I/BK/2024','2024-01-30','BK09',NULL,NULL,NULL,112875201,NULL,NULL,NULL,112875201,'PEMBAYARAN VOUCHER NO : 316/I/BK/2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('318/I/BK/2024','2024-01-30','BK02',NULL,NULL,NULL,292956443,NULL,NULL,NULL,292956443,'PEMBAYARAN VOUCHER NO : 318/I/BK/2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('320/II/BK/2024','2024-02-02','BK09',NULL,NULL,NULL,75995760,NULL,NULL,NULL,75995760,'DP 50% NEON SIGN, DP 40% RUANG ENG B1, KONSULTAN LAP.KEU, PINJAMAN ALDI, REMUN JAN24','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('323/II/BK/2024','2024-02-05','BK02',NULL,NULL,NULL,195676622,0,0,0,195676622,'BPM JAN 24, MULTIVITAMIN PROPOELIX, REFUND DEPOSIT C1807, MEETING PERKENALAN PENGIRUS DGN EXTERNAL, SERTIJAB PENGURUS, KONTRIBUSI FEB 24, PENEBALAN & DEKOR TAHUN BARU','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('325/II/BK/2024','2024-02-05','BK09',NULL,NULL,NULL,15080000,NULL,NULL,NULL,15080000,'PETTY CASH JAN24, CCTV, SWITCH POE & HARDISK, REFUND DEPOSIT ALFAMART & UNIT A0124','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('327/II/BK/2024','2024-02-15','BK09',NULL,NULL,NULL,165000918,NULL,NULL,NULL,165000918,'JASA KEBERSIHAN PT.MANDIRI JAYA MAKMUR ABADI BULAN OKTOBER 2023','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('329/II/BK/2024','2024-02-20','BK10',NULL,NULL,NULL,86809899,NULL,NULL,NULL,86809899,'REMUN PENGURUS BARU & PEMBELIAN PERLATAN DAN PERLENGKAPAN PENGURUS BARU','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('331/II/BK/2024','2024-02-28','BK09',NULL,NULL,NULL,248833678,NULL,NULL,NULL,248833678,'GAJI KARYAWAN BADAN PENGELOLA 26 JANUARI 2024 S.D 25 FEBRUARI 2024','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('332/II/BK/2029','2024-02-28','BK10',NULL,NULL,NULL,17097997,NULL,NULL,NULL,17097997,'GAJI STAFF PPPSRS 26 JANUARI 2024 S.D 25 FEBRUARI 2024, BY LANGGANAN WEB THEJARRDIN.COM, SANDISK EXTREME PORTABLE U/ PENGURUS, SPANDUK & PIAGAM SERTIJAB, PETTY CASH FEB24 & SEALENT SIKAFLEX 221 GREY 50 TUBE','P','ADMIN','2024-03-09',NULL,NULL,NULL,1,NULL,NULL,NULL,NULL,NULL,NULL,'Y',NULL,DEFAULT),
('VO-2402-0001','2024-02-05','BK15',NULL,NULL,NULL,15307796,0,0,0,15307796,'PETTY CASH FEBRUARI 1','P','MEY','2024-03-15',NULL,NULL,NULL,1,NULL,NULL,'Y',NULL,NULL,NULL,NULL,NULL,DEFAULT);

COPY cb_out_detail (cb_out_id, seq, coa, amount, keterangan, trans_id, status_tax, amount_tax, potong_pph, amount_pph)
FROM '/Users/rayhanadjisantoso/Desktop/cb_out_detail.csv'
DELIMITER ';'
CSV HEADER;

COPY cb_in (cb_in_id, tanggal, cb_id, coa_in1, coa_in2, coa_in3, amount_in, 
            amount_in1, amount_in2, amount_in3, total_amount_in, keterangan, 
            status, created_by, created_date, reff, posted_by, posted_date, 
            pay_with, no_giro, bank, status_cair_giro, tanggal_cair_giro, 
            tanggal_giro, contact_id, alokasi, charge, token)
FROM '/Users/rayhanadjisantoso/Desktop/cb_in.csv'
DELIMITER ';'
CSV HEADER
NULL 'NULL';

COPY cb_in_detail (cb_in_id, seq, coa, amount, keterangan, trans_id, 
                   status_tax, amount_tax, potong_pph, amount_pph)
FROM '/Users/rayhanadjisantoso/Desktop/cb_in_detail.csv'
DELIMITER ';'
CSV HEADER
NULL 'NULL';

COPY ar_invoiceh (inv_no, inv_date, inv_ref, inv_credit_term, inv_duedate, 
                  inv_descr, inv_tenant, inv_jurnalcategory, inv_contract, 
                  inv_netamount, inv_vatamount, inv_discamount, inv_rate, 
                  inv_taxrate, inv_createby, inv_createdate, inv_cancelby, 
                  inv_canceldate, inv_cancelreason, inv_postby, inv_postdate, 
                  inv_status, inv_cn, tahun, bulan, inv_pphamount, 
                  status_potong_pph, no_pajak, grossup, tgl_pajak, rc_id, 
                  previous, penalty, denda, edit_by, edit_date, status_hosting, 
                  filename, lunas, previous_scsf, previous_elwt, status_wa, 
                  previous_scsf_2016, previous_elwt_2016)
FROM '/Users/rayhanadjisantoso/Desktop/ar_invoiceh.csv'
DELIMITER ';'
CSV HEADER
NULL 'NULL';

COPY cb_payment_detail (payment_id, line_id, inv_no, seq, sisa_net, sisa_vat, 
                        payment_net, payment_vat, payment_pph, other_income, 
                        other_expense, advance, status_potong, payment_penalty, 
                        sisa_penalty, sisa_pph, type_bill, pph, pembayaran_ke)
FROM '/Users/rayhanadjisantoso/Desktop/cb_payment_detail.csv'
DELIMITER ';'
CSV HEADER
NULL 'NULL';

COPY ar_cn (cn_id, cn_date, inv_no, inv_seq, type_bill, cn_amount, status, 
            create_by, create_date, contract_id, cn_vat, keterangan, coa)
FROM '/Users/rayhanadjisantoso/Desktop/ar_cn.csv'
DELIMITER ';'
CSV HEADER
NULL 'NULL';

COPY account_list_rpt (anum, urut, kode_perkiraan, tgl_jurnal, no_jurnal, 
                       no_manual, kode_periode, debit, credit, keterangan, 
                       saldo, rmrk, user_id)
FROM '/Users/rayhanadjisantoso/Desktop/account_list_rpt.csv'
DELIMITER ';'
CSV HEADER
NULL 'NULL';

COPY trans_jurnal_detail (kode_perkiraan, no_jurnal, debit, kredit, seq, 
                          description, kode_unit, kode_tenant, no_ref, no_seq)
FROM '/Users/rayhanadjisantoso/Desktop/trans_jurnal_detail.csv'
DELIMITER ';'
CSV HEADER
NULL 'NULL';