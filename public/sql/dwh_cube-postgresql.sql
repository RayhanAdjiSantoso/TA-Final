-- ========================================
-- CREATE DATABASE DWH_CUBE
-- ========================================

DROP DATABASE IF EXISTS dwh_cube;
CREATE DATABASE dwh_cube;
\c dwh_cube;

-- ========================================
-- 1. TABEL JURNAL_INVOICE
-- ========================================
-- Menyimpan data jurnal invoice dari account_list_rpt dan trans_jurnal_detail

DROP TABLE IF EXISTS jurnal_invoice;
CREATE TABLE jurnal_invoice (
    id_invoice BIGSERIAL PRIMARY KEY,
    coa VARCHAR(30) NOT NULL,
    no_jurnal VARCHAR(30) NOT NULL,
    tgl_jurnal DATE NOT NULL,
    debit DECIMAL(30,2) DEFAULT 0,
    kredit DECIMAL(30,2) DEFAULT 0,
    coa_description VARCHAR(100),
    type_bill VARCHAR(255),
    kode_unit VARCHAR(255),
    load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_no_jurnal ON jurnal_invoice(no_jurnal);
CREATE INDEX idx_tgl_jurnal ON jurnal_invoice(tgl_jurnal);
CREATE INDEX idx_coa ON jurnal_invoice(coa);
CREATE INDEX idx_kode_unit ON jurnal_invoice(kode_unit);


-- ========================================
-- 2. TABEL JURNAL_PEMAKAIAN
-- ========================================
-- Menyimpan data pengeluaran dari cb_out dan cb_out_detail

DROP TABLE IF EXISTS jurnal_pemakaian;
CREATE TABLE jurnal_pemakaian (
    id_pemakaian BIGSERIAL PRIMARY KEY,
    cb_out_id VARCHAR(30) NOT NULL,
    tanggal DATE NOT NULL,
    coa VARCHAR(30),
    amount DECIMAL(10,0),
    keterangan VARCHAR(500),
    total_amount_out DECIMAL(10,0),
    load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cb_out_id ON jurnal_pemakaian(cb_out_id);
CREATE INDEX idx_tanggal ON jurnal_pemakaian(tanggal);
CREATE INDEX idx_coa_pemakaian ON jurnal_pemakaian(coa);


-- ========================================
-- 3. TABEL JURNAL_PENERIMAAN
-- ========================================
-- Menyimpan data penerimaan dari cb_in dan cb_in_detail

DROP TABLE IF EXISTS jurnal_penerimaan;
CREATE TABLE jurnal_penerimaan (
    id_penerimaan BIGSERIAL PRIMARY KEY,
    cb_in_id VARCHAR(30) NOT NULL,
    tanggal DATE NOT NULL,
    coa VARCHAR(30),
    amount DECIMAL(10,0),
    keterangan VARCHAR(100),
    total_amount_in DECIMAL(10,0),
    load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cb_in_id ON jurnal_penerimaan(cb_in_id);
CREATE INDEX idx_tanggal_penerimaan ON jurnal_penerimaan(tanggal);
CREATE INDEX idx_coa_penerimaan ON jurnal_penerimaan(coa);


-- ========================================
-- 4. TABEL JURNAL_PEMBAYARAN
-- ========================================
-- Menyimpan data pembayaran dari ar_invoiceh, cb_payment_detail, dan ar_cn

DROP TABLE IF EXISTS jurnal_pembayaran;
CREATE TABLE jurnal_pembayaran (
    id_pembayaran BIGSERIAL PRIMARY KEY,
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
    load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inv_no ON jurnal_pembayaran(inv_no);
CREATE INDEX idx_inv_date ON jurnal_pembayaran(inv_date);
CREATE INDEX idx_payment_id ON jurnal_pembayaran(payment_id);
CREATE INDEX idx_type_bill ON jurnal_pembayaran(type_bill);
CREATE INDEX idx_coa_pembayaran ON jurnal_pembayaran(coa);


-- ========================================
-- 4. TABEL CoA
-- ========================================
CREATE TABLE coa (
    no INT,
    type VARCHAR(50),
    account_code VARCHAR(20) UNIQUE,
    description VARCHAR(255),
    detail VARCHAR(10),
    up_level VARCHAR(20),
    map_to_neraca VARCHAR(100),
    map_to_cash_flow VARCHAR(100),
    pos_budget VARCHAR(100),
    sumber_dana VARCHAR(100),
    category_budget VARCHAR(100)
);


-- ========================================
-- INSERT DATA
-- ========================================

-- Insert ke jurnal_invoice
INSERT INTO jurnal_invoice (
    coa, no_jurnal, tgl_jurnal, debit, kredit, 
    coa_description, type_bill, kode_unit
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
            TRIM(SPLIT_PART(t.description, '--', 2))
        
        -- Pattern 2: 'Inv No. : xxx -- Type: XX  Unit: KODE_UNIT  -  NAMA'
        -- atau      'Inv No. : xxx #1 -- Type: XX  Unit: KODE_UNIT  -  NAMA'
        WHEN t.description LIKE '%Unit:%-%' THEN
            TRIM(REGEXP_REPLACE(
                SPLIT_PART(SPLIT_PART(t.description, 'Unit:', 2), '-', 1),
                '\s+', ' ', 'g'
            ))
        
        -- Pattern 3: tidak ada pattern yang cocok, ambil seluruh description
        ELSE t.description
    END
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
    total_amount_out
)
SELECT 
    co.cb_out_id,
    co.tanggal,
    cod.coa,
    cod.amount,
    cod.keterangan,
    co.total_amount_out
FROM cb_out co
INNER JOIN cb_out_detail cod 
    ON co.cb_out_id = cod.cb_out_id
ORDER BY co.tanggal, co.cb_out_id;


-- Insert ke jurnal_penerimaan
INSERT INTO jurnal_penerimaan (
    cb_in_id, tanggal, coa, amount, keterangan, 
    total_amount_in
)
SELECT 
    ci.cb_in_id,
    ci.tanggal,
    cid.coa,
    cid.amount,
    cid.keterangan,
    ci.total_amount_in
FROM cb_in ci
INNER JOIN cb_in_detail cid 
    ON ci.cb_in_id = cid.cb_in_id
ORDER BY ci.tanggal, ci.cb_in_id;


-- Insert ke jurnal_pembayaran
INSERT INTO jurnal_pembayaran (
    inv_no, inv_date, inv_duedate, inv_descr, inv_netamount, 
    inv_vatamount, type_bill, cn_amount, cn_keterangan, coa, 
    payment_id, payment_net, payment_vat, sisa_net, sisa_vat, 
    pembayaran_ke, lunas
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
    i.lunas
FROM ar_invoiceh i
INNER JOIN cb_payment_detail cpd 
    ON i.inv_no = cpd.inv_no
LEFT JOIN ar_cn cn 
    ON i.inv_no = cn.inv_no 
    AND cpd.type_bill = cn.type_bill
WHERE cpd.type_bill = 'SC' OR cpd.type_bill = 'SF'
ORDER BY i.inv_date, i.inv_no;


-- Insert ke CoA
COPY coa (no, type, account_code, description, detail, up_level, map_to_neraca, map_to_cash_flow, pos_budget, sumber_dana, category_budget)
FROM '/Users/rayhanadjisantoso/Desktop/Tugas TA2 Sem. 9/Data IPL/2024/Cleaned/csv/CoA_RTJC.csv'
DELIMITER ';'
CSV HEADER
NULL '-';