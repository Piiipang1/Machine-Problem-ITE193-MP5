<?php
/**
 * api/get_products.php — Get All Products
 * ITE193 Machine Problem 5 (Enhanced for MP6 Inventory System)
 *
 * Accepts: GET request (no parameters needed)
 * Returns: JSON {success, products: [...]}
 *
 * Now returns category, description, and date_added so the
 * frontend can display richer product cards and admin inventory table.
 */

require_once 'db.php';

// ── Fetch all products ordered by product code ────────────────
$result = $conn->query(
    'SELECT id, code, name, category, description, quantity, unit_price, image, date_added
     FROM products
     ORDER BY code ASC'
);

if (!$result) {
    $conn->close();
    respond(['success' => false, 'message' => 'Could not fetch products.']);
}

// ── Build the products array ──────────────────────────────────
$products = [];

while ($row = $result->fetch_assoc()) {
    $products[] = [
        'id'          => (int)$row['id'],
        'code'        => $row['code'],
        'name'        => $row['name'],
        'category'    => $row['category']    ?? 'General',
        'description' => $row['description'] ?? '',
        'quantity'    => (int)$row['quantity'],
        'unitPrice'   => (float)$row['unit_price'],  // camelCase for JS compatibility
        'image'       => $row['image'],
        'date_added'  => $row['date_added']  ?? null,
    ];
}

$conn->close();

// ── Return JSON response ──────────────────────────────────────
respond(['success' => true, 'products' => $products]);
