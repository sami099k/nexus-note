(function initNexusAuth(global) {
  const TOKEN_KEY = 'token';
  const USER_KEY = 'user';

  function getApiBase() {
    // Prefer same-origin proxy in dev/prod, fallback for static-file usage.
    if (typeof window !== 'undefined' && window.location && window.location.origin) {
      const protocol = window.location.protocol;
      if (protocol === 'http:' || protocol === 'https:') {
        return '/api';
      }
    }

    return 'http://localhost:5000/api';
  }

  function safeParseUser(raw) {
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (err) {
      return null;
    }
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  function getUser() {
    return safeParseUser(localStorage.getItem(USER_KEY));
  }

  function saveSession(token, user) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }

    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  }

  function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  function authHeaders(extraHeaders) {
    const headers = Object.assign({}, extraHeaders || {});
    const token = getToken();

    if (token) {
      headers.Authorization = 'Bearer ' + token;
    }

    return headers;
  }

  async function apiFetch(path, options) {
    const opts = Object.assign({}, options || {});
    opts.headers = authHeaders(opts.headers || {});

    const response = await fetch(getApiBase() + path, opts);

    if (response.status === 401) {
      clearSession();
    }

    return response;
  }

  async function parseJsonSafe(response) {
    try {
      return await response.json();
    } catch (err) {
      return null;
    }
  }

  async function validateSession() {
    const token = getToken();

    if (!token) {
      return { ok: false, reason: 'missing-token' };
    }

    const response = await apiFetch('/auth/me', { method: 'GET' });

    if (!response.ok) {
      return { ok: false, reason: 'invalid-session' };
    }

    const user = await parseJsonSafe(response);

    if (!user || !user._id) {
      return { ok: false, reason: 'invalid-user-payload' };
    }

    saveSession(token, {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      assignedSubjectIds: user.assignedSubjectIds || [],
      avatarUrl: user.avatarUrl || ''
    });

    return { ok: true, user: getUser() };
  }

  async function requireAuth(redirectPath) {
    const target = redirectPath || 'login.html';
    const result = await validateSession();

    if (!result.ok) {
      window.location.href = target;
      return null;
    }

    return result.user;
  }

  async function redirectIfAuthenticated(path) {
    const token = getToken();
    if (!token) {
      return false;
    }

    const result = await validateSession();
    if (!result.ok) {
      clearSession();
      return false;
    }

    window.location.href = path || 'home.html';
    return true;
  }

  function confirmLogout(message) {
    return window.confirm(message || 'Are you sure you want to log out?');
  }

  function ensureLogoutModal() {
    let modal = document.getElementById('logout-modal');

    if (!modal) {
      const styleId = 'nexus-auth-logout-modal-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-soft, #161b22);
  color: var(--text, #e6edf3);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid var(--line, rgba(255, 255, 255, 0.12));
  width: min(400px, calc(100% - 32px));
  text-align: center;
}

.modal-title {
  font-size: 1.1rem;
  margin: 0 0 10px;
}

.modal-body {
  color: var(--muted, rgba(255, 255, 255, 0.72));
  margin: 0 0 20px;
  line-height: 1.45;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-content .btn {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid var(--line, rgba(255, 255, 255, 0.12));
  background: var(--bg-soft, #161b22);
  color: var(--text, #e6edf3);
  font-size: 0.95rem;
  cursor: pointer;
}

.modal-content .btn:hover {
  border-color: var(--accent, #2f81f7);
}

.modal-content .btn.btn-danger {
  background: var(--danger, #f85149);
  border-color: var(--danger, #f85149);
  color: #fff;
}
        `;
        document.head.appendChild(style);
      }

      modal = document.createElement('div');
      modal.id = 'logout-modal';
      modal.className = 'modal-backdrop';
      modal.innerHTML = `
  <div class="modal-content">
    <h2 class="modal-title">Confirm Logout</h2>
    <p class="modal-body">Are you sure you want to log out?</p>
    <div class="modal-actions">
      <button id="cancel-logout" class="btn" type="button">Cancel</button>
      <button id="confirm-logout" class="btn btn-danger" type="button">Logout</button>
    </div>
  </div>
      `;
      document.body.appendChild(modal);
    }

    const confirmBtn = document.getElementById('confirm-logout');
    const cancelBtn = document.getElementById('cancel-logout');

    return { modal, confirmBtn, cancelBtn };
  }

  function logout() {
    const { modal, confirmBtn, cancelBtn } = ensureLogoutModal();

    if (!modal || !confirmBtn || !cancelBtn) {
      return;
    }

    modal.style.display = 'flex';

    const performLogout = () => {
      clearSession();
      window.location.href = 'index.html';
    };

    const closeModal = () => {
      modal.style.display = 'none';
      confirmBtn.removeEventListener('click', performLogout);
      cancelBtn.removeEventListener('click', closeModal);
      modal.removeEventListener('click', closeOnBackdrop);
    };

    const closeOnBackdrop = (event) => {
      if (event.target === modal) {
        closeModal();
      }
    };

    confirmBtn.addEventListener('click', performLogout);
    cancelBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', closeOnBackdrop);
  }

  function sanitizeUrl(rawUrl, options) {
    const opts = Object.assign({ allowDataImage: false }, options || {});
    const value = String(rawUrl || '').trim();

    if (!value) {
      return '';
    }

    if (opts.allowDataImage && /^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(value)) {
      return value;
    }

    try {
      const parsed = new URL(value, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
      return '';
    } catch (err) {
      return '';
    }
  }

  function ensureToastRoot() {
    const styleId = 'nexus-toast-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
.nexus-toast-root {
  position: fixed;
  right: 16px;
  bottom: 16px;
  display: grid;
  gap: 8px;
  z-index: 2000;
  max-width: min(360px, calc(100vw - 24px));
}

.nexus-toast {
  border-radius: 10px;
  border: 1px solid #2f3a48;
  background: #111820;
  color: #e6edf3;
  padding: 10px 12px;
  font-size: 0.86rem;
  line-height: 1.35;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.nexus-toast-info {
  border-color: #2f3a48;
}

.nexus-toast-success {
  border-color: #2f9e6f;
  background: #112a22;
  color: #dff9ee;
}

.nexus-toast-warning {
  border-color: #8a6a2a;
  background: #2d2514;
  color: #f5ddb0;
}

.nexus-toast-error {
  border-color: #84414b;
  background: #2a1f23;
  color: #ffccd1;
}
      `;
      document.head.appendChild(style);
    }

    let root = document.getElementById('nexus-toast-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'nexus-toast-root';
      root.className = 'nexus-toast-root';
      document.body.appendChild(root);
    }

    return root;
  }

  function showToast(message, type, durationMs) {
    const root = ensureToastRoot();
    const safeType = ['info', 'success', 'warning', 'error'].includes(type) ? type : 'info';
    const lifetime = Number.isFinite(Number(durationMs)) ? Number(durationMs) : 3200;

    const node = document.createElement('div');
    node.className = 'nexus-toast nexus-toast-' + safeType;
    node.textContent = String(message || 'Done');
    root.appendChild(node);

    setTimeout(() => {
      if (node && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    }, Math.max(lifetime, 1200));
  }

  global.NexusAuth = {
    getApiBase,
    getToken,
    getUser,
    saveSession,
    clearSession,
    authHeaders,
    apiFetch,
    parseJsonSafe,
    validateSession,
    requireAuth,
    redirectIfAuthenticated,
    sanitizeUrl,
    showToast,
    logout,
    confirmLogout
  };
})(window);
