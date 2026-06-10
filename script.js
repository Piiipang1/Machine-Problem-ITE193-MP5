/**
 * script.js — ITE193 Product Inventory Management System
 * Machine Problem #5 / #6 — MySQL Database Integration + Admin Inventory
 *
 * Features:
 *   • Login / Register / Change Password (PHP session auth)
 *   • Store browsing with search & category filter
 *   • Shopping cart (in-memory) with checkout (transactional)
 *   • Order history (from DB)
 *   • Admin: Add / Edit / Delete product, Add stock
 *   • Admin: Inventory table with stats dashboard
 *   • Profile with personal order stats
 */

'use strict';

/* ══════════════════════════════════════════════════════
   CONSTANTS & STATE
══════════════════════════════════════════════════════ */

const API = (() => {
  if (window.location.protocol === 'file:') return 'api/';
  const basePath = window.location.pathname.replace(/\/[^/]*$/, '/');
  return `${window.location.origin}${basePath}api/`;
})();

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

let products   = [];   // loaded from DB via get_products.php
let inventory  = [];   // admin full inventory list
let cart       = [];   // lives in JS memory (cleared on logout/refresh)
let SESSION    = null; // current logged-in user object

/* ══════════════════════════════════════════════════════
   FETCH HELPER
══════════════════════════════════════════════════════ */

async function fetchAPI(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    mode: 'cors',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body && method === 'POST') options.body = JSON.stringify(body);

  try {
    console.debug('fetchAPI:', method, API + endpoint, body);
    const res  = await fetch(API + endpoint, options);
    const text = await res.text();

    if (!res.ok) {
      console.error('fetchAPI error:', res.status, text);
      return { success: false, message: `Server returned ${res.status}.`, details: text };
    }
    try {
      return JSON.parse(text);
    } catch (err) {
      console.error('fetchAPI invalid JSON:', text, err);
      return { success: false, message: 'Invalid JSON response from server.', details: text };
    }
  } catch (err) {
    console.error('fetchAPI network error:', err);
    return { success: false, message: 'Network error. Is XAMPP running?' };
  }
}

/* ══════════════════════════════════════════════════════
   APP BOOTSTRAP
══════════════════════════════════════════════════════ */

async function init() {
  spawnParticles();

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
    // Rebuild category filter dynamically from loaded products
    rebuildCategoryFilter();
  } else {
    products = [];
    console.error('Could not load products:', data.message);
  }
}

function rebuildCategoryFilter() {
  const cats = [...new Set(products.map(p => p.category || 'General'))].sort();
  const selectors = ['categoryFilter', 'invCategoryFilter'];
  selectors.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="">All Categories</option>' +
      cats.map(c => `<option value="${c}"${c === currentVal ? ' selected' : ''}>${c}</option>`).join('');
  });
}

/* ══════════════════════════════════════════════════════
   AUTHENTICATION — LOGIN
══════════════════════════════════════════════════════ */

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const msgEl    = document.getElementById('loginMsg');

  if (!username || !password) {
    setMsg(msgEl, 'Please enter your username and password.', 'error');
    return;
  }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true;

  const data = await fetchAPI('login.php', 'POST', { username, password });
  btn.disabled = false;

  if (data.success) {
    SESSION = data.user;
    await loadProducts();
    cart = [];
    updateNavbar();
    clearMsg(msgEl);
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    const roleLabel = SESSION.role === 'admin' ? ' (Admin) 👑' : '';
    showToast(`Welcome back, ${SESSION.first_name}${roleLabel}! 👋`);
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
  SESSION  = null;
  products = [];
  inventory = [];
  cart     = [];
  updateNavbar();
  updateCartBadge();
  showToast('You have been logged out. See you! 👋');
  showSection('login');
}

/* ══════════════════════════════════════════════════════
   USER REGISTRATION
══════════════════════════════════════════════════════ */

