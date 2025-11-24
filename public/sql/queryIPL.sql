-- Table untuk coa_rtjc.csv
CREATE TABLE coa (
    id SERIAL PRIMARY KEY,
    "Type" VARCHAR(50),
    "Account Code" VARCHAR(20),
    "Description" VARCHAR(255),
    "Detail" VARCHAR(10),
    "Up Level" VARCHAR(20),
    "Map to Neraca" VARCHAR(50),
    "Map to Cash Flow" VARCHAR(50),
    "Pos Budget" VARCHAR(50),
    "Sumber Dana" VARCHAR(50),
    "Category Budget" VARCHAR(50)
);

CREATE TABLE jurnal_invoice_ipl (
    id SERIAL PRIMARY KEY,
    "No. Journal" VARCHAR(30) NOT NULL,
    "Date" DATE,
    "Account Code" VARCHAR(20),
    "Account Name" VARCHAR(100),
    "Type of Bill" VARCHAR(10),
    "Kode Unit" VARCHAR(20),
    "Debit" BIGINT,
    "Credit" BIGINT
);

COPY jurnal_invoice_ipl(
    "No. Journal", "Date", "Account Code", "Account Name",
    "Type of Bill", "Kode Unit", "Debit", "Credit"
)
FROM '/Users/rayhanadjisantoso/Desktop/Jurnal_Invoice_Periode_April_2024.csv'
DELIMITER ';' CSV HEADER;


CREATE TABLE jurnal_pembayaran_ipl (
    id SERIAL PRIMARY KEY,
    "No. Journal" VARCHAR(30) NOT NULL,
    "Date" DATE,
    "Account Code" VARCHAR(20),
    "Account Name" VARCHAR(100),
    "Invoice No" VARCHAR(50),
    "Type of Bill" VARCHAR(10),
    "Kode Unit" VARCHAR(20),
    "Debit" BIGINT,
    "Credit" BIGINT,
);

TRUNCATE TABLE jurnal_pembayaran_ipl RESTART IDENTITY;

COPY jurnal_pembayaran_ipl(
    "No. Journal", "Date", "Account Code", "Account Name",
    "Invoice No", "Type of Bill", "Kode Unit",
    "Debit", "Credit"
)
FROM '/Users/rayhanadjisantoso/Desktop/Jurnal_Penerimaan_Pembayaran_SCSF_Periode_April_2024.csv'
DELIMITER ';' CSV HEADER;


CREATE TABLE jurnal_pemakaian_sc_2024 (
    id SERIAL PRIMARY KEY,
    "Account Code" VARCHAR(20),
    "Account Name" VARCHAR(100),
    "Debit" BIGINT,
    "Credit" BIGINT,
    "Description" TEXT
);

CREATE TABLE jurnal_pemakaian_sf_2024 (
    id SERIAL PRIMARY KEY,
    "Account Code" VARCHAR(20),
    "Account Name" VARCHAR(100),
    "Debit" BIGINT,
    "Credit" BIGINT,
    "Description" TEXT
);


-- 10 Unit dengan Total Tagihan IPL Terbesar
SELECT "Kode Unit", SUM("Debit") AS total_tagihan
FROM jurnal_invoice_ipl
GROUP BY "Kode Unit"
ORDER BY total_tagihan DESC
LIMIT 10;

-- Total Pembayaran IPL Masuk per Hari
SELECT "Date", SUM("Credit") AS total_pembayaran
FROM jurnal_pembayaran_ipl
GROUP BY "Date"
ORDER BY "Date";

-- Perbandingan Jumlah Tagihan SC vs SF
SELECT "Type of Bill", SUM("Debit") AS total_tagihan
FROM jurnal_invoice_ipl
GROUP BY "Type of Bill";

-- Perbandingan Jumlah Tagihan SC vs SF
SELECT "Type of Bill", SUM("Debit") AS total_tagihan
FROM jurnal_invoice_ipl
GROUP BY "Type of Bill";

-- Pengeluaran Operasional SC berdasarkan Akun
SELECT "Account Name", SUM("Debit") AS total_pengeluaran
FROM jurnal_pemakaian_sc_2024
GROUP BY "Account Name"
ORDER BY total_pengeluaran DESC;

-- Proporsi Pengeluaran SC vs SF
SELECT 'SC' AS jenis, SUM("Debit") AS total_pengeluaran
FROM jurnal_pemakaian_sc_2024
UNION ALL
SELECT 'SF' AS jenis, SUM("Debit") AS total_pengeluaran
FROM jurnal_pemakaian_sf_2024;

-- Tren Tagihan IPL per Hari
SELECT "Date", SUM("Debit") AS total_tagihan
FROM jurnal_invoice_ipl
GROUP BY "Date"
ORDER BY "Date";

-- Tagihan vs Pembayaran per Unit
SELECT
  SUM(i."Debit") AS total_tagihan,
  SUM(p."Credit") AS total_pembayaran
FROM jurnal_invoice_ipl i
LEFT JOIN jurnal_pembayaran_ipl p
  ON i."Kode Unit" = p."Kode Unit"
GROUP BY i."Kode Unit"
limit 500;