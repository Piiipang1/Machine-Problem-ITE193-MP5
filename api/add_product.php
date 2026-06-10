<?php
/**
 * api/add_product.php — Add New Product (Admin Only)
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body:
 *          { code, name, category, description, unit_price, quantity, image }
 * Returns: JSON { success, product_id, message }
 *
 * Security:
 *   - Requires an active PHP session
 *   - Requires the logged-in user to have role = 'admin'
 *   - All inputs are validated and bound via prepared statements (no SQL injection)
 */

require_once 'db.php';

// ── Admin-only gate ───────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => '✖ You must be logged in.']);
}
if (($_SESSION['user']['role'] ?? 'student') !== 'admin') {
    respond(['success' => false, 'message' => '✖ Admin access required.']);
}

// ── Only allow POST ──────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => '✖ Invalid request method.']);
}

// ── Read JSON body ────────────────────────────────────────────
$body = json_decode(file_get_contents('php://input'), true);

$code        = isset($body['code'])        ? strtoupper(trim($body['code']))   : '';
$name        = isset($body['name'])        ? trim($body['name'])               : '';
$category    = isset($body['category'])    ? trim($body['category'])           : 'General';
$description = isset($body['description']) ? trim($body['description'])        : '';
$unitPrice   = isset($body['unit_price'])  ? (float)$body['unit_price']        : 0.0;
$quantity    = isset($body['quantity'])    ? (int)$body['quantity']            : 0;
$image       = isset($body['image'])       ? trim($body['image'])              : '📦';

// ── Validate required fields ──────────────────────────────────
if (!$code || !$name || !$category) {
    respond(['success' => false, 'message' => '✖ Code, Name, and Category are required.']);
}

if ($unitPrice <= 0) {
    respond(['success' => false, 'message' => '✖ Price must be greater than zero.']);
}

if ($quantity < 0) {
    respond(['success' => false, 'message' => '✖ Quantity cannot be negative.']);
}

// ── Check for duplicate product code ─────────────────────────
$check = $conn->prepare('SELECT id FROM products WHERE code = ? LIMIT 1');
$check->bind_param('s', $code);
$check->execute();
$check->store_result();
if ($check->num_rows > 0) {
    $check->close();
    respond(['success' => false, 'message' => "✖ Product code \"$code\" already exists."]);
}
$check->close();

// ── Insert new product ────────────────────────────────────────
$stmt = $conn->prepare(
    'INSERT INTO products (code, name, category, description, unit_price, quantity, image)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param('ssssdis', $code, $name, $category, $description, $unitPrice, $quantity, $image);

if ($stmt->execute()) {
    $newId = $conn->insert_id;
    $stmt->close();
    $conn->close();
    respond([
        'success'    => true,
        'product_id' => $newId,
        'message'    => "✔ Product \"$name\" added successfully!",
    ]);
} else {
    $stmt->close();
    $conn->close();
    respond(['success' => false, 'message' => '✖ Failed to add product. Please try again.']);
}
