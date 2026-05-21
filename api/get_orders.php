<?php
/**
 * api/get_orders.php — Get User's Order History
 * ITE193 Machine Problem 5
 *
 * Accepts: GET request (no parameters needed)
 * Returns: JSON {success, orders: [{id, total, ordered_at, items: [...]}]}
 */

require_once 'db.php';

// ── Require login ─────────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => 'You must be logged in to view order history.']);
}

$userId = $_SESSION['user']['id'];

// ── Fetch all orders for this user ────────────────────────────
$stmtOrders = $conn->prepare(
    'SELECT id, total, ordered_at
     FROM orders
     WHERE user_id = ?
     ORDER BY ordered_at DESC'
);
$stmtOrders->bind_param('i', $userId);
$stmtOrders->execute();
$ordersResult = $stmtOrders->get_result();

$orders = [];

// ── For each order, fetch its line items ──────────────────────
$stmtItems = $conn->prepare(
    'SELECT product_code, product_name, image, unit_price, qty
     FROM order_items
     WHERE order_id = ?
     ORDER BY id ASC'
);

while ($order = $ordersResult->fetch_assoc()) {
    $orderId = (int)$order['id'];

    $stmtItems->bind_param('i', $orderId);
    $stmtItems->execute();
    $itemsResult = $stmtItems->get_result();

    $items = [];
    while ($item = $itemsResult->fetch_assoc()) {
        $items[] = [
            'code'      => $item['product_code'],
            'name'      => $item['product_name'],
            'image'     => $item['image'],
            'unitPrice' => (float)$item['unit_price'],
            'qty'       => (int)$item['qty'],
            'subtotal'  => (float)$item['unit_price'] * (int)$item['qty'],
        ];
    }

    $orders[] = [
        'id'         => $orderId,
        'total'      => (float)$order['total'],
        'ordered_at' => $order['ordered_at'],
        'items'      => $items,
    ];
}

$stmtItems->close();
$stmtOrders->close();
$conn->close();

respond(['success' => true, 'orders' => $orders]);
