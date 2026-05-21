<?php
/**
 * api/get_user.php — Get Current Logged-In User
 * ITE193 Machine Problem 5
 *
 * Accepts: GET request (no parameters needed)
 * Returns: JSON {success, user} if logged in,
 *          or   {success: false} if not logged in
 *
 * The frontend calls this on page load to check if a session exists.
 * This replaces the old sessionStorage.getItem('ite193_session') check.
 */

require_once 'db.php';

// ── Check if a session exists ─────────────────────────────────
if (isset($_SESSION['user']) && !empty($_SESSION['user'])) {

    // Session found — re-fetch the latest user data from DB
    // (This ensures profile changes are reflected immediately)
    $userId = $_SESSION['user']['id'];

    $stmt = $conn->prepare(
        'SELECT id, username, first_name, middle_name, last_name, address, email
         FROM users
         WHERE id = ?
         LIMIT 1'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user   = $result->fetch_assoc();
    $stmt->close();
    $conn->close();

    if ($user) {
        // Update the session with fresh data
        $_SESSION['user'] = $user;
        respond(['success' => true, 'user' => $user]);
    } else {
        // User was deleted from DB — clear the stale session
        session_destroy();
        respond(['success' => false, 'message' => 'Session expired.']);
    }

} else {
    // No session — user is not logged in
    respond(['success' => false, 'message' => 'Not logged in.']);
}
