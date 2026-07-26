// ui/loginScreen.js
// Renders a simple email/password form into the page. Calls onSuccess once
// the user is signed in, which is where app.js hands off to the real app.

import { signIn, signUp } from '../auth.js';

function renderLoginScreen(root, onSuccess) {
  root.innerHTML = `
    <div style="max-width:360px;margin:80px auto;">
      <h1 style="font-family:var(--font-display);font-size:22px;margin-bottom:4px;">Finance Dashboard</h1>
      <p style="color:var(--color-ink-soft);font-size:14px;margin-top:0;margin-bottom:24px;">Sign in to your account.</p>

      <div class="form-row">
        <label for="login-email">Email</label>
        <input id="login-email" type="email" autocomplete="email" />
      </div>
      <div class="form-row">
        <label for="login-password">Password</label>
        <input id="login-password" type="password" autocomplete="current-password" />
      </div>
      <p id="login-error" style="color:var(--color-watch);font-size:13px;min-height:18px;"></p>

      <div class="form-actions" style="justify-content:space-between;">
        <button class="text-only" id="signup-btn">Create account</button>
        <button class="primary" id="signin-btn">Sign in</button>
      </div>
    </div>
  `;

  const emailInput = root.querySelector('#login-email');
  const passwordInput = root.querySelector('#login-password');
  const errorEl = root.querySelector('#login-error');

  async function handle(action) {
    errorEl.textContent = '';
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      errorEl.textContent = 'Enter both email and password.';
      return;
    }
    try {
      if (action === 'signup') {
        await signUp(email, password);
        errorEl.style.color = 'var(--color-good)';
        errorEl.textContent = 'Account created. You are now signed in.';
      } else {
        await signIn(email, password);
      }
      onSuccess();
    } catch (err) {
      errorEl.style.color = 'var(--color-watch)';
      errorEl.textContent = err.message;
    }
  }

  root.querySelector('#signin-btn').addEventListener('click', () => handle('signin'));
  root.querySelector('#signup-btn').addEventListener('click', () => handle('signup'));
}

export { renderLoginScreen };
