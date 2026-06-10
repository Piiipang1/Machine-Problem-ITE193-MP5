<?php
/**
 * api/get_stats.php — Get Dashboard Statistics
 * ITE193 Machine Problem 5 (Enhanced)
 *
 * Accepts: GET request (no parameters)
 * Returns: JSON {success, stats: {total_orders, total_spent, total_items, inventory?}}
 *
 * For admin users, also returns global inventory statistics:
 *   - total_products, total_stock, low_stock_count, out_of_stock_count, total_inventory_value
 */

require_once 'db.php';

// ── Require login ─────────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => 'You must be logged in.']);
}

$userId = $_SESSION['user']['id'];
$role   = $_SESSION['user']['role'] ?? 'student';

// ── Total orders placed & total spent ─────────────────────────
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

$stats = [
    'total_orders' => (int)$rowOrders['total_orders'],
    'total_spent'  => (float)$rowOrders['total_spent'],
    'total_items'  => (int)$rowItems['total_items'],
];

// ── Admin-only: Global inventory stats ───────────────────────
if ($role === 'admin') {
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

    $stats['inventory'] = [
        'total_products'  => (int)$invRow['total_products'],
        'total_stock'     => (int)$invRow['total_stock'],
        'out_of_stock'    => (int)$invRow['out_of_stock'],
        'low_stock'       => (int)$invRow['low_stock'],
        'inventory_value' => (float)$invRow['inventory_value'],
    ];
}

$conn->close();

respond(['success' => true, 'stats' => $stats]);
