<?php
/**
 * api/add_order.php — Process Checkout (Transactional)
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body:
 *          { items: [{code, name, image, unit_price, qty}, ...], total }
 * Returns: JSON {success, order_id, message}
 *
 * This is the most important backend file. It uses a MySQL TRANSACTION
 * to guarantee that either ALL steps succeed together, or NONE of them
 * are saved (rolled back on error).
 *
 * TRANSACTION STEPS:
 *   START TRANSACTION
 *     1. INSERT INTO orders (user_id, total)
 *     2. For each cart item:
 *          INSERT INTO order_items (order_id, product_code, product_name, ...)
 *     3. For each cart item:
 *          UPDATE products SET quantity = quantity - qty WHERE code = ?
 *          (Also checks that stock is sufficient BEFORE deducting)
 *   COMMIT   ← only if all steps succeed
 *   ROLLBACK ← if any step fails
 */

require_once 'db.php';

// ── Only allow POST requests ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Invalid request method.']);
}

// ── Require login ─────────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => 'You must be logged in to checkout.']);
}

// ── Read and decode JSON body ──────────────────────────────────
$body  = json_decode(file_get_contents('php://input'), true);
$items = isset($body['items']) ? $body['items'] : [];
$total = isset($body['total']) ? (float)$body['total'] : 0.0;

// ── Validate: cart must not be empty ─────────────────────────
if (empty($items)) {
    respond(['success' => false, 'message' => 'Your cart is empty.']);
}

$userId = $_SESSION['user']['id'];

// ────────────────────────────────────────────────────────────────
//  BEGIN MYSQL TRANSACTION
//  All queries below are grouped as one atomic operation.
// ────────────────────────────────────────────────────────────────
$conn->begin_transaction();

try {

    // ── STEP 1: Validate stock levels BEFORE making any changes ──
    // This prevents partial deductions if one item is out of stock.
    foreach ($items as $item) {
        $code = $item['code'];
        $qty  = (int)$item['qty'];

        $stmt = $conn->prepare(
            'SELECT quantity, name FROM products WHERE code = ? LIMIT 1 FOR UPDATE'
        );
        // FOR UPDATE locks the row so no other transaction can change it simultaneously
        $stmt->bind_param('s', $code);
        $stmt->execute();
        $result  = $stmt->get_result();
        $product = $result->fetch_assoc();
        $stmt->close();

        if (!$product) {
            throw new Exception("Product \"$code\" not found.");
        }

        if ($product['quantity'] < $qty) {
            throw new Exception(
                "Insufficient stock for \"{$product['name']}\". " .
                "Available: {$product['quantity']}, Requested: {$qty}."
            );
        }
    }

    // ── STEP 2: Insert the main order record ──────────────────────
    $stmt = $conn->prepare(
        'INSERT INTO orders (user_id, total) VALUES (?, ?)'
    );
    $stmt->bind_param('id', $userId, $total);
    $stmt->execute();
    $orderId = $conn->insert_id;   // Get the new order's auto-increment ID
    $stmt->close();

    if (!$orderId) {
        throw new Exception('Failed to create order record.');
    }

    // ── STEP 3: Insert each order item ───────────────────────────
    $stmtItem = $conn->prepare(
        'INSERT INTO order_items (order_id, product_code, product_name, image, unit_price, qty)
         VALUES (?, ?, ?, ?, ?, ?)'
    );

    foreach ($items as $item) {
        $code      = $item['code'];
        $name      = $item['name'];
        $image     = isset($item['image']) ? $item['image'] : '📦';
        $unitPrice = (float)$item['unit_price'];
        $qty       = (int)$item['qty'];

        $stmtItem->bind_param('isssdi', $orderId, $code, $name, $image, $unitPrice, $qty);
        $stmtItem->execute();
    }

    $stmtItem->close();

    // ── STEP 4: Deduct product quantities from inventory ──────────
    $stmtUpdate = $conn->prepare(
        'UPDATE products SET quantity = quantity - ? WHERE code = ?'
    );

    foreach ($items as $item) {
        $qty  = (int)$item['qty'];
        $code = $item['code'];

        $stmtUpdate->bind_param('is', $qty, $code);
        $stmtUpdate->execute();
    }

    $stmtUpdate->close();

    // ── COMMIT: All steps succeeded — save everything ─────────────
    $conn->commit();
    $conn->close();

    respond([
        'success'  => true,
        'order_id' => $orderId,
        'message'  => 'Checkout successful! Inventory updated. ✅',
    ]);

} catch (Exception $e) {

    // ── ROLLBACK: Something went wrong — undo ALL changes ─────────
    $conn->rollback();
    $conn->close();

    respond([
        'success' => false,
        'message' => '✖ Checkout failed: ' . $e->getMessage(),
    ]);
}
