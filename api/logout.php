<?php
/**
 * api/logout.php — User Logout
 * ITE193 Machine Problem 5
 *
 * Accepts: POST request (no body needed)
 * Returns: JSON {success: true}
 *
 * Process:
 *   1. Start (or resume) the session
 *   2. Destroy it completely
 */

require_once 'db.php';

// ── Destroy all session data ──────────────────────────────────
$_SESSION = [];                // Clear session variables array
session_destroy();             // Destroy the session on the server

// ── Send success response ─────────────────────────────────────
respond(['success' => true, 'message' => 'You have been logged out.']);
