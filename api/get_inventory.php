<?php
/**
 * api/get_inventory.php — Full Product List for Admin Inventory Table
 * ITE193 Machine Problem 5 (New for Inventory Management)
 *
 * Accepts: GET request (no parameters needed)
 * Returns: JSON {success, products: [...], summary: {...}}
 *
 * Security: Admin-only endpoint.
 * Returns full product details including description, date_added,
 * plus per-product order count for the admin inventory table.
 */

require_once 'db.php';

// ── Admin-only gate ───────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => '✖ You must be logged in.']);
}
if (($_SESSION['user']['role'] ?? 'student') !== 'admin') {
    respond(['success' => false, 'message' => '✖ Admin access required.']);
}

// ── Fetch all products with times ordered ─────────────────────
$result = $conn->query(
    'SELECT
        p.id,
        p.code,
        p.name,
        p.category,
        p.description,
        p.quantity,
        p.unit_price,
        p.image,
        p.date_added,
        p.updated_at,
        COALESCE(SUM(oi.qty), 0) AS times_sold
     FROM products p
     LEFT JOIN order_items oi ON oi.product_code = p.code
     GROUP BY p.id
     ORDER BY p.code ASC'
);

if (!$result) {
    $conn->close();
    respond(['success' => false, 'message' => 'Could not fetch inventory.']);
}

$products = [];
while ($row = $result->fetch_assoc()) {
    $products[] = [
        'id'          => (int)$row['id'],
        'code'        => $row['code'],
        'name'        => $row['name'],
        'category'    => $row['category']    ?? 'General',
        'description' => $row['description'] ?? '',
        'quantity'    => (int)$row['quantity'],
        'unitPrice'   => (float)$row['unit_price'],
        'image'       => $row['image'],
        'date_added'  => $row['date_added'],
        'updated_at'  => $row['updated_at'],
        'times_sold'  => (int)$row['times_sold'],
    ];
}

// ── Summary stats ─────────────────────────────────────────────
$invRow = $conn->query(
    'SELECT
        COUNT(*)                                        AS total_products,
        COALESCE(SUM(quantity), 0)                      AS total_stock,
        SUM(CASE WHEN quantity = 0  THEN 1 ELSE 0 END) AS out_of_stock,
        SUM(CASE WHEN quantity > 0
                  AND quantity <= 5 THEN 1 ELSE 0 END) AS low_stock,
        COALESCE(SUM(quantity * unit_price), 0)         AS inventory_value
     FROM products'
)->fetch_assoc();

$conn->close();

respond([
    'success'  => true,
    'products' => $products,
    'summary'  => [
        'total_products'  => (int)$invRow['total_products'],
        'total_stock'     => (int)$invRow['total_stock'],
        'out_of_stock'    => (int)$invRow['out_of_stock'],
        'low_stock'       => (int)$invRow['low_stock'],
        'inventory_value' => (float)$invRow['inventory_value'],
    ],
]);
