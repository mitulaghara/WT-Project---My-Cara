const bar = document.getElementById('bar');
let close = document.getElementById('close');
const nav = document.getElementById('navbar');

// bar is static; close can be recreated when we rewrite navbar innerHTML, so bind it via a helper
if (bar) {
  bar.addEventListener('click', () => {
    if (nav) nav.classList.add('active');
  });
}

function bindCloseListener() {
  try {
    close = document.getElementById('close');
    if (close) {
      close.addEventListener('click', () => {
        if (nav) nav.classList.remove('active');
      });
    }
  } catch (e) { /* ignore */ }
}

/* ---------------- Common validators & utilities ---------------- */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showInlineError(el, message) {
  if (!el) return;
  el.textContent = message;
}

function clearInlineError(el) {
  if (!el) return;
  el.textContent = '';
}

function showToast(message) {
  // showToast(message, type) where type = 'success' | 'error' | 'info' (optional)
  const type = arguments.length > 1 ? arguments[1] : 'info';
  const existing = document.querySelector('.mc-toast');
  if (existing) existing.remove();
  const box = document.createElement('div');
  box.className = 'mc-toast';
  let bg = '#222';
  if (type === 'success') bg = '#018749';
  else if (type === 'error') bg = '#d9534f';
  else if (type === 'info') bg = '#2b6cb0';
  box.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:12px 16px;background:' + bg + ';color:#fff;border-radius:6px;z-index:9999;opacity:0.98;box-shadow:0 6px 18px rgba(0,0,0,0.12);max-width:320px;';
  box.textContent = message;
  document.body.appendChild(box);
  // success messages stay a bit longer
  const ttl = type === 'success' ? 4500 : 3500;
  setTimeout(() => { try { box.remove(); } catch (e) {} }, ttl);
}

/* ---------------- Debug UI ---------------- */
function showDebugBox(obj) {
  try {
    let box = document.getElementById('mc-debug-box');
    if (!box) {
      box = document.createElement('pre');
      box.id = 'mc-debug-box';
      box.style.cssText = 'position:fixed;left:16px;bottom:16px;max-width:45%;max-height:40%;overflow:auto;background:#111;color:#fff;padding:12px;border-radius:8px;z-index:99999;font-size:12px;opacity:0.95;';
      document.body.appendChild(box);
    }
    box.textContent = JSON.stringify(obj, null, 2);
    // auto-hide after 20s
    setTimeout(() => { if (box) box.remove(); }, 20000);
  } catch (e) { console.error('showDebugBox error', e); }
}

function removeDebugBox() {
  try { const box = document.getElementById('mc-debug-box'); if (box) box.remove(); } catch (e) {}
}

/* ---------------- Small session helpers ---------------- */
function setLocalUser(user) {
  try { localStorage.setItem('mc_user', JSON.stringify(user)); } catch (e) { /* ignore */ }
}

function clearLocalUser() {
  try { localStorage.removeItem('mc_user'); } catch (e) { /* ignore */ }
}

