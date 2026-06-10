<?php
/**
 * api/edit_product.php — Edit Existing Product (Admin Only)
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body:
 *          { id, name, category, description, unit_price, image }
 * Returns: JSON { success, message }
 *
 * Notes:
 *   - Product code is NOT editable after creation (it's a key)
 *   - Quantity is NOT updated here; use add_stock.php for restocking
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
$body = json_decode(file_get_contents('php://input'), true);

$id          = isset($body['id'])          ? (int)$body['id']              : 0;
$name        = isset($body['name'])        ? trim($body['name'])           : '';
$category    = isset($body['category'])    ? trim($body['category'])       : 'General';
$description = isset($body['description']) ? trim($body['description'])    : '';
$unitPrice   = isset($body['unit_price'])  ? (float)$body['unit_price']    : 0.0;
$image       = isset($body['image'])       ? trim($body['image'])          : '📦';

// ── Validate ──────────────────────────────────────────────────
if (!$id) {
    respond(['success' => false, 'message' => '✖ Product ID is required.']);
}
if (!$name || !$category) {
    respond(['success' => false, 'message' => '✖ Name and Category are required.']);
}
if ($unitPrice <= 0) {
    respond(['success' => false, 'message' => '✖ Price must be greater than zero.']);
}

// ── Update product ───────────────────────────────────────────────
$stmt = $conn->prepare(
    'UPDATE products
     SET name = ?, category = ?, description = ?, unit_price = ?, image = ?
     WHERE id = ?'
);
$stmt->bind_param('sssdsi', $name, $category, $description, $unitPrice, $image, $id);

try {
    $stmt->execute();
} catch (Exception $e) {
    $stmt->close();
    $conn->close();
    respond(['success' => false, 'message' => '✖ Failed to update product. Please try again.']);
}

$affected = $stmt->affected_rows;
$stmt->close();
$conn->close();

if ($affected === 0) {
    // No rows changed: either product doesn't exist or data is identical
    respond(['success' => true, 'message' => '✔ Product updated successfully (no changes detected).']);
}

respond(['success' => true, 'message' => '✔ Product updated successfully!']);
