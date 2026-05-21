<?php
/**
 * api/change_password.php — Change User Password
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request with JSON body:
 *          { current_password, new_password, confirm_password }
 * Returns: JSON {success, message}
 *
 * Process:
 *   1. Verify the user is logged in (session check)
 *   2. Fetch current password hash from DB
 *   3. Verify current_password matches the stored hash
 *   4. Validate the new password (strength check)
 *   5. Make sure new password ≠ current password
 *   6. Hash and update in DB
 *   7. Update session data
 */

require_once 'db.php';

// ── Only allow POST requests ──────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(['success' => false, 'message' => 'Invalid request method.']);
}

// ── Require login ─────────────────────────────────────────────
if (!isset($_SESSION['user'])) {
    respond(['success' => false, 'message' => '✖ You must be logged in to change your password.']);
}

// ── Read JSON body ─────────────────────────────────────────────
$body           = json_decode(file_get_contents('php://input'), true);
$currentPass    = isset($body['current_password'])  ? $body['current_password']  : '';
$newPass        = isset($body['new_password'])       ? $body['new_password']       : '';
$confirmPass    = isset($body['confirm_password'])   ? $body['confirm_password']   : '';

// ── Validate: all fields required ─────────────────────────────
if (!$currentPass || !$newPass || !$confirmPass) {
    respond(['success' => false, 'message' => '✖ All password fields are required.']);
}

// ── Fetch stored hash from database ───────────────────────────
$userId = $_SESSION['user']['id'];

$stmt = $conn->prepare('SELECT password FROM users WHERE id = ? LIMIT 1');
$stmt->bind_param('i', $userId);
$stmt->execute();
$result = $stmt->get_result();
$row    = $result->fetch_assoc();
$stmt->close();

if (!$row) {
    respond(['success' => false, 'message' => '✖ User not found.']);
}

// ── Verify current password ───────────────────────────────────
if (!password_verify($currentPass, $row['password'])) {
    respond(['success' => false, 'message' => '✖ Current password is incorrect.']);
}

// ── New password must differ from current password ────────────
if (password_verify($newPass, $row['password'])) {
    respond(['success' => false, 'message' => '✖ New password must be different from the current one.']);
}

// ── Validate new password strength ───────────────────────────
if (!preg_match('/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/', $newPass)) {
    respond([
        'success' => false,
        'message' => '✖ Password must be 8+ characters with uppercase, lowercase, and a special character.'
    ]);
}

// ── Confirm passwords match ───────────────────────────────────
if ($newPass !== $confirmPass) {
    respond(['success' => false, 'message' => '✖ New password and confirmation do not match.']);
}

// ── Hash the new password ─────────────────────────────────────
$newHash = password_hash($newPass, PASSWORD_BCRYPT);

// ── Update the database ───────────────────────────────────────
$stmt = $conn->prepare('UPDATE users SET password = ? WHERE id = ?');
$stmt->bind_param('si', $newHash, $userId);

if ($stmt->execute()) {
    $stmt->close();
    $conn->close();
    respond(['success' => true, 'message' => '✔ Password updated successfully!']);
} else {
    $stmt->close();
    $conn->close();
    respond(['success' => false, 'message' => '✖ Could not update password. Please try again.']);
}