function getLocalUser() {
  try { const v = localStorage.getItem('mc_user'); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

function signOut() {
  // Clear local session
  // Immediately clear local session and update UI
  try { clearLocalUser(); } catch (e) {}
  try { localStorage.setItem('mc_signed_out', Date.now().toString()); } catch (e) {}
  // If firebase available, request sign out (don't wait) and ignore errors
  try { if (window.firebase && firebase.auth) firebase.auth().signOut().catch(() => {}); } catch (e) {}
  // Update UI immediately
  updateNavForUser(null);
  removeDebugBox();
  showToast('Signed out', 'info');
  // Redirect immediately to login page
  window.location.href = 'login.html';
}

function updateNavForUser(user) {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  // ensure we captured the original navbar once
  setOriginalNavHtmlIfNeeded();

  // If there's no user -> switch navbar to minimal (Home / Login / Register)
  if (!user) {
    try {
      navbar.innerHTML = minimalNavbarHtml();
      bindCloseListener();
    } catch (e) { /* ignore */ }
    return;
  }

  // Restore the original navbar HTML (so we have full nav items) and re-bind close
  if (originalNavHTML) {
    navbar.innerHTML = originalNavHTML;
    bindCloseListener();
  }

  // remove any existing login/register anchors (they'll be replaced by user info)
  const loginAnchor = navbar.querySelector('a[href="login.html"]');
  const registerAnchor = navbar.querySelector('a[href="register.html"]');
  if (loginAnchor && loginAnchor.parentElement) loginAnchor.parentElement.remove();
  if (registerAnchor && registerAnchor.parentElement) registerAnchor.parentElement.remove();

  // remove any previous mc-user li (all)
  const prevs = navbar.querySelectorAll('li.mc-user');
  prevs.forEach(p => p.remove());

  // create user name li and sign out li
  const liUser = document.createElement('li');
  liUser.className = 'mc-user';
  const span = document.createElement('a');
  span.href = '#';
  span.textContent = user.name;
  liUser.appendChild(span);

  const liOut = document.createElement('li');
  liOut.className = 'mc-user';
  const outA = document.createElement('a');
  outA.href = '#';
  outA.textContent = 'Sign Out';
  outA.addEventListener('click', function (e) { e.preventDefault(); signOut(); });
  liOut.appendChild(outA);

  // append near the end but before the close button if present
  const closeBtn = navbar.querySelector('#close');
  if (closeBtn) {
    navbar.insertBefore(liUser, closeBtn);
    navbar.insertBefore(liOut, closeBtn);
  } else {
    navbar.appendChild(liUser);
    navbar.appendChild(liOut);
  }
}

// Keep nav in-sync on load using firebase (if available) or localStorage fallback
function initAuthStateWatcher() {
  if (window.firebase && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      // if the user recently initiated a sign-out, prefer signed-out state to avoid races
      const signoutFlag = (function(){ try { return localStorage.getItem('mc_signed_out'); } catch(e){ return null } })();
      if (signoutFlag) {
        try { localStorage.removeItem('mc_signed_out'); } catch(e){}
        if (user) {
          // force sign out again to be safe, then update UI
          try { firebase.auth().signOut().catch(()=>{}); } catch(e){}
        }
        clearLocalUser();
        updateNavForUser(null);
        return;
      }
      if (user) {
        const name = user.displayName || user.email || 'User';
        const info = { name: name, email: user.email };
        setLocalUser(info);
        // restore full navbar and then update to show user
        if (nav && typeof originalNavHTML !== 'undefined' && originalNavHTML) {
          nav.innerHTML = originalNavHTML;
          bindCloseListener();
        }
        updateNavForUser(info);
        showToast('Welcome, ' + name + '!');
      } else {
        // if firebase signed out, clear local user
        clearLocalUser();
        // switch to minimal navbar showing only login/register
        updateNavForUser(null);
      }
    });
  } else {
    // no firebase: try localStorage
    const u = getLocalUser();
    // if a recent sign-out flag exists, treat as signed out
    const signoutFlag = (function(){ try { return localStorage.getItem('mc_signed_out'); } catch(e){ return null } })();
    if (signoutFlag) {
      try { localStorage.removeItem('mc_signed_out'); } catch(e){}
      clearLocalUser();
      updateNavForUser(null);
      return;
    }
    if (u) {
      if (nav && typeof originalNavHTML !== 'undefined' && originalNavHTML) {
        nav.innerHTML = originalNavHTML;
        bindCloseListener();
      }
      updateNavForUser(u);
    } else {
      // ensure minimal navbar when no stored user
      updateNavForUser(null);
    }
  }
}

// Keep a copy of the original navbar HTML so we can restore it when a user signs in
let originalNavHTML = '';

function setOriginalNavHtmlIfNeeded() {
  try {
    if (nav && !originalNavHTML) originalNavHTML = nav.innerHTML;
  } catch (e) {}
}

// Minimal navbar HTML to show when user is signed out (only Home, Login, Register + close)
function minimalNavbarHtml() {
  return '\n    <li><a class="active" href="index.html">Home</a></li>\n    <li><a href="login.html">Login</a></li>\n    <li><a href="register.html">Register</a></li>\n    <a href="#" id="close"><i class="bx bx-x"></i></a>\n  ';
}

