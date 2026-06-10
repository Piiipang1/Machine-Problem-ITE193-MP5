<?php
/**
 * api/add_stock.php — Add Stock to Existing Product (Admin Only)
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body: { id, quantity }
 * Returns: JSON { success, new_quantity, message }
 *
 * Uses a simple ADD operation (quantity = quantity + input),
 * not a SET, so concurrent requests cannot race to the wrong total.
 */

require_once 'db.php';

// ── Admin-only gate ───────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => '✖ You must be logged in.']);
}
if (($_SESSION['user']['role'] ?? 'student') !== 'admin') {
    respond(['success' => false, 'message' => '✖ Admin access required.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => '✖ Invalid request method.']);
}

// ── Read JSON body ────────────────────────────────────────────
$body     = json_decode(file_get_contents('php://input'), true);
$id       = isset($body['id'])       ? (int)$body['id']       : 0;
$addQty   = isset($body['quantity']) ? (int)$body['quantity']  : 0;

// ── Validate ──────────────────────────────────────────────────
if (!$id) {
    respond(['success' => false, 'message' => '✖ Product ID is required.']);
}
if ($addQty <= 0) {
    respond(['success' => false, 'message' => '✖ Quantity to add must be at least 1.']);
}

// ── Update stock ──────────────────────────────────────────────
$stmt = $conn->prepare(
    'UPDATE products SET quantity = quantity + ? WHERE id = ?'
);
$stmt->bind_param('ii', $addQty, $id);

if (!$stmt->execute() || $stmt->affected_rows === 0) {
    $stmt->close();
    $conn->close();
    respond(['success' => false, 'message' => '✖ Product not found or stock update failed.']);
}
$stmt->close();

// ── Return new quantity ───────────────────────────────────────
$stmtGet = $conn->prepare('SELECT quantity, name FROM products WHERE id = ? LIMIT 1');
$stmtGet->bind_param('i', $id);
$stmtGet->execute();
$row = $stmtGet->get_result()->fetch_assoc();
$stmtGet->close();
$conn->close();

respond([
    'success'      => true,
    'new_quantity' => (int)$row['quantity'],
    'message'      => "✔ Added {$addQty} units to \"{$row['name']}\". New stock: {$row['quantity']}.",
]);
