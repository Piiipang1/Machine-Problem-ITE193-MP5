<?php
/**
 * api/register.php — User Registration
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body containing user details.
 * Returns: JSON {success, message}
 *
 * Process:
 *   1. Read and validate input fields
 *   2. Check if username or email already exists
 *   3. Hash the password using bcrypt
 *   4. Insert the new user into the database
 */

require_once 'db.php';

// ── Only allow POST requests ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Invalid request method.']);
}

// ── Read JSON body sent from JavaScript Fetch ─────────────────
$body = json_decode(file_get_contents('php://input'), true);

// ── Extract and clean each field ──────────────────────────────
$firstName  = isset($body['first_name'])  ? trim($body['first_name'])  : '';
$middleName = isset($body['middle_name']) ? trim($body['middle_name']) : '';
$lastName   = isset($body['last_name'])   ? trim($body['last_name'])   : '';
$address    = isset($body['address'])     ? trim($body['address'])     : '';
$email      = isset($body['email'])       ? trim($body['email'])       : '';
$username   = isset($body['username'])    ? trim($body['username'])    : '';
$password   = isset($body['password'])    ? $body['password']          : '';

// ── Validate: required fields must not be empty ───────────────
if (!$firstName || !$lastName || !$address || !$email || !$username || !$password) {
    respond(['success' => false, 'message' => '✖ All fields marked with * are required.']);
}

// ── Validate: email format ────────────────────────────────────
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(['success' => false, 'message' => '✖ Please enter a valid email address.']);
}

// ── Validate: password strength ───────────────────────────────
// Must be 8+ chars, with at least one uppercase, one lowercase, one special char
if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/', $password)) {
    respond([
        'success' => false,
        'message' => '✖ Password must be 8+ characters with uppercase, lowercase, and a special character.'
    ]);
}

// ── Check: username must be unique ────────────────────────────
$stmt = $conn->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
$stmt->bind_param('s', $username);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $stmt->close();
    respond(['success' => false, 'message' => "✖ Username \"$username\" is already taken."]);
}
$stmt->close();

// ── Check: email must be unique ───────────────────────────────
$stmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$stmt->bind_param('s', $email);
$stmt->execute();
$stmt->store_result();

if ($stmt->num_rows > 0) {
    $stmt->close();
    respond(['success' => false, 'message' => '✖ That email address is already registered.']);
}
$stmt->close();

// ── Hash the password (NEVER store plain text passwords!) ─────
$hashedPassword = password_hash($password, PASSWORD_BCRYPT);

// ── Insert new user into the database ────────────────────────
$stmt = $conn->prepare(
    'INSERT INTO users (username, password, first_name, middle_name, last_name, address, email)
     VALUES (?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'sssssss',
    $username,
    $hashedPassword,
    $firstName,
    $middleName,
    $lastName,
    $address,
    $email
);

if ($stmt->execute()) {
    $stmt->close();
    $conn->close();
    respond(['success' => true, 'message' => '✔ Account created! You can now log in.']);
} else {
    $stmt->close();
    $conn->close();
    respond(['success' => false, 'message' => '✖ Registration failed. Please try again.']);
}