/* ---------------- Product page: Add to cart validation ---------------- */
document.addEventListener('click', function (e) {
  if (e.target && (e.target.matches('.single-pro-details .normal') || e.target.matches('.single-pro-details button.normal'))) {
    const container = document.querySelector('.single-pro-details');
    if (!container) return;
    const sizeSelect = container.querySelector('select');
    const qtyInput = container.querySelector('input[type="number"]');
    const size = sizeSelect ? sizeSelect.value : null;
    const qty = qtyInput ? parseInt(qtyInput.value, 10) : 1;
    if (!size || size === 'Select Size') {
      showToast('Please select a size before adding to cart');
      return;
    }
    if (!Number.isInteger(qty) || qty < 1) {
      showToast('Please enter a valid quantity (1 or more)');
      if (qtyInput) qtyInput.value = 1;
      return;
    }
    window.location.href = 'cart.html';
  }
});

/* ---------------- Cart page validations ---------------- */
function initCartPage() {
  const cartSection = document.getElementById('cart');
  if (!cartSection) return;

  const qtyInputs = cartSection.querySelectorAll('input[type="number"]');
  qtyInputs.forEach(input => {
    input.setAttribute('min', '1');
    input.addEventListener('change', () => {
      let v = parseInt(input.value, 10);
      if (!Number.isInteger(v) || v < 1) {
        showToast('Quantity must be at least 1');
        input.value = 1;
        v = 1;
      }
      const row = input.closest('tr');
      if (row) {
        const priceText = row.children[3].textContent.replace(/[^0-9.]/g, '') || '0';
        const price = parseFloat(priceText) || 0;
        const subCell = row.children[5];
        if (subCell) subCell.textContent = '₹' + (price * v).toFixed(0);
      }
      recalcCartTotal();
    });
  });

  cartSection.querySelectorAll('i.bx-x-circle').forEach(icon => {
    icon.style.cursor = 'pointer';
    icon.addEventListener('click', () => {
      if (confirm('Remove this item from cart?')) {
        const row = icon.closest('tr');
        if (row) row.remove();
        recalcCartTotal();
      }
    });
  });

  const couponDiv = document.getElementById('coupon');
  if (couponDiv) {
    const input = couponDiv.querySelector('input');
    const btn = couponDiv.querySelector('button');
    btn.addEventListener('click', () => {
      const code = (input.value || '').trim().toUpperCase();
      if (!code) { showToast('Please enter a coupon code'); return; }
      if (!/^[A-Z0-9]{3,10}$/.test(code)) { showToast('Invalid coupon format'); return; }
      if (code === 'SAVE10') {
        applyDiscount(0.10);
        showToast('Coupon applied: 10% off');
      } else if (code === 'FLAT50') {
        applyFlatDiscount(50);
        showToast('Coupon applied: ₹50 off');
      } else {
        showToast('Coupon not recognized');
      }
    });
  }

  const proceedBtn = document.querySelector('#subtotal button');
  if (proceedBtn) {
    proceedBtn.addEventListener('click', () => {
      const totalCell = document.querySelector('#subtotal table tr:last-child td strong') || document.querySelector('#subtotal table tr:last-child td');
      const totalText = totalCell ? totalCell.textContent.replace(/[^0-9.]/g, '') : '0';
      const total = parseFloat(totalText) || 0;
      if (total <= 0) {
        showToast('Your cart is empty');
        return;
      }
      window.location.href = 'checkout.html';
    });
  }
}

function recalcCartTotal() {
  const subtotalTable = document.querySelector('#subtotal table');
  if (!subtotalTable) return;
  const rows = document.querySelectorAll('#cart tbody tr');
  let sum = 0;
  rows.forEach(row => {
    const subText = row.children[5].textContent.replace(/[^0-9.]/g, '') || '0';
    sum += parseFloat(subText) || 0;
  });
  const totalRow = subtotalTable.querySelector('tr:last-child td:last-child');
  const subtotalRow = subtotalTable.querySelector('tr:first-child td:last-child');
  if (subtotalRow) subtotalRow.textContent = '₹' + sum.toFixed(0);
  if (totalRow) totalRow.textContent = '₹' + sum.toFixed(0);
}

