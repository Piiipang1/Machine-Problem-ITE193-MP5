-- ============================================================
--  ITE193 Machine Problem 5 — Database Patch
--  Run this script once on an EXISTING ite193_store database.
--  It is SAFE to run multiple times (checks before altering).
--  For a FRESH install, the full ite193_store.sql already
--  includes these changes.
-- ============================================================

USE ite193_store;

-- ── Add category column to products (if not already there) ──
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'ite193_store'
    AND TABLE_NAME   = 'products'
    AND COLUMN_NAME  = 'category'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT ''General'' AFTER name',
  'SELECT ''category column already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Add description column ───────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'ite193_store'
    AND TABLE_NAME   = 'products'
    AND COLUMN_NAME  = 'description'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN description TEXT DEFAULT NULL AFTER category',
  'SELECT ''description column already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Add date_added column ────────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'ite193_store'
    AND TABLE_NAME   = 'products'
    AND COLUMN_NAME  = 'date_added'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE products ADD COLUMN date_added DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER description',
  'SELECT ''date_added column already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Add role column to users ─────────────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'ite193_store'
    AND TABLE_NAME   = 'users'
    AND COLUMN_NAME  = 'role'
);
SET @sql = IF(@col_exists = 0,
  "ALTER TABLE users ADD COLUMN role ENUM('student','admin') NOT NULL DEFAULT 'student' AFTER email",
  'SELECT ''role column already exists'' AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Make sai_indanan the default test admin ──────────────────
UPDATE users SET role = 'admin' WHERE username = 'sai_indanan';

-- ── Set default categories on existing products ──────────────
UPDATE products SET category = 'Noodles & Instant Food' WHERE code IN ('SS001');
UPDATE products SET category = 'Seasoning & Condiments' WHERE code IN ('SS002','SS003');
UPDATE products SET category = 'Snacks & Biscuits'      WHERE code IN ('SS004','SS008','SS015','SS016','SS022');
UPDATE products SET category = 'Beverages'              WHERE code IN ('SS005','SS006','SS011','SS012','SS019','SS021');
UPDATE products SET category = 'Dairy & Milk'           WHERE code IN ('SS007','SS020');
UPDATE products SET category = 'Personal Care'          WHERE code IN ('SS009','SS010');
UPDATE products SET category = 'Tobacco'                WHERE code IN ('SS013');
UPDATE products SET category = 'Candy & Sweets'         WHERE code IN ('SS014');
UPDATE products SET category = 'Canned Goods'           WHERE code IN ('SS017','SS023');
UPDATE products SET category = 'Chocolate & Drinks'     WHERE code IN ('SS018');

SELECT 'Database patch applied successfully!' AS result;
