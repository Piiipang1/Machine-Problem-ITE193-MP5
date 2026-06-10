<?php
/**
 * api/get_stats.php — Get Dashboard Statistics for Current User
 * ITE193 Machine Problem 5
 *
 * Accepts: GET request (no parameters)
 * Returns: JSON {success, stats: {total_orders, total_spent, total_items}}
 */

require_once 'db.php';

// ── Require login ─────────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => 'You must be logged in.']);
}

$userId = $_SESSION['user']['id'];

// ── Total orders placed ───────────────────────────────────────
$stmtOrders = $conn->prepare(
    'SELECT COUNT(*) AS total_orders, COALESCE(SUM(total), 0.00) AS total_spent
     FROM orders
     WHERE user_id = ?'
);
$stmtOrders->bind_param('i', $userId);
$stmtOrders->execute();
$rowOrders = $stmtOrders->get_result()->fetch_assoc();
$stmtOrders->close();

// ── Total items purchased (sum of all qty in order_items) ─────
$stmtItems = $conn->prepare(
    'SELECT COALESCE(SUM(oi.qty), 0) AS total_items
     FROM order_items oi
     INNER JOIN orders o ON oi.order_id = o.id
     WHERE o.user_id = ?'
);
$stmtItems->bind_param('i', $userId);
$stmtItems->execute();
$rowItems = $stmtItems->get_result()->fetch_assoc();
$stmtItems->close();
$conn->close();

respond([
    'success' => true,
    'stats'   => [
        'total_orders' => (int)$rowOrders['total_orders'],
        'total_spent'  => (float)$rowOrders['total_spent'],
        'total_items'  => (int)$rowItems['total_items'],
    ],
]);