function applyDiscount(rate) {
  const subtotalTable = document.querySelector('#subtotal table');
  if (!subtotalTable) return;
  const subtotalRow = subtotalTable.querySelector('tr:first-child td:last-child');
  let subtotal = parseFloat((subtotalRow ? subtotalRow.textContent.replace(/[^0-9.]/g, '') : '0')) || 0;
  const discounted = subtotal * (1 - rate);
  subtotalRow.textContent = '₹' + discounted.toFixed(0);
  const totalRow = subtotalTable.querySelector('tr:last-child td:last-child');
  if (totalRow) totalRow.textContent = '₹' + discounted.toFixed(0);
}

function applyFlatDiscount(amount) {
  const subtotalTable = document.querySelector('#subtotal table');
  if (!subtotalTable) return;
  const subtotalRow = subtotalTable.querySelector('tr:first-child td:last-child');
  let subtotal = parseFloat((subtotalRow ? subtotalRow.textContent.replace(/[^0-9.]/g, '') : '0')) || 0;
  const discounted = Math.max(0, subtotal - amount);
  subtotalRow.textContent = '₹' + discounted.toFixed(0);
  const totalRow = subtotalTable.querySelector('tr:last-child td:last-child');
  if (totalRow) totalRow.textContent = '₹' + discounted.toFixed(0);
}

/* ---------------- Contact form validation ---------------- */
function initContactForm() {
  const form = document.querySelector('#form-details form');
  if (!form) return;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const nameInput = form.querySelector('input[placeholder="Your Name"]');
    const emailInput = form.querySelector('input[placeholder="E-mail"]');
    const msgInput = form.querySelector('textarea[placeholder="Your Message"]');
    const errors = [];
    if (!nameInput || nameInput.value.trim().length < 2) errors.push('Please enter your name (2+ characters)');
    if (!emailInput || !isValidEmail(emailInput.value.trim())) errors.push('Please enter a valid email');
    if (!msgInput || msgInput.value.trim().length < 10) errors.push('Please enter a longer message (10+ characters)');
    if (errors.length) { errors.forEach(err => showToast(err)); return; }
    showToast('Message sent — thank you!');
    form.reset();
  });
}

/* ---------------- Newsletter signup validation ---------------- */
function initNewsletter() {
  document.querySelectorAll('#newsletter .form').forEach(container => {
    const input = container.querySelector('input');
    const btn = container.querySelector('button');
    if (!input || !btn) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const email = (input.value || '').trim();
      if (!isValidEmail(email)) { showToast('Please enter a valid email for newsletter'); return; }
      showToast('Thanks — you are subscribed!');
      input.value = '';
    });
  });
}

