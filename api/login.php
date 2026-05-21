<?php
/**
 * api/login.php — User Login
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body { username, password }
 * Returns: JSON {success, user} or {success, message}
 *
 * Process:
 *   1. Find the user by username
 *   2. Verify the password against the stored bcrypt hash
 *   3. Start a PHP session and store user data
 */

require_once 'db.php';

// ── Only allow POST requests ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Invalid request method.']);
}

// ── Read JSON body from JavaScript Fetch ──────────────────────
$body     = json_decode(file_get_contents('php://input'), true);
$username = isset($body['username']) ? trim($body['username']) : '';
$password = isset($body['password']) ? $body['password']       : '';

// ── Validate: both fields required ───────────────────────────
if (!$username || !$password) {
    respond(['success' => false, 'message' => 'Please enter your username and password.']);
}

// ── Find user in database ─────────────────────────────────────
// We select the hashed password and all profile fields
$stmt = $conn->prepare(
    'SELECT id, username, password, first_name, middle_name, last_name, address, email
     FROM users
     WHERE username = ?
     LIMIT 1'
);
$stmt->bind_param('s', $username);
$stmt->execute();
$result = $stmt->get_result();
$user   = $result->fetch_assoc();
$stmt->close();

// ── Check if user was found ───────────────────────────────────
if (!$user) {
    // Don't reveal which field was wrong (security best practice)
    respond(['success' => false, 'message' => '✖ Incorrect username or password. Please try again.']);
}

// ── Verify the password against the stored hash ───────────────
// password_verify() compares the plain text input with the bcrypt hash
if (!password_verify($password, $user['password'])) {
    respond(['success' => false, 'message' => '✖ Incorrect username or password. Please try again.']);
}

// ── Login success: store user info in PHP session ─────────────
// NOTE: We do NOT store the password hash in the session
$_SESSION['user'] = [
    'id'          => $user['id'],
    'username'    => $user['username'],
    'first_name'  => $user['first_name'],
    'middle_name' => $user['middle_name'],
    'last_name'   => $user['last_name'],
    'address'     => $user['address'],
    'email'       => $user['email'],
];

$conn->close();

// ── Send back the user data (without password) ────────────────
respond([
    'success' => true,
    'message' => 'Login successful!',
    'user'    => $_SESSION['user'],
]);
