/**
 * script.js — ITE193 Student Account System
 * Machine Problem #5 — MySQL Database Integration
 *
 * All localStorage/sessionStorage replaced with Fetch API → PHP backend.
 * UI rendering logic is preserved from MP4.
 */

'use strict';

/* ══════════════════════════════════════════════════════
   CONSTANTS & STATE
══════════════════════════════════════════════════════ */

// Base path to all PHP API files. Uses the current page location so requests resolve correctly
// when the app is served from XAMPP under a project folder.
const API = (() => {
  if (window.location.protocol === 'file:') {
    return 'api/';
  }

  const basePath = window.location.pathname.replace(/\/[^/]*$/, '/');
  return `${window.location.origin}${basePath}api/`;
})();

// Password validation regex (same rule as MP4)
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

// In-memory state (replaces localStorage)
let products = [];   // loaded from DB via get_products.php
let cart = [];   // lives in JS memory only (cleared on logout/refresh)
let SESSION = null; // current logged-in user object (from PHP session)

/* ══════════════════════════════════════════════════════
   FETCH HELPER
══════════════════════════════════════════════════════ */

/**
 * fetchAPI(endpoint, method, body)
 * Reusable wrapper around the Fetch API.
 * Sends requests to our PHP backend and returns parsed JSON.
 *
 * @param {string} endpoint  - e.g. 'login.php'
 * @param {string} method    - 'GET' or 'POST'
 * @param {object} body      - data to send (for POST requests)
 * @returns {Promise<object>} - parsed JSON response
 */
async function fetchAPI(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    mode: 'cors',
    credentials: 'same-origin', // sends the PHP session cookie automatically
    headers: { 'Content-Type': 'application/json' },
  };

  if (body && method === 'POST') {
    options.body = JSON.stringify(body);
  }

  try {
    console.debug('fetchAPI request:', method, API + endpoint, body);
    const res = await fetch(API + endpoint, options);
    const text = await res.text();

    if (!res.ok) {
      console.error('fetchAPI server error:', res.status, text);
      return {
        success: false,
        message: `Server returned ${res.status}.`,
        details: text
      };
    }

    try {
      const data = JSON.parse(text);
      return data;
    } catch (err) {
      console.error('fetchAPI invalid JSON response:', text, err);
      return {
        success: false,
        message: 'Invalid JSON response from server.',
        details: text
      };
    }
  } catch (err) {
    console.error('fetchAPI network error:', err);
    return { success: false, message: 'Network error. Is XAMPP running?' };
  }
}

/* ══════════════════════════════════════════════════════
   APP BOOTSTRAP
══════════════════════════════════════════════════════ */

/**
 * init()
 * Entry point — runs on DOMContentLoaded.
 * Checks for an existing PHP session, then loads products.
 */
async function init() {
  spawnParticles();

  // Check if user is already logged in (PHP session cookie)
  const data = await fetchAPI('get_user.php');

  if (data.success && data.user) {
    SESSION = data.user;
    await loadProducts();
    updateNavbar();
    showSection('dashboard');
    updateCartBadge();
  } else {
    SESSION = null;
    updateNavbar();
    showSection('login');
  }
}

document.addEventListener('DOMContentLoaded', init);

/* ══════════════════════════════════════════════════════
   PRODUCTS — load from MySQL
══════════════════════════════════════════════════════ */

async function loadProducts() {
  const data = await fetchAPI('get_products.php');
  if (data.success) {
    products = data.products;
  } else {
    products = [];
    console.error('Could not load products:', data.message);
  }
}