async function register() {
  const first_name  = document.getElementById('regFirst').value.trim();
  const middle_name = document.getElementById('regMiddle').value.trim();
  const last_name   = document.getElementById('regLast').value.trim();
  const address     = document.getElementById('regAddress').value.trim();
  const email       = document.getElementById('regEmail').value.trim();
  const username    = document.getElementById('regUsername').value.trim();
  const password    = document.getElementById('regPassword').value;
  const confirm     = document.getElementById('regConfirm').value;
  const msgEl       = document.getElementById('registerMsg');

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
  const bar   = document.getElementById('strengthBar');
  const label = document.getElementById('strengthLabel');
  if (bar)   { bar.className = 'strength-bar'; bar.style.width = '0'; }
  if (label) { label.textContent = ''; }
}

/* ══════════════════════════════════════════════════════
   CHANGE PASSWORD
══════════════════════════════════════════════════════ */

function renderChangePasswordGate() {
  const banner     = document.getElementById('loginRequiredBanner');
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
  const msgEl           = document.getElementById('cpMsg');
  if (!SESSION) { setMsg(msgEl, '✖ You must be logged in to change your password.', 'error'); return; }

  const current_password  = document.getElementById('cpCurrent').value;
  const new_password      = document.getElementById('cpNew').value;
  const confirm_password  = document.getElementById('cpConfirm').value;

  if (!current_password || !new_password || !confirm_password) {
    setMsg(msgEl, '✖ All password fields are required.', 'error'); return;
  }
  if (new_password === current_password) {
    setMsg(msgEl, '✖ New password must be different from the current one.', 'error'); return;
  }
  if (!PASSWORD_REGEX.test(new_password)) {
    setMsg(msgEl, '✖ Password must be 8+ characters with uppercase, lowercase, and a special character.', 'error'); return;
  }
  if (new_password !== confirm_password) {
    setMsg(msgEl, '✖ New password and confirmation do not match.', 'error');
    document.getElementById('cpConfirm').value = '';
    return;
  }

  const btn = document.getElementById('cpBtn');
  btn.disabled = true;
  const data = await fetchAPI('change_password.php', 'POST', { current_password, new_password, confirm_password });
  btn.disabled = false;

  if (data.success) {
    setMsg(msgEl, '✔ Password updated successfully! Redirecting...', 'success');
    showToast('Password changed! 🔐');
    ['cpCurrent', 'cpNew', 'cpConfirm'].forEach(id => { document.getElementById(id).value = ''; });
    const bar   = document.getElementById('cpStrengthBar');
    const label = document.getElementById('cpStrengthLabel');
    if (bar)   bar.className = 'strength-bar';
    if (label) label.textContent = '';
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
  if (hero) hero.style.display = (SESSION || name === 'register') ? 'none' : '';

  const navLogin    = document.getElementById('navLogin');
  const navRegister = document.getElementById('navRegister');
  if (navLogin)    navLogin.classList.toggle('active', name === 'login');
  if (navRegister) navRegister.classList.toggle('active', name === 'register');

  if (name === 'changepass') renderChangePasswordGate();
  if (name === 'dashboard'  && SESSION) renderDashboard(SESSION);
}

/* ══════════════════════════════════════════════════════
   NAVBAR
══════════════════════════════════════════════════════ */

function updateNavbar() {
  const navActions  = document.getElementById('navActions');
  const navUser     = document.getElementById('navUser');
  const navWelcome  = document.getElementById('navWelcomeText');
  const navRoleBadge = document.getElementById('navRoleBadge');

  if (SESSION) {
    navActions.style.display = 'none';
    navUser.style.display    = 'flex';
    if (navWelcome)   navWelcome.textContent = `Hello, ${SESSION.first_name}!`;
    if (navRoleBadge) {
      if (SESSION.role === 'admin') {
        navRoleBadge.classList.remove('hidden');
      } else {
        navRoleBadge.classList.add('hidden');
      }
    }
  } else {
    navActions.style.display = 'flex';
    navUser.style.display    = 'none';
  }
}

/* ══════════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════════ */

function renderDashboard(user) {
  const avatar = document.getElementById('welcomeAvatar');
  if (avatar) {
    avatar.textContent = user.first_name.charAt(0).toUpperCase() + user.last_name.charAt(0).toUpperCase();
  }

  setText('welcomeName',    `${user.first_name} ${user.last_name}`);
  setText('welcomeUsername', `@${user.username}`);
  setText('profileEmail',    user.email);
  setText('profileAddress',  user.address);
  setText('infoFullName',
    `${user.first_name} ${user.middle_name ? user.middle_name + ' ' : ''}${user.last_name}`);
  setText('infoEmail',    user.email);
  setText('infoAddress',  user.address);
  setText('infoUsername', user.username);

  // Role display
  const infoRole = document.getElementById('infoRole');
  if (infoRole) {
    if (user.role === 'admin') {
      infoRole.innerHTML = '<span class="role-chip admin">👑 Administrator</span>';
    } else {
      infoRole.innerHTML = '<span class="role-chip student">🎓 Student</span>';
    }
  }

  // Show / hide admin-only elements
  const invTab         = document.getElementById('tabBtnInventory');
  const adminStatCard  = document.getElementById('statCardInventory');
  if (user.role === 'admin') {
    if (invTab)        invTab.classList.remove('hidden');
    if (adminStatCard) adminStatCard.classList.remove('hidden');
  } else {
    if (invTab)        invTab.classList.add('hidden');
    if (adminStatCard) adminStatCard.classList.add('hidden');
  }

  showDashTab('profile');
  renderInventory();
  renderCart();
  updateCartBadge();
  loadUserStats();
}

function showDashTab(tab) {
  const tabs = ['profile', 'store', 'cart', 'orders', 'inventory'];
  tabs.forEach(t => {
    const content = document.getElementById(`tab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn     = document.getElementById(`tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (content) content.classList.toggle('hidden', t !== tab);
    if (btn)     btn.classList.toggle('active', t === tab);
  });

  if (tab === 'store')     renderInventory();
  if (tab === 'cart')      renderCart();
  if (tab === 'orders')    loadOrderHistory();
  if (tab === 'inventory') loadInventoryTable();
}

/* ══════════════════════════════════════════════════════
   USER STATS (Profile tab)
══════════════════════════════════════════════════════ */

async function loadUserStats() {
  const data = await fetchAPI('get_stats.php');
  if (!data.success) return;

  const s = data.stats;

  const elOrders = document.getElementById('statOrders');
  const elSpent  = document.getElementById('statSpent');
  const elItems  = document.getElementById('statItems');
  const elInvVal = document.getElementById('statInventoryValue');

  if (elOrders) elOrders.textContent = s.total_orders ?? 0;
  if (elSpent)  elSpent.textContent  = `₱${(s.total_spent ?? 0).toFixed(2)}`;
  if (elItems)  elItems.textContent  = s.total_items ?? 0;

  if (SESSION && SESSION.role === 'admin' && s.inventory && elInvVal) {
    elInvVal.textContent = `₱${s.inventory.inventory_value.toFixed(2)}`;
  }
}

/* ══════════════════════════════════════════════════════
   STORE INVENTORY — renders product grid
══════════════════════════════════════════════════════ */

function renderInventory() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const query    = (document.getElementById('storeSearch')?.value || '').toLowerCase();
  const category = document.getElementById('categoryFilter')?.value || '';

  const filtered = products.filter(p => {
    const matchQ = !query || p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query);
    const matchC = !category || p.category === category;
    return matchQ && matchC;
  });

  const noResultMsg = document.getElementById('noResultsMsg');

  if (filtered.length === 0) {
    if (noResultMsg) noResultMsg.classList.remove('hidden');
    return;
  }
  if (noResultMsg) noResultMsg.classList.add('hidden');

  filtered.forEach(p => {
    const isOutOfStock = p.quantity <= 0;
    const isLowStock   = p.quantity > 0 && p.quantity <= 5;

    let stockClass = '';
    let stockText  = `${p.quantity} in stock`;
    if (isOutOfStock) { stockClass = 'danger';  stockText = 'Out of Stock'; }
    else if (isLowStock) { stockClass = 'warning'; stockText = `Only ${p.quantity} left!`; }

    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="product-img-wrapper">${p.image || '📦'}</div>
      <div class="product-code">${p.code}</div>
      <h3 class="product-name">${p.name}</h3>
      ${p.category ? `<span class="category-chip">${p.category}</span>` : ''}
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

function filterProducts() {
  renderInventory();
}

/* ══════════════════════════════════════════════════════
   SHOPPING CART (in-memory)
══════════════════════════════════════════════════════ */

function addToCart(code) {
  const product  = products.find(p => p.code === code);
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
  const tbody    = document.getElementById('cartTableBody');
  const emptyMsg = document.getElementById('emptyCartMsg');
  const summary  = document.getElementById('cartSummary');
  const clearBtn = document.getElementById('clearCartBtn');
  const totalVal = document.getElementById('cartTotalValue');
  if (!tbody || !emptyMsg || !summary) return;

  tbody.innerHTML = '';

  if (cart.length === 0) {
    tbody.parentElement.style.display = 'none';
    emptyMsg.style.display  = 'block';
    summary.style.display   = 'none';
    if (clearBtn) clearBtn.style.display = 'none';
    return;
  }

  tbody.parentElement.style.display = 'table';
  emptyMsg.style.display   = 'none';
  summary.style.display    = 'flex';
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
  const p    = products.find(prod => prod.code === code);
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
   CHECKOUT — MySQL Transaction
══════════════════════════════════════════════════════ */

async function checkout() {
  if (cart.length === 0) return;

  const items = cart.map(item => {
    const p = products.find(prod => prod.code === item.code);
    return { code: p.code, name: p.name, image: p.image, unit_price: p.unitPrice, qty: item.qty };
  });
  const total = items.reduce((sum, i) => sum + i.unit_price * i.qty, 0);

  const btn = document.getElementById('checkoutBtn');
  btn.disabled = true;

  const data = await fetchAPI('add_order.php', 'POST', { items, total });
  btn.disabled = false;

  if (data.success) {
    cart.forEach(item => {
      const p = products.find(prod => prod.code === item.code);
      if (p) p.quantity -= item.qty;
    });
    cart = [];
    renderCart();
    renderInventory();
    updateCartBadge();
    loadUserStats();
    showDashTab('orders');
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
   ADMIN — INVENTORY TABLE
══════════════════════════════════════════════════════ */

async function loadInventoryTable() {
  const tbody   = document.getElementById('inventoryTableBody');
  const emptyEl = document.getElementById('invEmptyMsg');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:2rem;opacity:.5;">Loading inventory...</td></tr>`;

  const data = await fetchAPI('get_inventory.php');
  if (!data.success) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--accent-3);padding:2rem;">${data.message || 'Could not load inventory.'}</td></tr>`;
    return;
  }

  inventory = data.products;
  renderInventoryStats(data.summary);
  renderInventoryTable();
}

function renderInventoryStats(summary) {
  if (!summary) return;

  const pills = {
    invStatTotal: summary.total_products,
    invStatStock: summary.total_stock,
    invStatLow:   summary.low_stock,
    invStatOOS:   summary.out_of_stock,
    invStatValue: `₱${summary.inventory_value.toFixed(2)}`,
  };

  Object.entries(pills).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.querySelector('.inv-stat-num').textContent = val;
  });
}

function renderInventoryTable() {
  const tbody   = document.getElementById('inventoryTableBody');
  const emptyEl = document.getElementById('invEmptyMsg');
  if (!tbody) return;

  const query    = (document.getElementById('invSearch')?.value || '').toLowerCase();
  const category = document.getElementById('invCategoryFilter')?.value || '';

  const filtered = inventory.filter(p => {
    const matchQ = !query ||
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query) ||
      (p.description || '').toLowerCase().includes(query);
    const matchC = !category || p.category === category;
    return matchQ && matchC;
  });

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    tbody.innerHTML = '';
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');

  filtered.forEach(p => {
    const isOOS  = p.quantity <= 0;
    const isLow  = p.quantity > 0 && p.quantity <= 5;
    let stockCls = '';
    if (isOOS)  stockCls = 'stock-oos';
    else if (isLow) stockCls = 'stock-low';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="product-code">${p.code}</span></td>
      <td>
        <div class="inv-product-cell">
          <span class="inv-emoji">${p.image || '📦'}</span>
          <div>
            <div class="inv-name">${p.name}</div>
            ${p.description ? `<div class="inv-desc">${p.description}</div>` : ''}
          </div>
        </div>
      </td>
      <td><span class="category-chip small">${p.category || 'General'}</span></td>
      <td class="inv-price">₱${p.unitPrice.toFixed(2)}</td>
      <td class="${stockCls} inv-stock-cell">
        <strong>${p.quantity}</strong>
        ${isOOS  ? '<span class="stock-badge danger">Out of Stock</span>'   : ''}
        ${isLow && !isOOS ? '<span class="stock-badge warning">Low</span>' : ''}
      </td>
      <td class="inv-sold">${p.times_sold ?? 0}</td>
      <td>
        <div class="inv-actions">
          <button class="btn-inv-action edit"  onclick="openEditProductModal(${p.id})"  title="Edit">✏️ Edit</button>
          <button class="btn-inv-action stock" onclick="openAddStockModal(${p.id})"    title="Add Stock">📥 Stock</button>
          <button class="btn-inv-action del"   onclick="openDeleteModal(${p.id})"      title="Delete">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterInventoryTable() {
  renderInventoryTable();
}

/* ══════════════════════════════════════════════════════
   ADMIN — ADD PRODUCT MODAL
══════════════════════════════════════════════════════ */

function openAddProductModal() {
  // Reset form
  ['addCode', 'addName', 'addDesc', 'addPrice', 'addQty'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const imgEl = document.getElementById('addImage');
  if (imgEl) imgEl.value = '📦';
  const catEl = document.getElementById('addCategory');
  if (catEl) catEl.value = 'General';
  clearMsg(document.getElementById('addProductMsg'));
  openModal('modalAddProduct');
}

async function submitAddProduct() {
  const msgEl = document.getElementById('addProductMsg');
  const code  = document.getElementById('addCode').value.trim().toUpperCase();
  const name  = document.getElementById('addName').value.trim();
  const cat   = document.getElementById('addCategory').value;
  const price = parseFloat(document.getElementById('addPrice').value);
  const qty   = parseInt(document.getElementById('addQty').value, 10);
  const image = document.getElementById('addImage').value.trim() || '📦';
  const desc  = document.getElementById('addDesc').value.trim();

  if (!code || !name || !cat) {
    setMsg(msgEl, '✖ Code, Name, and Category are required.', 'error'); return;
  }
  if (isNaN(price) || price <= 0) {
    setMsg(msgEl, '✖ Price must be greater than zero.', 'error'); return;
  }
  if (isNaN(qty) || qty < 0) {
    setMsg(msgEl, '✖ Stock quantity cannot be negative.', 'error'); return;
  }

  const btn = document.getElementById('addProductSubmitBtn');
  btn.disabled = true;
  const data = await fetchAPI('add_product.php', 'POST', {
    code, name, category: cat, description: desc, unit_price: price, quantity: qty, image
  });
  btn.disabled = false;

  if (data.success) {
    setMsg(msgEl, data.message || '✔ Product added!', 'success');
    showToast(data.message || '✔ Product added successfully!');
    await loadProducts();
    await loadInventoryTable();
    setTimeout(() => closeModal('modalAddProduct'), 1200);
  } else {
    setMsg(msgEl, data.message || '✖ Could not add product.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   ADMIN — EDIT PRODUCT MODAL
══════════════════════════════════════════════════════ */

function openEditProductModal(productId) {
  const p = inventory.find(x => x.id === productId);
  if (!p) { showToast('Product not found.'); return; }

  document.getElementById('editId').value       = p.id;
  document.getElementById('editCode').value     = p.code;
  document.getElementById('editName').value     = p.name;
  document.getElementById('editImage').value    = p.image || '📦';
  document.getElementById('editPrice').value    = p.unitPrice;
  document.getElementById('editDesc').value     = p.description || '';

  const catEl = document.getElementById('editCategory');
  if (catEl) catEl.value = p.category || 'General';

  clearMsg(document.getElementById('editProductMsg'));
  openModal('modalEditProduct');
}

async function submitEditProduct() {
  const msgEl = document.getElementById('editProductMsg');
  const id    = parseInt(document.getElementById('editId').value, 10);
  const name  = document.getElementById('editName').value.trim();
  const cat   = document.getElementById('editCategory').value;
  const price = parseFloat(document.getElementById('editPrice').value);
  const image = document.getElementById('editImage').value.trim() || '📦';
  const desc  = document.getElementById('editDesc').value.trim();

  if (!name || !cat) { setMsg(msgEl, '✖ Name and Category are required.', 'error'); return; }
  if (isNaN(price) || price <= 0) { setMsg(msgEl, '✖ Price must be greater than zero.', 'error'); return; }

  const btn = document.getElementById('editProductSubmitBtn');
  btn.disabled = true;
  const data = await fetchAPI('edit_product.php', 'POST', {
    id, name, category: cat, description: desc, unit_price: price, image
  });
  btn.disabled = false;

  if (data.success) {
    setMsg(msgEl, data.message || '✔ Product updated!', 'success');
    showToast(data.message || '✔ Product updated successfully!');
    await loadProducts();
    await loadInventoryTable();
    setTimeout(() => closeModal('modalEditProduct'), 1200);
  } else {
    setMsg(msgEl, data.message || '✖ Could not update product.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   ADMIN — ADD STOCK MODAL
══════════════════════════════════════════════════════ */

function openAddStockModal(productId) {
  const p = inventory.find(x => x.id === productId);
  if (!p) { showToast('Product not found.'); return; }

  document.getElementById('stockProductId').value = p.id;

  const nameEl    = document.getElementById('stockProductName');
  const currentEl = document.getElementById('stockCurrentDisplay');
  const qtyEl     = document.getElementById('stockQtyAdd');

  if (nameEl)    nameEl.textContent    = `${p.image} ${p.name}`;
  if (currentEl) currentEl.textContent = `Current Stock: ${p.quantity} units`;
  if (qtyEl)     qtyEl.value           = '';

  clearMsg(document.getElementById('addStockMsg'));
  openModal('modalAddStock');
}

async function submitAddStock() {
  const msgEl = document.getElementById('addStockMsg');
  const id    = parseInt(document.getElementById('stockProductId').value, 10);
  const qty   = parseInt(document.getElementById('stockQtyAdd').value, 10);

  if (!id)              { setMsg(msgEl, '✖ Product ID missing.', 'error'); return; }
  if (isNaN(qty) || qty < 1) { setMsg(msgEl, '✖ Quantity must be at least 1.', 'error'); return; }

  const btn = document.getElementById('addStockSubmitBtn');
  btn.disabled = true;
  const data = await fetchAPI('add_stock.php', 'POST', { id, quantity: qty });
  btn.disabled = false;

  if (data.success) {
    setMsg(msgEl, data.message || `✔ Stock added!`, 'success');
    showToast(data.message || '✔ Stock updated successfully!');
    await loadProducts();
    await loadInventoryTable();
    setTimeout(() => closeModal('modalAddStock'), 1200);
  } else {
    setMsg(msgEl, data.message || '✖ Could not add stock.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   ADMIN — DELETE PRODUCT MODAL
══════════════════════════════════════════════════════ */

function openDeleteModal(productId) {
  const p = inventory.find(x => x.id === productId);
  if (!p) { showToast('Product not found.'); return; }

  document.getElementById('deleteProductId').value = p.id;
  const nameEl = document.getElementById('deleteProductName');
  if (nameEl) nameEl.textContent = `"${p.name}"`;

  clearMsg(document.getElementById('deleteProductMsg'));
  openModal('modalConfirmDelete');
}

async function deleteProduct() {
  const msgEl = document.getElementById('deleteProductMsg');
  const id    = parseInt(document.getElementById('deleteProductId').value, 10);
  if (!id) { setMsg(msgEl, '✖ Product ID missing.', 'error'); return; }

  const btn = document.getElementById('deleteSubmitBtn');
  btn.disabled = true;
  const data = await fetchAPI('delete_product.php', 'POST', { id });
  btn.disabled = false;

  if (data.success) {
    setMsg(msgEl, data.message || '✔ Product deleted!', 'success');
    showToast(data.message || '✔ Product deleted!');
    await loadProducts();
    await loadInventoryTable();
    setTimeout(() => closeModal('modalConfirmDelete'), 1000);
  } else {
    setMsg(msgEl, data.message || '✖ Could not delete product.', 'error');
  }
}

/* ══════════════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════════════ */

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  // Animate in
  requestAnimationFrame(() => el.classList.add('active'));
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('active');
  setTimeout(() => {
    el.classList.add('hidden');
    document.body.style.overflow = '';
  }, 250);
}

function closeModalOnOverlay(event, id) {
  if (event.target === event.currentTarget) closeModal(id);
}

// Close modals on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    ['modalAddProduct', 'modalEditProduct', 'modalAddStock', 'modalConfirmDelete'].forEach(closeModal);
  }
});

/* ══════════════════════════════════════════════════════
   PASSWORD STRENGTH CHECKER
══════════════════════════════════════════════════════ */

function checkStrength(value, barId = 'strengthBar', labelId = 'strengthLabel') {
  const bar   = document.getElementById(barId);
  const label = document.getElementById(labelId);
  if (!bar || !label) return;

  let score = 0;
  if (value.length >= 8)     score++;
  if (/[A-Z]/.test(value))   score++;
  if (/[a-z]/.test(value))   score++;
  if (/[\W_]/.test(value))   score++;
  if (value.length >= 12)    score++;

  bar.className = 'strength-bar';
  if (!value) { label.textContent = ''; return; }

  if (score <= 2) {
    bar.classList.add('weak');   label.textContent = '⚠ Weak';   label.style.color = 'var(--accent-3)';
  } else if (score <= 3) {
    bar.classList.add('medium'); label.textContent = '~ Fair';   label.style.color = 'var(--accent-yellow)';
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
  el.className   = `msg-box ${type}`;
}

function clearMsg(el) {
  if (!el) return;
  el.textContent = '';
  el.className   = 'msg-box';
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
  _toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

/* ══════════════════════════════════════════════════════
   PARTICLE ANIMATION
══════════════════════════════════════════════════════ */

function spawnParticles() {
  const container = document.getElementById('particles');
  if (!container) return;
  const colors = ['#6c63ff', '#00d4ff', '#ff6b6b', '#00e676', '#ffca28'];
  for (let i = 0; i < 22; i++) {
    const p     = document.createElement('div');
    p.className = 'particle';
    const size  = Math.random() * 6 + 3;
    const left  = Math.random() * 100;
    const delay = Math.random() * 18;
    const dur   = Math.random() * 14 + 12;
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
  const regSection   = document.getElementById('registerSection');
  const cpSection    = document.getElementById('changepassSection');
  if (loginSection && !loginSection.classList.contains('hidden')) login();
  else if (regSection && !regSection.classList.contains('hidden'))  register();
  else if (cpSection  && !cpSection.classList.contains('hidden'))   changePassword();
});