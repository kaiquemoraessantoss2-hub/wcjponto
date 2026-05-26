(function () {
  'use strict';

  function escHtml(t) {
    if (!t) return '';
    const d = document.createElement('div');
    d.textContent = t;
    return d.innerHTML;
  }

  function formatDate(d) {
    if (!d) return '';
    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (d === today) return 'Hoje';
      if (d === yesterday) return 'Ontem';
      return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
    } catch { return d; }
  }

  // ---- Inject HTML ----
  function injectHTML() {
    // Notification panel
    const notifPanel = document.createElement('div');
    notifPanel.id = 'notif-panel';
    notifPanel.style.cssText = 'position:fixed;top:64px;right:16px;z-index:150;width:320px;display:none;';
    notifPanel.className = 'bg-surface-container-lowest border-2 border-outline-variant shadow-lg';
    notifPanel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:2px solid #e4beba;background:#e8e8e8;">
        <span style="font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:14px;color:#1a1c1c;">Notificações</span>
        <button id="btn-close-notif" style="color:#546067;background:none;border:none;cursor:pointer;display:flex;align-items:center;">
          <span class="material-symbols-outlined" style="font-size:18px;">close</span>
        </button>
      </div>
      <div id="notif-list" style="max-height:320px;overflow-y:auto;">
        <div style="display:flex;justify-content:center;padding:32px 0;">
          <div style="width:24px;height:24px;border:3px solid #e4beba;border-top-color:#a20513;border-radius:50%;animation:spin 0.7s linear infinite;"></div>
        </div>
      </div>
      <div style="padding:10px 16px;border-top:1px solid #e4beba;text-align:center;">
        <a href="/registro-ponto.html" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#a20513;text-transform:uppercase;letter-spacing:.05em;text-decoration:none;">Ver registros de ponto →</a>
      </div>
    `;
    document.body.appendChild(notifPanel);

    // Settings modal
    const settingsModal = document.createElement('div');
    settingsModal.id = 'settings-modal';
    settingsModal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:150;align-items:center;justify-content:center;padding:16px;';
    settingsModal.innerHTML = `
      <div style="background:#fff;border:2px solid #e4beba;width:100%;max-width:440px;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:2px solid #e4beba;background:#2f3131;">
          <h3 style="font-family:'Hanken Grotesk',sans-serif;font-weight:700;color:#f1f1f1;font-size:15px;">Configurações de Perfil</h3>
          <button id="btn-close-settings" style="color:#f1f1f1;background:none;border:none;cursor:pointer;font-family:'Material Symbols Outlined';font-size:22px;line-height:1;">close</button>
        </div>
        <div style="padding:24px;display:flex;flex-direction:column;gap:20px;">

          <!-- Avatar / Photo -->
          <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
            <div id="settings-avatar-wrap" onclick="document.getElementById('wcj-photo-input').click()"
              style="position:relative;width:80px;height:80px;border-radius:50%;overflow:hidden;border:2px solid #e4beba;background:#d7e4ec;display:flex;align-items:center;justify-content:center;cursor:pointer;">
              <span id="settings-avatar-icon" class="material-symbols-outlined" style="font-size:36px;color:#546067;">person</span>
              <img id="settings-avatar-img" alt="Foto" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
              <div style="position:absolute;inset:0;background:rgba(0,0,0,.25);opacity:0;transition:opacity .15s;display:flex;align-items:center;justify-content:center;" id="settings-avatar-overlay">
                <span class="material-symbols-outlined" style="font-size:20px;color:#fff;">photo_camera</span>
              </div>
            </div>
            <input type="file" id="wcj-photo-input" accept="image/*" style="display:none;">
            <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#546067;text-transform:uppercase;letter-spacing:.05em;">Clique no avatar para alterar foto</span>
            <button id="btn-remove-photo" style="display:none;font-family:'JetBrains Mono',monospace;font-size:11px;color:#ba1a1a;text-transform:uppercase;background:none;border:none;cursor:pointer;letter-spacing:.05em;">Remover foto</button>
          </div>

          <!-- Name -->
          <div>
            <label style="font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#546067;display:block;margin-bottom:4px;">Nome</label>
            <input type="text" id="settings-nome" style="height:48px;border:2px solid #8f706c;background:#fff;padding:0 12px;width:100%;box-sizing:border-box;font-family:'Work Sans',sans-serif;font-size:14px;" placeholder="Seu nome">
          </div>

          <!-- Email readonly -->
          <div>
            <label style="font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#546067;display:block;margin-bottom:4px;">Email</label>
            <input type="text" id="settings-email" readonly style="height:48px;border:2px solid #e4beba;background:#eeeeee;padding:0 12px;width:100%;box-sizing:border-box;font-family:'Work Sans',sans-serif;font-size:14px;color:#546067;cursor:default;">
          </div>

          <!-- Password -->
          <div style="border-top:2px solid #e4beba;padding-top:16px;">
            <p style="font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#546067;margin-bottom:12px;">Alterar Senha <span style="color:#8f706c;text-transform:none;font-size:10px;">(deixe em branco para não alterar)</span></p>
            <div style="display:flex;flex-direction:column;gap:10px;">
              <input type="password" id="settings-senha-atual" style="height:48px;border:2px solid #8f706c;background:#fff;padding:0 12px;width:100%;box-sizing:border-box;font-family:'Work Sans',sans-serif;font-size:14px;" placeholder="Senha atual">
              <input type="password" id="settings-nova-senha" style="height:48px;border:2px solid #8f706c;background:#fff;padding:0 12px;width:100%;box-sizing:border-box;font-family:'Work Sans',sans-serif;font-size:14px;" placeholder="Nova senha (mín. 6 caracteres)">
              <input type="password" id="settings-confirmar-senha" style="height:48px;border:2px solid #8f706c;background:#fff;padding:0 12px;width:100%;box-sizing:border-box;font-family:'Work Sans',sans-serif;font-size:14px;" placeholder="Confirmar nova senha">
            </div>
          </div>

          <!-- Messages -->
          <div id="settings-erro" style="display:none;background:#ffdad6;color:#93000a;font-family:'JetBrains Mono',monospace;font-size:12px;padding:10px 12px;border:1px solid #ba1a1a;"></div>
          <div id="settings-ok" style="display:none;background:#dcfce7;color:#14532d;font-family:'JetBrains Mono',monospace;font-size:12px;padding:10px 12px;border:1px solid #16a34a;"></div>

          <!-- Buttons -->
          <div style="display:flex;gap:12px;padding-top:4px;">
            <button id="btn-settings-salvar" style="flex:1;height:48px;background:#a20513;color:#fff;font-family:'JetBrains Mono',monospace;font-size:12px;text-transform:uppercase;border:none;cursor:pointer;letter-spacing:.05em;transition:background .15s;"
              onmouseover="this.style.background='#c62828'" onmouseout="this.style.background='#a20513'">
              Salvar Alterações
            </button>
            <button id="btn-settings-logout" style="height:48px;padding:0 16px;border:2px solid #8f706c;color:#546067;background:none;font-family:'JetBrains Mono',monospace;font-size:12px;text-transform:uppercase;cursor:pointer;letter-spacing:.05em;display:flex;align-items:center;gap:6px;"
              onmouseover="this.style.background='#eeeeee'" onmouseout="this.style.background='transparent'">
              <span class="material-symbols-outlined" style="font-size:16px;">logout</span>Sair
            </button>
          </div>

        </div>
      </div>
    `;
    document.body.appendChild(settingsModal);

    // Spinner keyframe
    if (!document.getElementById('wcj-spin-style')) {
      const style = document.createElement('style');
      style.id = 'wcj-spin-style';
      style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(style);
    }
  }

  // ---- Photo ----
  function loadUserPhoto() {
    const photo = localStorage.getItem('wcj_user_photo');
    updateSidebarAvatar(photo);
    if (photo) updateSettingsAvatar(photo);
  }

  function updateSidebarAvatar(photo) {
    const icon = document.getElementById('sidebar-avatar-icon');
    const img = document.getElementById('sidebar-avatar-img');
    if (!img) return;
    if (photo) {
      img.src = photo;
      img.style.display = 'block';
      if (icon) icon.style.display = 'none';
    } else {
      img.style.display = 'none';
      if (icon) icon.style.display = '';
    }
  }

  function updateSettingsAvatar(photo) {
    const icon = document.getElementById('settings-avatar-icon');
    const img = document.getElementById('settings-avatar-img');
    const removeBtn = document.getElementById('btn-remove-photo');
    if (!img) return;
    if (photo) {
      img.src = photo;
      img.style.display = 'block';
      if (icon) icon.style.display = 'none';
      if (removeBtn) removeBtn.style.display = 'block';
    } else {
      img.style.display = 'none';
      if (icon) icon.style.display = '';
      if (removeBtn) removeBtn.style.display = 'none';
    }
  }

  function initPhotoInput() {
    const input = document.getElementById('wcj-photo-input');
    if (!input) return;
    input.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) {
        showSettingsError('Foto deve ter no máximo 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target.result;
        localStorage.setItem('wcj_user_photo', base64);
        updateSettingsAvatar(base64);
        updateSidebarAvatar(base64);
        showSettingsOk('Foto atualizada com sucesso!');
      };
      reader.readAsDataURL(file);
      input.value = '';
    });

    // Avatar hover overlay
    const wrap = document.getElementById('settings-avatar-wrap');
    const overlay = document.getElementById('settings-avatar-overlay');
    if (wrap && overlay) {
      wrap.addEventListener('mouseenter', () => { overlay.style.opacity = '1'; });
      wrap.addEventListener('mouseleave', () => { overlay.style.opacity = '0'; });
    }

    // Remove photo
    document.getElementById('btn-remove-photo')?.addEventListener('click', () => {
      localStorage.removeItem('wcj_user_photo');
      updateSettingsAvatar(null);
      updateSidebarAvatar(null);
      showSettingsOk('Foto removida.');
    });
  }

  // ---- Notification panel ----
  function toggleNotifPanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const isVisible = panel.style.display !== 'none';
    closeSettingsModal();
    if (isVisible) {
      panel.style.display = 'none';
    } else {
      panel.style.display = 'block';
      loadNotifications();
    }
  }

  async function loadNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    list.innerHTML = `<div style="display:flex;justify-content:center;padding:32px 0;">
      <div style="width:24px;height:24px;border:3px solid #e4beba;border-top-color:#a20513;border-radius:50%;animation:spin 0.7s linear infinite;"></div>
    </div>`;

    try {
      const res = await fetch('/api/auth/notifications');
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (!data.length) {
        list.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:32px 16px;gap:8px;">
          <span class="material-symbols-outlined" style="font-size:32px;color:#546067;font-variation-settings:'FILL' 0;">notifications_none</span>
          <p style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#546067;text-transform:uppercase;">Sem atividade recente</p>
        </div>`;
        return;
      }

      list.innerHTML = data.map(n => {
        const presente = !!n.presente;
        const cor = presente ? '#15803d' : '#ba1a1a';
        const icon = presente ? 'check_circle' : 'cancel';
        const label = presente ? 'Presente' : 'Ausente';
        return `
          <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid #e4beba;">
            <span class="material-symbols-outlined" style="font-size:18px;color:${cor};flex-shrink:0;margin-top:1px;font-variation-settings:'FILL' 1;">${icon}</span>
            <div style="min-width:0;flex:1;">
              <p style="font-size:13px;color:#1a1c1c;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(n.funcionarios?.nome || '?')}</p>
              <p style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#546067;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(n.obras?.nome || '?')}</p>
              <p style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${cor};margin-top:3px;">${label} · ${formatDate(n.data)}</p>
            </div>
          </div>
        `;
      }).join('');
    } catch {
      list.innerHTML = `<div style="padding:24px 16px;text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;color:#546067;">Erro ao carregar notificações</div>`;
    }
  }

  // ---- Settings modal ----
  function openSettingsModal() {
    const panel = document.getElementById('notif-panel');
    if (panel) panel.style.display = 'none';
    const modal = document.getElementById('settings-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    loadSettingsData();
    const photo = localStorage.getItem('wcj_user_photo');
    updateSettingsAvatar(photo || null);
    ['settings-senha-atual', 'settings-nova-senha', 'settings-confirmar-senha'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    hideSettingsMessages();
  }

  function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.style.display = 'none';
  }

  async function loadSettingsData() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const user = await res.json();
      const nomeEl = document.getElementById('settings-nome');
      const emailEl = document.getElementById('settings-email');
      if (nomeEl) nomeEl.value = user.nome || '';
      if (emailEl) emailEl.value = user.email || '';
    } catch {}
  }

  function hideSettingsMessages() {
    const e = document.getElementById('settings-erro');
    const o = document.getElementById('settings-ok');
    if (e) e.style.display = 'none';
    if (o) o.style.display = 'none';
  }

  function showSettingsError(msg) {
    const e = document.getElementById('settings-erro');
    const o = document.getElementById('settings-ok');
    if (e) { e.textContent = msg; e.style.display = 'block'; }
    if (o) o.style.display = 'none';
  }

  function showSettingsOk(msg) {
    const o = document.getElementById('settings-ok');
    const e = document.getElementById('settings-erro');
    if (o) { o.textContent = msg; o.style.display = 'block'; }
    if (e) e.style.display = 'none';
  }

  async function handleSaveSettings() {
    hideSettingsMessages();
    const nome = document.getElementById('settings-nome')?.value.trim();
    const senhaAtual = document.getElementById('settings-senha-atual')?.value;
    const novaSenha = document.getElementById('settings-nova-senha')?.value;
    const confirmarSenha = document.getElementById('settings-confirmar-senha')?.value;

    const mudandoSenha = senhaAtual || novaSenha || confirmarSenha;
    if (mudandoSenha) {
      if (!senhaAtual) { showSettingsError('Informe a senha atual'); return; }
      if (!novaSenha) { showSettingsError('Informe a nova senha'); return; }
      if (novaSenha.length < 6) { showSettingsError('Nova senha deve ter ao menos 6 caracteres'); return; }
      if (novaSenha !== confirmarSenha) { showSettingsError('As senhas não coincidem'); return; }
    }

    const body = {};
    if (nome) body.nome = nome;
    if (mudandoSenha && senhaAtual && novaSenha) {
      body.senha_atual = senhaAtual;
      body.nova_senha = novaSenha;
    }

    if (!Object.keys(body).length) {
      showSettingsError('Nenhuma alteração para salvar');
      return;
    }

    const btn = document.getElementById('btn-settings-salvar');
    if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) { showSettingsError(data.error || 'Erro ao salvar'); return; }

      showSettingsOk('Perfil atualizado com sucesso!');
      if (nome) {
        const sideNome = document.getElementById('sideUserNome');
        if (sideNome) sideNome.textContent = nome;
      }
      ['settings-senha-atual', 'settings-nova-senha', 'settings-confirmar-senha'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
    } catch {
      showSettingsError('Erro de conexão. Tente novamente.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Salvar Alterações'; }
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login.html';
  }

  // ---- Mobile drawer ----
  const MOBILE_NAV = [
    { href: '/dashboard.html', icon: 'dashboard', label: 'Dashboard' },
    { href: '/obras.html', icon: 'construction', label: 'Obras' },
    { href: '/funcionarios.html', icon: 'groups', label: 'Funcionários' },
    { href: '/responsaveis.html', icon: 'engineering', label: 'Responsáveis' },
    { href: '/relatorio.html', icon: 'analytics', label: 'Relatórios' },
    { href: '/usuarios.html', icon: 'manage_accounts', label: 'Usuários', adminOnly: true },
  ];

  function injectMobileDrawer() {
    const path = window.location.pathname;

    const navLinks = MOBILE_NAV.map(item => {
      const isActive = path === item.href || path.endsWith(item.href);
      const base = 'align-items:center;gap:16px;padding:12px 16px;font-family:\'JetBrains Mono\',monospace;font-size:12px;letter-spacing:.05em;text-transform:uppercase;text-decoration:none;transition:background .15s;';
      const state = isActive ? 'background:#c62828;color:#ffe0dd;border-right:4px solid #a20513;font-weight:700;' : 'color:#546067;';
      const display = item.adminOnly ? 'display:none;' : 'display:flex;';
      const idAttr = item.adminOnly ? ' id="drawer-link-usuarios"' : '';
      const iconFill = isActive ? "font-variation-settings:'FILL' 1;" : '';
      return `<a href="${item.href}"${idAttr} style="${display}${base}${state}"><span class="material-symbols-outlined" style="font-size:20px;${iconFill}">${item.icon}</span>${item.label}</a>`;
    }).join('');

    const overlay = document.createElement('div');
    overlay.id = 'mobile-drawer-overlay';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;';
    overlay.innerHTML = `
      <div id="mobile-drawer" style="position:absolute;top:0;left:0;height:100%;width:256px;background:#f3f3f3;border-right:2px solid #e4beba;display:flex;flex-direction:column;transform:translateX(-100%);transition:transform .25s cubic-bezier(.4,0,.2,1);">
        <div style="padding:16px;border-bottom:2px solid #e4beba;display:flex;align-items:center;justify-content:space-between;background:#2f3131;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:50%;background:#d7e4ec;border:2px solid #e4beba;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
              <span id="drawer-avatar-icon" class="material-symbols-outlined" style="color:#546067;">person</span>
              <img id="drawer-avatar-img" alt="Foto" style="display:none;width:100%;height:100%;object-fit:cover;">
            </div>
            <div>
              <div id="drawer-user-nome" style="font-family:'Hanken Grotesk',sans-serif;font-weight:700;font-size:13px;color:#f1f1f1;">...</div>
              <div id="drawer-user-role" style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#b0b8bc;text-transform:uppercase;letter-spacing:.05em;">Encarregado</div>
            </div>
          </div>
          <button id="drawer-close-btn" style="background:none;border:none;cursor:pointer;color:#b0b8bc;display:flex;align-items:center;padding:4px;">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <nav style="flex:1;padding:8px 0;overflow-y:auto;">
          ${navLinks}
        </nav>
        <div style="padding:12px 16px;border-top:2px solid #e4beba;">
          <button id="drawer-logout-btn" style="width:100%;height:44px;border:2px solid #8f706c;color:#546067;background:none;font-family:'JetBrains Mono',monospace;font-size:11px;text-transform:uppercase;cursor:pointer;letter-spacing:.05em;display:flex;align-items:center;justify-content:center;gap:8px;">
            <span class="material-symbols-outlined" style="font-size:16px;">logout</span>Sair
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMobileDrawer();
    });
    document.getElementById('drawer-close-btn')?.addEventListener('click', closeMobileDrawer);
    document.getElementById('drawer-logout-btn')?.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login.html';
    });
  }

  async function loadDrawerUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) return;
      const user = await res.json();
      const nomeEl = document.getElementById('drawer-user-nome');
      const roleEl = document.getElementById('drawer-user-role');
      if (nomeEl) nomeEl.textContent = user.nome || '...';
      if (roleEl) roleEl.textContent = user.papel === 'admin' ? 'Administrador' : 'Encarregado';
      if (user.papel === 'admin') {
        const linkUsuarios = document.getElementById('drawer-link-usuarios');
        if (linkUsuarios) linkUsuarios.style.display = 'flex';
      }
      const photo = localStorage.getItem('wcj_user_photo');
      if (photo) {
        const img = document.getElementById('drawer-avatar-img');
        const icon = document.getElementById('drawer-avatar-icon');
        if (img) { img.src = photo; img.style.display = 'block'; }
        if (icon) icon.style.display = 'none';
      }
    } catch {}
  }

  function openMobileDrawer() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const drawer = document.getElementById('mobile-drawer');
    if (!overlay || !drawer) return;
    overlay.style.display = 'block';
    requestAnimationFrame(() => {
      drawer.style.transform = 'translateX(0)';
    });
    loadDrawerUser();
  }

  function closeMobileDrawer() {
    const overlay = document.getElementById('mobile-drawer-overlay');
    const drawer = document.getElementById('mobile-drawer');
    if (!overlay || !drawer) return;
    drawer.style.transform = 'translateX(-100%)';
    setTimeout(() => { overlay.style.display = 'none'; }, 250);
  }

  // ---- Init ----
  function init() {
    injectHTML();
    injectMobileDrawer();

    // Wire close buttons
    document.getElementById('btn-close-notif')?.addEventListener('click', () => {
      const p = document.getElementById('notif-panel');
      if (p) p.style.display = 'none';
    });
    document.getElementById('btn-close-settings')?.addEventListener('click', closeSettingsModal);
    document.getElementById('settings-modal')?.addEventListener('click', (e) => {
      if (e.target === document.getElementById('settings-modal')) closeSettingsModal();
    });
    document.getElementById('btn-settings-salvar')?.addEventListener('click', handleSaveSettings);
    document.getElementById('btn-settings-logout')?.addEventListener('click', handleLogout);

    // Wire header buttons
    document.getElementById('btn-notif')?.addEventListener('click', toggleNotifPanel);
    document.getElementById('btn-settings')?.addEventListener('click', openSettingsModal);

    // Wire hamburger (span with class md:hidden containing "menu" icon)
    const hamburger = document.querySelector('header .md\\:hidden');
    if (hamburger) {
      hamburger.style.cursor = 'pointer';
      hamburger.addEventListener('click', openMobileDrawer);
    }

    // Close notif panel on outside click
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('notif-panel');
      const btn = document.getElementById('btn-notif');
      if (panel && panel.style.display !== 'none' &&
          !panel.contains(e.target) && !btn?.contains(e.target)) {
        panel.style.display = 'none';
      }
    });

    initPhotoInput();
    loadUserPhoto();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