/* ══════════════════════════════════════════════════════
   AUTHENTICATION — LOGIN
══════════════════════════════════════════════════════ */

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msgEl = document.getElementById('loginMsg');

  if (!username || !password) {
    setMsg(msgEl, 'Please enter your username and password.', 'error');
    return;
  }

  // Disable button while waiting
  const btn = document.getElementById('loginBtn');
  btn.disabled = true;

  const data = await fetchAPI('login.php', 'POST', { username, password });

  btn.disabled = false;

  if (data.success) {
    SESSION = data.user;
    await loadProducts();
    cart = []; // fresh cart on each new login
    updateNavbar();
    clearMsg(msgEl);
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    showToast(`Welcome back, ${SESSION.first_name}! 👋`);
    showSection('dashboard');
  } else {
    setMsg(msgEl, data.message || '✖ Login failed.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   AUTHENTICATION — LOGOUT
══════════════════════════════════════════════════════ */

async function logout() {
  await fetchAPI('logout.php', 'POST');
  SESSION = null;
  products = [];
  cart = [];
  updateNavbar();
  updateCartBadge();
  showToast('You have been logged out. See you! 👋');
  showSection('login');
}

/* ══════════════════════════════════════════════════════
   USER REGISTRATION
══════════════════════════════════════════════════════ */

async function register() {
  const first_name = document.getElementById('regFirst').value.trim();
  const middle_name = document.getElementById('regMiddle').value.trim();
  const last_name = document.getElementById('regLast').value.trim();
  const address = document.getElementById('regAddress').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirm').value;
  const msgEl = document.getElementById('registerMsg');

  // Client-side validation (mirrors server-side for speed)
  if (!first_name || !last_name || !address || !email || !username || !password || !confirm) {
    setMsg(msgEl, '✖ All fields marked with * are required.', 'error');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setMsg(msgEl, '✖ Please enter a valid email address.', 'error');
    return;
  }

  if (!PASSWORD_REGEX.test(password)) {
    setMsg(msgEl, '✖ Password must be 8+ characters with uppercase, lowercase, and a special character.', 'error');
    return;
  }

  if (password !== confirm) {
    setMsg(msgEl, '✖ Passwords do not match.', 'error');
    return;
  }

  const btn = document.getElementById('registerBtn');
  btn.disabled = true;

  const data = await fetchAPI('register.php', 'POST', {
    first_name, middle_name, last_name, address, email, username, password
  });

  btn.disabled = false;

  if (data.success) {
    setMsg(msgEl, '✔ Account created! You can now log in.', 'success');
    showToast('Account created successfully! 🎉');
    clearRegisterForm();
    setTimeout(() => { clearMsg(msgEl); showSection('login'); }, 1800);
  } else {
    setMsg(msgEl, data.message || '✖ Registration failed.', 'error');
  }
}

function clearRegisterForm() {
  ['regFirst', 'regMiddle', 'regLast', 'regAddress', 'regEmail', 'regUsername', 'regPassword', 'regConfirm']
    .forEach(id => { document.getElementById(id).value = ''; });
  const bar = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (bar) { bar.className = 'strength-bar'; bar.style.width = '0'; }
  if (label) { label.textContent = ''; }
}

/* ══════════════════════════════════════════════════════
   CHANGE PASSWORD
══════════════════════════════════════════════════════ */

function renderChangePasswordGate() {
  const banner = document.getElementById('loginRequiredBanner');
  const formWrapper = document.getElementById('changePassForm');
  if (SESSION) {
    banner.classList.add('hidden');
    formWrapper.style.display = '';
  } else {
    banner.classList.remove('hidden');
    formWrapper.style.display = 'none';
  }
}

async function changePassword() {
  const msgEl = document.getElementById('cpMsg');
  if (!SESSION) {
    setMsg(msgEl, '✖ You must be logged in to change your password.', 'error');
    return;
  }

  const current_password = document.getElementById('cpCurrent').value;
  const new_password = document.getElementById('cpNew').value;
  const confirm_password = document.getElementById('cpConfirm').value;

  if (!current_password || !new_password || !confirm_password) {
    setMsg(msgEl, '✖ All password fields are required.', 'error');
    return;
  }

  if (new_password === current_password) {
    setMsg(msgEl, '✖ New password must be different from the current one.', 'error');
    return;
  }

  if (!PASSWORD_REGEX.test(new_password)) {
    setMsg(msgEl, '✖ Password must be 8+ characters with uppercase, lowercase, and a special character.', 'error');
    return;
  }

  if (new_password !== confirm_password) {
    setMsg(msgEl, '✖ New password and confirmation do not match.', 'error');
    document.getElementById('cpConfirm').value = '';
    return;
  }

  const btn = document.getElementById('cpBtn');
  btn.disabled = true;

  const data = await fetchAPI('change_password.php', 'POST', {
    current_password, new_password, confirm_password
  });

  btn.disabled = false;

  if (data.success) {
    setMsg(msgEl, '✔ Password updated successfully! Redirecting...', 'success');
    showToast('Password changed! 🔐');
    ['cpCurrent', 'cpNew', 'cpConfirm'].forEach(id => { document.getElementById(id).value = ''; });
    const bar = document.getElementById('cpStrengthBar');
    const label = document.getElementById('cpStrengthLabel');
    if (bar) { bar.className = 'strength-bar'; }
    if (label) { label.textContent = ''; }
    setTimeout(() => { clearMsg(msgEl); showSection('dashboard'); }, 1500);
  } else {
    setMsg(msgEl, data.message || '✖ Could not update password.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   SECTION / PAGE NAVIGATION
══════════════════════════════════════════════════════ */

function showSection(name) {
  const sections = ['login', 'register', 'dashboard', 'changepass'];
  sections.forEach(s => {
    const el = document.getElementById(`${s}Section`);
    if (el) el.classList.toggle('hidden', s !== name);
  });

  const hero = document.getElementById('heroSection');
  if (hero) {
    hero.style.display = (SESSION || name === 'register') ? 'none' : '';
  }

  const navLogin = document.getElementById('navLogin');
  const navRegister = document.getElementById('navRegister');
  if (navLogin) navLogin.classList.toggle('active', name === 'login');
  if (navRegister) navRegister.classList.toggle('active', name === 'register');

  if (name === 'changepass') renderChangePasswordGate();
  if (name === 'dashboard' && SESSION) renderDashboard(SESSION);
  if (name === 'orders') loadOrderHistory();
}

/* ══════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════ */

function updateNavbar() {
  const navActions = document.getElementById('navActions');
  const navUser = document.getElementById('navUser');
  const navWelcome = document.getElementById('navWelcomeText');

  if (SESSION) {
    navActions.style.display = 'none';
    navUser.style.display = 'flex';
    if (navWelcome) navWelcome.textContent = `Hello, ${SESSION.first_name}!`;
  } else {
    navActions.style.display = 'flex';
    navUser.style.display = 'none';
  }
}

/* ══════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════ */

function renderDashboard(user) {
  const avatar = document.getElementById('welcomeAvatar');
  if (avatar) {
    avatar.textContent = user.first_name.charAt(0).toUpperCase() +
      user.last_name.charAt(0).toUpperCase();
  }

  setText('welcomeName', `${user.first_name} ${user.last_name}`);
  setText('welcomeUsername', `@${user.username}`);
  setText('profileEmail', user.email);
  setText('profileAddress', user.address);
  setText('infoFullName',
    `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`);
  setText('infoEmail', user.email);
  setText('infoAddress', user.address);
  setText('infoUsername', user.username);

  showDashTab('profile');
  renderInventory();
  renderCart();
  updateCartBadge();
}

function showDashTab(tab) {
  const tabs = ['profile', 'store', 'cart', 'orders'];
  tabs.forEach(t => {
    const content = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (content) content.classList.toggle('hidden', t !== tab);
    if (btn) btn.classList.toggle('active', t === tab);
  });

  if (tab === 'store') renderInventory();
  if (tab === 'cart') renderCart();
  if (tab === 'orders') loadOrderHistory();
}

/* ══════════════════════════════════════════════════════
   STORE INVENTORY
══════════════════════════════════════════════════════ */

function renderInventory() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  products.forEach(p => {
    const isOutOfStock = p.quantity <= 0;
    const isLowStock = p.quantity > 0 && p.quantity <= 5;

    let stockClass = '';
    let stockText = `${p.quantity} in stock`;
    if (isOutOfStock) { stockClass = 'danger'; stockText = 'Out of Stock'; }
    else if (isLowStock) { stockClass = 'warning'; stockText = `Only ${p.quantity} left!`; }

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img-wrapper">${p.image || '📦'}</div>
      <div class="product-code">${p.code}</div>
      <h3 class="product-name">${p.name}</h3>
      <div class="product-details">
        <span class="product-price">₱${p.unitPrice.toFixed(2)}</span>
        <span class="stock-badge ${stockClass}">${stockText}</span>
      </div>
      <button class="btn-add-cart" onclick="addToCart('${p.code}')" ${isOutOfStock ? 'disabled' : ''}>
        ➕ Add to Cart
      </button>
    `;
    grid.appendChild(card);
  });
}

/* ══════════════════════════════════════════════════════
   SHOPPING CART (in-memory)
══════════════════════════════════════════════════════ */

function addToCart(code) {
  const product = products.find(p => p.code === code);
  if (!product || product.quantity <= 0) return;

  const existing = cart.find(c => c.code === code);
  if (existing) {
    if (existing.qty < product.quantity) {
      existing.qty++;
    } else {
      showToast(`Cannot add more. Only ${product.quantity} in stock.`);
      return;
    }
  } else {
    cart.push({ code: product.code, qty: 1 });
  }

  updateCartBadge();
  showToast(`Added ${product.name} to cart! 🛒`);
}

function renderCart() {
  const tbody = document.getElementById('cartTableBody');
  const emptyMsg = document.getElementById('emptyCartMsg');
  const summary = document.getElementById('cartSummary');
  const clearBtn = document.getElementById('clearCartBtn');
  const totalVal = document.getElementById('cartTotalValue');
  if (!tbody || !emptyMsg || !summary) return;

  tbody.innerHTML = '';

  if (cart.length === 0) {
    tbody.parentElement.style.display = 'none';
    emptyMsg.style.display = 'block';
    summary.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  tbody.parentElement.style.display = 'table';
  emptyMsg.style.display = 'none';
  summary.style.display = 'flex';
  if (clearBtn) clearBtn.style.display = 'block';

  let grandTotal = 0;

  cart.forEach(item => {
    const p = products.find(prod => prod.code === item.code);
    if (!p) return;
    const subtotal = item.qty * p.unitPrice;
    grandTotal += subtotal;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <div class="cart-item-name">
          <span class="cart-item-icon">${p.image || '📦'}</span>
          <div>
            <div class="product-code">${p.code}</div>
            <div class="cart-item-title">${p.name}</div>
          </div>
        </div>
      </td>
      <td>₱${p.unitPrice.toFixed(2)}</td>
      <td>
        <div class="cart-qty-ctrl">
          <button class="btn-qty" onclick="updateCartQty('${p.code}', -1)">−</button>
          <span class="cart-qty-val">${item.qty}</span>
          <button class="btn-qty" onclick="updateCartQty('${p.code}', 1)">+</button>
        </div>
      </td>
      <td class="cart-subtotal">₱${subtotal.toFixed(2)}</td>
      <td><button class="btn-remove" onclick="removeFromCart('${p.code}')" title="Remove">🗑️</button></td>
    `;
    tbody.appendChild(tr);
  });

  totalVal.textContent = `₱${grandTotal.toFixed(2)}`;
}

function updateCartQty(code, change) {
  const item = cart.find(c => c.code === code);
  const p = products.find(prod => prod.code === code);
  if (!item || !p) return;

  const newQty = item.qty + change;
  if (newQty <= 0) { removeFromCart(code); return; }
  if (newQty > p.quantity) { showToast(`Maximum stock reached (${p.quantity}).`); return; }

  item.qty = newQty;
  renderCart();
  updateCartBadge();
}

function removeFromCart(code) {
  cart = cart.filter(c => c.code !== code);
  renderCart();
  updateCartBadge();
}

function clearCart() {
  cart = [];
  renderCart();
  updateCartBadge();
  showToast('Cart cleared.');
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-block' : 'none';
}

/* ══════════════════════════════════════════════════════
   CHECKOUT — MySQL Transaction via add_order.php
══════════════════════════════════════════════════════ */

async function checkout() {
  if (cart.length === 0) return;

  // Build the items payload (snapshot of product data at checkout time)
  const items = cart.map(item => {
    const p = products.find(prod => prod.code === item.code);
    return {
      code: p.code,
      name: p.name,
      image: p.image,
      unit_price: p.unitPrice,
      qty: item.qty,
    };
  });

  const total = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);

  const btn = document.getElementById('checkoutBtn');
  btn.disabled = true;

  const data = await fetchAPI('add_order.php', 'POST', { items, total });

  btn.disabled = false;

  if (data.success) {
    // Update local products array to reflect deducted quantities
    cart.forEach(item => {
      const p = products.find(prod => prod.code === item.code);
      if (p) p.quantity -= item.qty;
    });

    cart = [];
    renderCart();
    renderInventory();
    updateCartBadge();
    showDashTab('store');
    showToast(`Checkout successful! Order #${data.order_id} placed. ✅`);
  } else {
    showToast(data.message || '✖ Checkout failed.');
  }
}

/* ══════════════════════════════════════════════════════
   ORDER HISTORY
══════════════════════════════════════════════════════ */

async function loadOrderHistory() {
  const container = document.getElementById('ordersContainer');
  if (!container) return;

  container.innerHTML = '<p style="text-align:center;opacity:.6;">Loading orders...</p>';

  const data = await fetchAPI('get_orders.php');

  if (!data.success) {
    container.innerHTML = '<p style="text-align:center;opacity:.6;">Could not load orders.</p>';
    return;
  }

  if (data.orders.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-msg" style="display:block;">
        <div class="empty-icon">📋</div>
        <p>No orders yet. Go shopping!</p>
        <button class="btn-secondary mt-1" onclick="showDashTab('store')">Browse Store</button>
      </div>`;
    return;
  }

  container.innerHTML = data.orders.map(order => `
    <div class="order-card glass">
      <div class="order-card-header">
        <span class="order-id">Order #${order.id}</span>
        <span class="order-date">${new Date(order.ordered_at).toLocaleString()}</span>
        <span class="order-total">₱${order.total.toFixed(2)}</span>
      </div>
      <table class="cart-table" style="margin-top:.5rem;">
        <thead>
          <tr><th>Product</th><th>Price</th><th>Qty</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
          ${order.items.map(i => `
            <tr>
              <td><span class="cart-item-icon">${i.image}</span> ${i.name}</td>
              <td>₱${i.unitPrice.toFixed(2)}</td>
              <td>${i.qty}</td>
              <td>₱${i.subtotal.toFixed(2)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════════════════
   PASSWORD STRENGTH CHECKER
══════════════════════════════════════════════════════ */

function checkStrength(value, barId = 'strengthBar', labelId = 'strengthLabel') {
  const bar = document.getElementById(barId);
  const label = document.getElementById(labelId);
  if (!bar || !label) return;

  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[a-z]/.test(value)) score++;
  if (/[\W_]/.test(value)) score++;
  if (value.length >= 12) score++;

  bar.className = 'strength-bar';
  if (!value) { label.textContent = ''; return; }

  if (score <= 2) {
    bar.classList.add('weak'); label.textContent = '⚠ Weak'; label.style.color = 'var(--accent-3)';
  } else if (score <= 3) {
    bar.classList.add('medium'); label.textContent = '~ Fair'; label.style.color = 'var(--accent-yellow)';
  } else {
    bar.classList.add('strong'); label.textContent = '✔ Strong'; label.style.color = 'var(--accent-green)';
  }
}

/* ══════════════════════════════════════════════════════
   PASSWORD VISIBILITY TOGGLE
══════════════════════════════════════════════════════ */

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  btn.textContent = isHidden ? '🙈' : '👁';
}

/* ══════════════════════════════════════════════════════
   UI HELPERS
══════════════════════════════════════════════════════ */

function setMsg(el, text, type) {
  if (!el) return;
  el.textContent = text;
  el.className = `msg-box ${type}`;
}

function clearMsg(el) {
  if (!el) return;
  el.textContent = '';
  el.className = 'msg-box';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '—';
}

/* ══════════════════════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════════════════════ */

let _toastTimer = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════════════
   PARTICLE ANIMATION
══════════════════════════════════════════════════════ */

function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['#6c63ff', '#00d4ff', '#ff6b6b', '#00e676', '#ffca28'];
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3;
    const left = Math.random() * 100;
    const delay = Math.random() * 18;
    const dur = Math.random() * 14 + 12;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `width:${size}px;height:${size}px;left:${left}%;background:${color};animation-duration:${dur}s;animation-delay:-${delay}s;`;
    container.appendChild(p);
  }
}

/* ══════════════════════════════════════════════════════
   KEYBOARD SUPPORT — ENTER KEY
══════════════════════════════════════════════════════ */

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter') return;
  const loginSection = document.getElementById('loginSection');
  const regSection = document.getElementById('registerSection');
  const cpSection = document.getElementById('changepassSection');
  if (!loginSection.classList.contains('hidden')) login();
  else if (!regSection.classList.contains('hidden')) register();
  else if (!cpSection.classList.contains('hidden')) changePassword();
});