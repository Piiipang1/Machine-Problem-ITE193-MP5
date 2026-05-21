<?php
/**
 * api/db.php — Database Connection
 * ITE193 Machine Problem 5
 *
 * This file creates a connection to the MySQL database.
 * It is included (required) by all other PHP API files.
 *
 * CONFIGURATION: Change the values below to match your XAMPP setup.
 */

// ── Database credentials ──────────────────────────────────────
define('DB_HOST',     'localhost');   // XAMPP default host
define('DB_USER',     'root');        // XAMPP default username
define('DB_PASS',     '');            // XAMPP default password (empty)
define('DB_NAME',     'ite193_store'); // The database we created

// ── Allow cross-origin requests from the same server ─────────
// (needed when the HTML and PHP are both on localhost)
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle pre-flight OPTIONS request (sent by browsers before POST)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// ── Enable verbose error reporting during local development ──
error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('display_startup_errors', '1');
mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
// ── Start PHP session (used for login state) ─────────────────
// session_start() must be called before any output
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ── Create MySQLi connection ──────────────────────────────────
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

// ── Check if connection failed ────────────────────────────────
if ($conn->connect_error) {
    // Send a clear error message as JSON and stop execution
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]);
    exit();
}

// ── Set character encoding ────────────────────────────────────
$conn->set_charset('utf8mb4');

/**
 * respond($data)
 * Helper function: converts a PHP array to JSON and sends it to the browser.
 * @param array $data — The data to send back as JSON
 */
function respond(array $data): void {
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}
