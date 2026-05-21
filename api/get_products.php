<?php
/**
 * api/get_products.php — Get All Products
 * ITE193 Machine Problem 5
 *
 * Accepts: GET request (no parameters needed)
 * Returns: JSON {success, products: [...]}
 *
 * Fetches the full product list from the MySQL products table.
 * This replaces the old fetch('products.json') and localStorage approach.
 */

require_once 'db.php';

// ── Fetch all products ordered by product code ────────────────
$result = $conn->query(
    'SELECT id, code, name, quantity, unit_price, image
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
        'id'        => (int)$row['id'],
        'code'      => $row['code'],
        'name'      => $row['name'],
        'quantity'  => (int)$row['quantity'],
        'unitPrice' => (float)$row['unit_price'],  // camelCase to match old JS
        'image'     => $row['image'],
    ];
}

$conn->close();

// ── Return JSON response ──────────────────────────────────────
respond(['success' => true, 'products' => $products]);