/* ---------------- Auth forms: register & login enhancements ---------------- */
function initAuthForms() {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const email = document.getElementById('loginEmail');
      const password = document.getElementById('loginPassword');
      const emailErr = document.getElementById('loginEmailError');
      const passErr = document.getElementById('loginPasswordError');
      clearInlineError(emailErr); clearInlineError(passErr);
      let ok = true;
      if (!email || !isValidEmail(email.value)) { showInlineError(emailErr, 'Enter a valid email'); ok = false; }
      if (!password || password.value.length < 6) { showInlineError(passErr, 'Password must be 6+ chars'); ok = false; }
      if (!ok) return;

      // If Firebase Auth is available, use it
      if (window.firebase && firebase.auth) {
        firebase.auth().signInWithEmailAndPassword(email.value, password.value)
          .then((userCredential) => {
            const u = userCredential && userCredential.user ? userCredential.user : firebase.auth().currentUser;
            const name = (u && (u.displayName || u.email)) ? (u.displayName || u.email) : 'User';
            const info = { name: name, email: u && u.email ? u.email : email.value };
            setLocalUser(info);
            updateNavForUser(info);
            removeDebugBox();
            showToast('Login successful', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 700);
          })
          .catch(err => {
            // Better error mapping for common Firebase auth errors
            console.error('Login error:', err);
            // show raw error on page for easier debugging
            showDebugBox(err);
            const code = err && err.code ? err.code : '';
            const message = err && err.message ? err.message : 'Login failed';
            if (code === 'auth/user-not-found') showInlineError(emailErr, 'No account found with this email');
            else if (code === 'auth/wrong-password') showInlineError(passErr, 'Incorrect password');
            else if (code === 'auth/invalid-email') showInlineError(emailErr, 'Invalid email address');
            else if (code === 'auth/user-disabled') showInlineError(passErr, 'This account has been disabled');
            else if (message && message.toUpperCase().includes('INVALID_LOGIN_CREDENTIALS')) showInlineError(passErr, 'Invalid login credentials');
            else showInlineError(passErr, message);
          });
      } else {
        // Fallback demo behavior
        const info = { name: email.value, email: email.value };
        setLocalUser(info);
        updateNavForUser(info);
        removeDebugBox();
        showToast('Login successful (demo)', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 700);
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const name = document.getElementById('regName');
      const email = document.getElementById('regEmail');
      const password = document.getElementById('regPassword');
      const confirm = document.getElementById('regConfirm');
      const nameErr = document.getElementById('regNameError');
      const emailErr = document.getElementById('regEmailError');
      const passErr = document.getElementById('regPasswordError');
      const confErr = document.getElementById('regConfirmError');
      clearInlineError(nameErr); clearInlineError(emailErr); clearInlineError(passErr); clearInlineError(confErr);
      let ok = true;
      if (!name || name.value.trim().length < 2) { showInlineError(nameErr, 'Enter your full name'); ok = false; }
      if (!email || !isValidEmail(email.value)) { showInlineError(emailErr, 'Enter a valid email'); ok = false; }
      const pwd = password ? password.value : '';
      if (!pwd || pwd.length < 8 || !/\d/.test(pwd)) { showInlineError(passErr, 'Password must be 8+ chars and include a number'); ok = false; }
      if (pwd !== (confirm ? confirm.value : '')) { showInlineError(confErr, 'Passwords do not match'); ok = false; }
      if (!ok) return;

      if (window.firebase && firebase.auth) {
        firebase.auth().createUserWithEmailAndPassword(email.value, pwd)
          .then(userCredential => {
            // Optionally set display name
            if (userCredential.user && name && name.value) {
              userCredential.user.updateProfile({ displayName: name.value }).catch(() => {});
            }
            const u = userCredential.user;
            const info = { name: (u && (u.displayName || name.value)) ? (u.displayName || name.value) : (name.value || email.value), email: u && u.email ? u.email : email.value };
            setLocalUser(info);
            updateNavForUser(info);
            removeDebugBox();
            showToast('Registration successful', 'success');
            setTimeout(() => { window.location.href = 'index.html'; }, 700);
          })
          .catch(err => {
            console.error('Registration error:', err);
            // show raw error on page for easier debugging
            showDebugBox(err);
            const code = err && err.code ? err.code : '';
            const message = err && err.message ? err.message : 'Registration failed';
            if (code === 'auth/email-already-in-use') showInlineError(emailErr, 'This email is already registered');
            else if (code === 'auth/invalid-email') showInlineError(emailErr, 'Invalid email address');
            else if (code === 'auth/weak-password') showInlineError(passErr, 'Password is too weak');
            else showInlineError(passErr, message);
          });
      } else {
        // Fallback demo behavior
        const info = { name: (name && name.value) ? name.value : email.value, email: email.value };
        setLocalUser(info);
        updateNavForUser(info);
        removeDebugBox();
        showToast('Registration successful (demo)', 'success');
        setTimeout(() => { window.location.href = 'index.html'; }, 700);
      }
    });
  }
}

/* ---------------- Init on DOM ready ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  initCartPage();
  initContactForm();
  initNewsletter();
  initAuthForms();
  // capture original navbar HTML and bind close button
  setOriginalNavHtmlIfNeeded();
  bindCloseListener();
  // initialize auth watcher which will set navbar state
  initAuthStateWatcher();
});
