<?php
/**
 * generate_hashes.php — Password Hash Generator
 * ITE193 Machine Problem 5 — UTILITY FILE
 *
 * PURPOSE:
 *   The sample users in ite193_store.sql have pre-computed bcrypt hashes.
 *   If those hashes do not work with your version of PHP, run THIS file
 *   first to generate fresh hashes, then copy them into ite193_store.sql.
 *
 * HOW TO USE:
 *   1. Place this file inside htdocs/ite193_store/
 *   2. Open: http://localhost/ite193_store/generate_hashes.php
 *   3. Copy the generated SQL INSERT statements
 *   4. Replace the users INSERT block in ite193_store.sql
 *   5. Re-import the SQL in phpMyAdmin
 *
 * DELETE THIS FILE after you are done — it is only needed for setup!
 */

// Sample users from users.json with their original plain-text passwords
$users = [
    ['username' => 'sai_indanan',     'password' => 'Sai@1234',   'first_name' => 'Sai',   'middle_name' => 'Cruz',     'last_name' => 'Indanan',   'address' => '123 Rizal St., Davao City',       'email' => 'sai.indanan@ite193.edu'],
    ['username' => 'maria_reyes',     'password' => 'Maria@1234', 'first_name' => 'Maria', 'middle_name' => 'Santos',   'last_name' => 'Reyes',     'address' => '456 Mabini Ave., Cebu City',      'email' => 'maria.reyes@ite193.edu'],
    ['username' => 'juan_cruz',       'password' => 'Juan@1234',  'first_name' => 'Juan',  'middle_name' => 'dela',     'last_name' => 'Cruz',      'address' => '789 Bonifacio Blvd., Manila',     'email' => 'juan.cruz@ite193.edu'],
    ['username' => 'ana_garcia',      'password' => 'Ana@1234',   'first_name' => 'Ana',   'middle_name' => 'Lim',      'last_name' => 'Garcia',    'address' => '321 Quezon Road, Iloilo City',    'email' => 'ana.garcia@ite193.edu'],
    ['username' => 'carlo_fernandez', 'password' => 'Carlo@1234', 'first_name' => 'Carlo', 'middle_name' => 'Bautista', 'last_name' => 'Fernandez', 'address' => '654 Luna St., Zamboanga City',    'email' => 'carlo.fernandez@ite193.edu'],
    ['username' => 'lea_tolentino',   'password' => 'Lea@1234',   'first_name' => 'Lea',   'middle_name' => 'Mangahas', 'last_name' => 'Tolentino', 'address' => '987 Del Pilar St., Baguio City',  'email' => 'lea.tolentino@ite193.edu'],
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ITE193 Hash Generator</title>
  <style>
    body { font-family: monospace; background: #1a1a2e; color: #e0e0e0; padding: 2rem; }
    h1   { color: #6c63ff; }
    pre  { background: #16213e; padding: 1.5rem; border-radius: 8px; overflow-x: auto; color: #00d4ff; font-size: .85rem; }
    .warn { background: #ff6b6b22; border: 1px solid #ff6b6b; padding: 1rem; border-radius: 8px; color: #ff6b6b; margin-bottom: 1rem; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 2rem; }
    th, td { border: 1px solid #333; padding: .5rem 1rem; text-align: left; }
    th { background: #6c63ff33; }
    .hash { color: #00e676; font-size: .75rem; word-break: break-all; }
  </style>
</head>
<body>
  <h1>🔑 ITE193 — Password Hash Generator</h1>
  <div class="warn">⚠️ <strong>Security Notice:</strong> Delete this file after use! It reveals plain-text passwords.</div>

  <h2>Sample User Credentials</h2>
  <table>
    <tr><th>Username</th><th>Plain Password</th><th>Bcrypt Hash (copy to SQL)</th></tr>
    <?php foreach ($users as $u): ?>
      <?php $hash = password_hash($u['password'], PASSWORD_BCRYPT); ?>
      <tr>
        <td><?= htmlspecialchars($u['username']) ?></td>
        <td><?= htmlspecialchars($u['password']) ?></td>
        <td class="hash"><?= htmlspecialchars($hash) ?></td>
      </tr>
    <?php endforeach; ?>
  </table>

  <h2>Generated SQL INSERT (copy this block into ite193_store.sql)</h2>
  <pre>INSERT INTO users (username, password, first_name, middle_name, last_name, address, email) VALUES
<?php
$lines = [];
foreach ($users as $u) {
    $hash = password_hash($u['password'], PASSWORD_BCRYPT);
    $lines[] = sprintf(
        "('%s', '%s', '%s', '%s', '%s', '%s', '%s')",
        $u['username'], $hash, $u['first_name'],
        $u['middle_name'], $u['last_name'], $u['address'], $u['email']
    );
}
echo implode(",\n", $lines) . ';';
?></pre>

  <p style="color:#ff6b6b;"><strong>Remember: Delete this file after copying the SQL above!</strong></p>
</body>
</html>
