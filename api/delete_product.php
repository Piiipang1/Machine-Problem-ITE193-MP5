<?php
/**
 * api/delete_product.php — Delete Product (Admin Only)
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body: { id }
 * Returns: JSON { success, message }
 *
 * Protection: Prevents deletion of a product that already
 * appears in order_items (to preserve historical order data).
 * Admin will see a clear error message if this happens.
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
$id   = isset($body['id']) ? (int)$body['id'] : 0;

if (!$id) {
    respond(['success' => false, 'message' => '✖ Product ID is required.']);
}

// ── Get the product code first ────────────────────────────────
$stmtGet = $conn->prepare('SELECT code, name FROM products WHERE id = ? LIMIT 1');
$stmtGet->bind_param('i', $id);
$stmtGet->execute();
$result  = $stmtGet->get_result();
$product = $result->fetch_assoc();
$stmtGet->close();

if (!$product) {
    respond(['success' => false, 'message' => '✖ Product not found.']);
}

// ── Check if this product has been ordered before ─────────────
$stmtCheck = $conn->prepare(
    'SELECT COUNT(*) AS cnt FROM order_items WHERE product_code = ?'
);
$stmtCheck->bind_param('s', $product['code']);
$stmtCheck->execute();
$row = $stmtCheck->get_result()->fetch_assoc();
$stmtCheck->close();

if ((int)$row['cnt'] > 0) {
    $conn->close();
    respond([
        'success' => false,
        'message' => "✖ Cannot delete \"{$product['name']}\" — it appears in {$row['cnt']} existing order(s). " .
                     "Set its stock to 0 instead to prevent new sales."
    ]);
}

// ── Safe to delete ────────────────────────────────────────────
$stmtDel = $conn->prepare('DELETE FROM products WHERE id = ?');
$stmtDel->bind_param('i', $id);

if ($stmtDel->execute()) {
    $stmtDel->close();
    $conn->close();
    respond([
        'success' => true,
        'message' => "✔ Product \"{$product['name']}\" deleted successfully."
    ]);
} else {
    $stmtDel->close();
    $conn->close();
    respond(['success' => false, 'message' => '✖ Failed to delete product. Please try again.']);
}
