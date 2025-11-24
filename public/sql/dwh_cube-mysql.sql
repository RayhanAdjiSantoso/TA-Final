-- ========================================
-- CREATE DATABASE DWH_CUBE
-- ========================================

DROP DATABASE IF EXISTS dwh_cube;
CREATE DATABASE dwh_cube;
USE dwh_cube;

-- ========================================
-- 1. TABEL JURNAL_INVOICE
-- ========================================
-- Menyimpan data jurnal invoice dari account_list_rpt dan trans_jurnal_detail

DROP TABLE IF EXISTS jurnal_invoice;
CREATE TABLE jurnal_invoice (
    id_invoice BIGINT AUTO_INCREMENT PRIMARY KEY,
    coa VARCHAR(30) NOT NULL,
    no_jurnal VARCHAR(30) NOT NULL,
    tgl_jurnal DATE NOT NULL,
    debit DECIMAL(30,2) DEFAULT 0,
    kredit DECIMAL(30,2) DEFAULT 0,
    coa_description VARCHAR(100),
    type_bill VARCHAR(255),
    kode_unit VARCHAR(255),
    load_timestamp BIGINT NOT NULL,
    INDEX idx_no_jurnal (no_jurnal),
    INDEX idx_tgl_jurnal (tgl_jurnal),
    INDEX idx_coa (coa),
    INDEX idx_kode_unit (kode_unit)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ========================================
-- 2. TABEL JURNAL_PEMAKAIAN
-- ========================================
-- Menyimpan data pengeluaran dari cb_out dan cb_out_detail

DROP TABLE IF EXISTS jurnal_pemakaian;
CREATE TABLE jurnal_pemakaian (
    id_pemakaian BIGINT AUTO_INCREMENT PRIMARY KEY,
    cb_out_id VARCHAR(30) NOT NULL,
    tanggal DATE NOT NULL,
    coa VARCHAR(30),
    amount DECIMAL(10,0),
    keterangan VARCHAR(500),
    total_amount_out DECIMAL(10,0),
    load_timestamp BIGINT NOT NULL,
    INDEX idx_cb_out_id (cb_out_id),
    INDEX idx_tanggal (tanggal),
    INDEX idx_coa (coa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ========================================
-- 3. TABEL JURNAL_PENERIMAAN
-- ========================================
-- Menyimpan data penerimaan dari cb_in dan cb_in_detail

DROP TABLE IF EXISTS jurnal_penerimaan;
CREATE TABLE jurnal_penerimaan (
    id_penerimaan BIGINT AUTO_INCREMENT PRIMARY KEY,
    cb_in_id VARCHAR(30) NOT NULL,
    tanggal DATE NOT NULL,
    coa VARCHAR(30),
    amount DECIMAL(10,0),
    keterangan VARCHAR(100),
    total_amount_in DECIMAL(10,0),
    load_timestamp BIGINT NOT NULL,
    INDEX idx_cb_in_id (cb_in_id),
    INDEX idx_tanggal (tanggal),
    INDEX idx_coa (coa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ========================================
-- 4. TABEL JURNAL_PEMBAYARAN
-- ========================================
-- Menyimpan data pembayaran dari ar_invoiceh, cb_payment_detail, dan ar_cn

DROP TABLE IF EXISTS jurnal_pembayaran;
CREATE TABLE jurnal_pembayaran (
    id_pembayaran BIGINT AUTO_INCREMENT PRIMARY KEY,
    inv_no VARCHAR(30) NOT NULL,
    inv_date DATE,
    inv_duedate DATE,
    inv_descr VARCHAR(100),
    inv_netamount DECIMAL(10,0),
    inv_vatamount DECIMAL(10,0),
    type_bill VARCHAR(15),
    cn_amount DECIMAL(10,0),
    cn_keterangan VARCHAR(200),
    coa VARCHAR(30),
    payment_id VARCHAR(30),
    payment_net DECIMAL(10,0),
    payment_vat DECIMAL(10,0),
    sisa_net DECIMAL(10,0),
    sisa_vat DECIMAL(10,0),
    pembayaran_ke INT,
    lunas CHAR(1),
    load_timestamp BIGINT NOT NULL,
    INDEX idx_inv_no (inv_no),
    INDEX idx_inv_date (inv_date),
    INDEX idx_payment_id (payment_id),
    INDEX idx_type_bill (type_bill),
    INDEX idx_coa (coa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


-- ========================================
-- INSERT DATA
-- ========================================

-- Insert ke jurnal_invoice
INSERT INTO jurnal_invoice (
    coa, no_jurnal, tgl_jurnal, debit, kredit, 
    coa_description, type_bill, kode_unit, load_timestamp
)
SELECT 
    a.kode_perkiraan,
    a.no_jurnal,
    a.tgl_jurnal,
    a.debit,
    a.credit,
    a.rmrk,
    -- Kolom type_bill berdasarkan rmrk
    CASE 
        WHEN a.rmrk = 'Piutang - Iuran Pengelolaan' THEN 'SC'
        WHEN a.rmrk = 'Piutang - Dana Cadangan' THEN 'SF'
        ELSE NULL
    END,
    -- Kolom kode_unit di-extract dari description
    CASE
        -- Pattern 1: 'Type Of Bill : XX -- KODE_UNIT'
        WHEN t.description LIKE 'Type Of Bill :%' THEN
            TRIM(SUBSTRING_INDEX(t.description, '--', -1))
        
        -- Pattern 2: 'Inv No. : xxx -- Type: XX  Unit: KODE_UNIT  -  NAMA'
        -- atau      'Inv No. : xxx #1 -- Type: XX  Unit: KODE_UNIT  -  NAMA'
        WHEN t.description LIKE '%Unit:%-%' THEN
            TRIM(REGEXP_REPLACE(
                SUBSTRING_INDEX(SUBSTRING_INDEX(t.description, 'Unit:', -1), '-', 1),
                '[[:space:]]+', ' '
            ))
        
        -- Pattern 3: tidak ada pattern yang cocok, ambil seluruh description
        ELSE t.description
    END,
    UNIX_TIMESTAMP()
FROM account_list_rpt a
LEFT JOIN trans_jurnal_detail t 
    ON a.no_jurnal = t.no_jurnal 
    AND a.kode_perkiraan = t.kode_perkiraan
WHERE a.kode_perkiraan = '1.01.04.01.00'
   OR a.kode_perkiraan = '1.01.04.02.00'
ORDER BY a.tgl_jurnal, a.no_jurnal;


-- Insert ke jurnal_pemakaian
INSERT INTO jurnal_pemakaian (
    cb_out_id, tanggal, coa, amount, keterangan, 
    total_amount_out, load_timestamp
)
SELECT 
    co.cb_out_id,
    co.tanggal,
    cod.coa,
    cod.amount,
    cod.keterangan,
    co.total_amount_out,
    UNIX_TIMESTAMP() * 1000
FROM cb_out co
INNER JOIN cb_out_detail cod 
    ON co.cb_out_id = cod.cb_out_id
ORDER BY co.tanggal, co.cb_out_id;


-- Insert ke jurnal_penerimaan
INSERT INTO jurnal_penerimaan (
    cb_in_id, tanggal, coa, amount, keterangan, 
    total_amount_in, load_timestamp
)
SELECT 
    ci.cb_in_id,
    ci.tanggal,
    cid.coa,
    cid.amount,
    cid.keterangan,
    ci.total_amount_in,
    UNIX_TIMESTAMP() * 1000
FROM cb_in ci
INNER JOIN cb_in_detail cid 
    ON ci.cb_in_id = cid.cb_in_id
ORDER BY ci.tanggal, ci.cb_in_id;


-- Insert ke jurnal_pembayaran
INSERT INTO jurnal_pembayaran (
    inv_no, inv_date, inv_duedate, inv_descr, inv_netamount, 
    inv_vatamount, type_bill, cn_amount, cn_keterangan, coa, 
    payment_id, payment_net, payment_vat, sisa_net, sisa_vat, 
    pembayaran_ke, lunas, load_timestamp
)
SELECT 
    i.inv_no,
    i.inv_date,
    i.inv_duedate,
    i.inv_descr,
    i.inv_netamount,
    i.inv_vatamount,
    cpd.type_bill,
    cn.cn_amount,
    cn.keterangan AS cn_keterangan,
    cn.coa,
    cpd.payment_id,
    cpd.payment_net,
    cpd.payment_vat,
    cpd.sisa_net,
    cpd.sisa_vat,
    cpd.pembayaran_ke,
    i.lunas,
    UNIX_TIMESTAMP() * 1000
FROM ar_invoiceh i
INNER JOIN cb_payment_detail cpd 
    ON i.inv_no = cpd.inv_no
LEFT JOIN ar_cn cn 
    ON i.inv_no = cn.inv_no 
    AND cpd.type_bill = cn.type_bill
WHERE cpd.type_bill = 'SC' OR cpd.type_bill = 'SF'
ORDER BY i.inv_date, i.inv_no;