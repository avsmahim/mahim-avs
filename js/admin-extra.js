/* =====================================================
   ADMIN EXTRA — Navbar, Hero, Profile, Apps, Footer,
   Theme, Site Settings — all backed by Supabase
   ===================================================== */

(function () {

  /* ----- HELPER: upsert a single key/value in settings table ----- */
  async function setSetting(key, value) {
    if (!supabaseClient) return { error: { message: 'No Supabase client' } };
    return supabaseClient.from('settings').upsert({ key, value }, { onConflict: 'key' });
  }

  async function getSetting(key) {
    if (!supabaseClient) return null;
    const { data } = await supabaseClient.from('settings').select('value').eq('key', key).single();
    return data ? data.value : null;
  }

  async function bulkGetSettings(keys) {
    if (!supabaseClient) return {};
    const { data } = await supabaseClient.from('settings').select('key, value').in('key', keys);
    const map = {};
    (data || []).forEach(r => { map[r.key] = r.value; });
    return map;
  }

  async function bulkSaveSettings(obj) {
    if (!supabaseClient) return { error: { message: 'No Supabase client' } };
    const rows = Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
    return supabaseClient.from('settings').upsert(rows, { onConflict: 'key' });
  }

  function showMsg(id, text, ok) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.color = ok ? '#4caf50' : '#ff4d4d';
    el.innerText = text;
    setTimeout(() => { el.innerText = ''; }, 3500);
  }

  /* ─────────────────────────────────────────────────────
     SIDEBAR NAV — extend existing nav-item click handler
     to also handle new sections without breaking old ones
  ───────────────────────────────────────────────────── */
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      // Load data when entering sections
      if (target === 'navbar') loadNavbarSettings();
      if (target === 'hero') loadHeroSettings();
      if (target === 'profile-sec') loadProfileSettings();
      if (target === 'footer-sec') loadFooterSettings();
      if (target === 'theme') loadThemeSettings();
      if (target === 'settings') loadSiteSettings();
      if (target === 'apps') loadApps();
    });
  });

  /* ═══════════════════════════════
     SITE SETTINGS
  ═══════════════════════════════ */
  window.loadSiteSettings = async function () {
    const keys = ['site_title', 'site_tagline', 'site_meta_desc', 'site_favicon', 'maintenance_mode'];
    const m = await bulkGetSettings(keys);
    setVal('setting-site-title', m['site_title'] || '');
    setVal('setting-tagline', m['site_tagline'] || '');
    setVal('setting-meta-desc', m['site_meta_desc'] || '');
    setVal('setting-favicon', m['site_favicon'] || '');
    setVal('setting-maintenance', m['maintenance_mode'] || 'false');
  };

  window.saveSiteSettings = async function () {
    const { error } = await bulkSaveSettings({
      site_title: getVal('setting-site-title'),
      site_tagline: getVal('setting-tagline'),
      site_meta_desc: getVal('setting-meta-desc'),
      site_favicon: getVal('setting-favicon'),
      maintenance_mode: getVal('setting-maintenance'),
    });
    showMsg('settings-msg', error ? 'Error: ' + error.message : '✓ Saved!', !error);
  };

  /* ═══════════════════════════════
     NAVBAR SETTINGS
  ═══════════════════════════════ */
  window.loadNavbarSettings = async function () {
    const keys = ['nav_logo_text', 'nav_logo_color', 'nav_signup_text', 'nav_signup_color'];
    const m = await bulkGetSettings(keys);
    setVal('nav-logo-text', m['nav_logo_text'] || 'AVS MAHIM');
    setVal('nav-logo-color', m['nav_logo_color'] || '#ffd700');
    setVal('nav-signup-text', m['nav_signup_text'] || 'SIGN UP');
    setVal('nav-signup-color', m['nav_signup_color'] || '#ffd700');
  };

  window.saveNavbarSettings = async function () {
    const { error } = await bulkSaveSettings({
      nav_logo_text: getVal('nav-logo-text'),
      nav_logo_color: getVal('nav-logo-color'),
      nav_signup_text: getVal('nav-signup-text'),
      nav_signup_color: getVal('nav-signup-color'),
    });
    showMsg('navbar-msg', error ? 'Error: ' + error.message : '✓ Saved! Navbar will update on site.', !error);
  };

  /* ═══════════════════════════════
     HERO SETTINGS
  ═══════════════════════════════ */
  window.loadHeroSettings = async function () {
    const keys = ['hero_title', 'hero_subtitle', 'hero_btn_text', 'hero_btn_link', 'hero_bg_image', 'hero_bg_video'];
    const m = await bulkGetSettings(keys);
    setVal('hero-title', m['hero_title'] || '');
    setVal('hero-subtitle', m['hero_subtitle'] || '');
    setVal('hero-btn-text', m['hero_btn_text'] || '');
    setVal('hero-btn-link', m['hero_btn_link'] || '');
    setVal('hero-bg-image', m['hero_bg_image'] || '');
    setVal('hero-bg-video', m['hero_bg_video'] || '');
  };

  window.saveHeroSettings = async function () {
    const { error } = await bulkSaveSettings({
      hero_title: getVal('hero-title'),
      hero_subtitle: getVal('hero-subtitle'),
      hero_btn_text: getVal('hero-btn-text'),
      hero_btn_link: getVal('hero-btn-link'),
      hero_bg_image: getVal('hero-bg-image'),
      hero_bg_video: getVal('hero-bg-video'),
    });
    showMsg('hero-msg', error ? 'Error: ' + error.message : '✓ Saved! Hero will update on site.', !error);
  };

  /* ═══════════════════════════════
     PROFILE SETTINGS
  ═══════════════════════════════ */
  window.loadProfileSettings = async function () {
    const keys = [
      'profile_name', 'profile_image',
      'profile_bio1', 'profile_bio2', 'profile_bio3', 'profile_bio4',
      'profile_link1_text', 'profile_link1_url',
      'profile_link2_text', 'profile_link2_url',
      'profile_visible'
    ];
    const m = await bulkGetSettings(keys);
    setVal('profile-name', m['profile_name'] || 'AVS Mahim');
    setVal('profile-image', m['profile_image'] || '');
    setVal('profile-bio1', m['profile_bio1'] || '');
    setVal('profile-bio2', m['profile_bio2'] || '');
    setVal('profile-bio3', m['profile_bio3'] || '');
    setVal('profile-bio4', m['profile_bio4'] || '');
    setVal('profile-link1-text', m['profile_link1_text'] || 'More at AVS Control');
    setVal('profile-link1-url', m['profile_link1_url'] || '#');
    setVal('profile-link2-text', m['profile_link2_text'] || 'Contact info');
    setVal('profile-link2-url', m['profile_link2_url'] || '#');
    setVal('profile-visible', m['profile_visible'] || 'true');
  };

  window.saveProfileSettings = async function () {
    const { error } = await bulkSaveSettings({
      profile_name: getVal('profile-name'),
      profile_image: getVal('profile-image'),
      profile_bio1: getVal('profile-bio1'),
      profile_bio2: getVal('profile-bio2'),
      profile_bio3: getVal('profile-bio3'),
      profile_bio4: getVal('profile-bio4'),
      profile_link1_text: getVal('profile-link1-text'),
      profile_link1_url: getVal('profile-link1-url'),
      profile_link2_text: getVal('profile-link2-text'),
      profile_link2_url: getVal('profile-link2-url'),
      profile_visible: getVal('profile-visible'),
    });
    showMsg('profile-sec-msg', error ? 'Error: ' + error.message : '✓ Saved!', !error);
  };

  /* ═══════════════════════════════
     FOOTER SETTINGS
  ═══════════════════════════════ */
  window.loadFooterSettings = async function () {
    const keys = ['footer_desc', 'footer_copyright', 'footer_yt', 'footer_ig', 'footer_fb', 'footer_tw', 'footer_tt', 'footer_dc'];
    const m = await bulkGetSettings(keys);
    setVal('footer-desc', m['footer_desc'] || '');
    setVal('footer-copyright', m['footer_copyright'] || '');
    setVal('footer-yt', m['footer_yt'] || '');
    setVal('footer-ig', m['footer_ig'] || '');
    setVal('footer-fb', m['footer_fb'] || '');
    setVal('footer-tw', m['footer_tw'] || '');
    setVal('footer-tt', m['footer_tt'] || '');
    setVal('footer-dc', m['footer_dc'] || '');
  };

  window.saveFooterSettings = async function () {
    const { error } = await bulkSaveSettings({
      footer_desc: getVal('footer-desc'),
      footer_copyright: getVal('footer-copyright'),
      footer_yt: getVal('footer-yt'),
      footer_ig: getVal('footer-ig'),
      footer_fb: getVal('footer-fb'),
      footer_tw: getVal('footer-tw'),
      footer_tt: getVal('footer-tt'),
      footer_dc: getVal('footer-dc'),
    });
    showMsg('footer-msg', error ? 'Error: ' + error.message : '✓ Saved!', !error);
  };

  /* ═══════════════════════════════
     THEME / COLORS
  ═══════════════════════════════ */
  window.loadThemeSettings = async function () {
    const keys = ['color_primary', 'color_bg', 'color_text', 'color_shadow'];
    const m = await bulkGetSettings(keys);
    setVal('color-primary', m['color_primary'] || '#ffd700');
    setVal('color-bg', m['color_bg'] || '#030609');
    setVal('color-text', m['color_text'] || '#ffffff');
    setVal('color-shadow', m['color_shadow'] || '#b8860b');
    updateThemePreview();
  };

  window.saveThemeSettings = async function () {
    const { error } = await bulkSaveSettings({
      color_primary: getVal('color-primary'),
      color_bg: getVal('color-bg'),
      color_text: getVal('color-text'),
      color_shadow: getVal('color-shadow'),
    });
    showMsg('theme-msg', error ? 'Error: ' + error.message : '✓ Theme saved! It will apply at next page load.', !error);
  };

  window.updateThemePreview = function () {
    const primary = getVal('color-primary') || '#ffd700';
    const bg = getVal('color-bg') || '#030609';
    const text = getVal('color-text') || '#ffffff';
    const nb = document.getElementById('preview-navbar');
    const ph = document.getElementById('preview-hero');
    const pl = document.getElementById('preview-logo');
    const pb = document.getElementById('preview-btn');
    if (nb) nb.style.background = bg;
    if (ph) ph.style.background = bg;
    if (pl) { pl.style.color = primary; }
    if (pb) { pb.style.background = primary; pb.style.color = bg; }
    if (document.querySelector('#preview-hero h2')) document.querySelector('#preview-hero h2').style.color = text;
  };

  window.applyThemePreset = function (preset) {
    const presets = {
      gold: { primary: '#ffd700', bg: '#030609', text: '#ffffff', shadow: '#b8860b' },
      cyan: { primary: '#00d4ff', bg: '#020d12', text: '#ffffff', shadow: '#007ba0' },
      red: { primary: '#ff3b3b', bg: '#0d0202', text: '#ffffff', shadow: '#8b0000' },
      green: { primary: '#39ff14', bg: '#010d01', text: '#ffffff', shadow: '#1a7a00' },
      purple: { primary: '#a855f7', bg: '#08010d', text: '#ffffff', shadow: '#6b21a8' },
    };
    const p = presets[preset];
    if (!p) return;
    setVal('color-primary', p.primary);
    setVal('color-bg', p.bg);
    setVal('color-text', p.text);
    setVal('color-shadow', p.shadow);
    updateThemePreview();
  };

  /* ═══════════════════════════════
     APPS MANAGER
  ═══════════════════════════════ */
  let editingAppId = null;
  const appForm = document.getElementById('app-form');
  const appsTableBody = document.getElementById('apps-table-body');
  const appFormTitle = document.getElementById('app-form-title');
  const cancelAppBtn = document.getElementById('cancel-app-btn');
  const appFormMsg = document.getElementById('app-form-msg');

  window.loadApps = async function () {
    if (!supabaseClient || !appsTableBody) return;
    appsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;opacity:0.5;">Loading apps...</td></tr>`;
    const { data, error } = await supabaseClient.from('apps').select('*').order('created_at', { ascending: false });
    if (error) {
      appsTableBody.innerHTML = `<tr><td colspan="3" style="color:#ff4d4d;">Error: ${error.message}</td></tr>`;
      return;
    }
    if (!data || data.length === 0) {
      appsTableBody.innerHTML = `<tr><td colspan="3" style="text-align:center;opacity:0.5;">No apps found.</td></tr>`;
      return;
    }
    appsTableBody.innerHTML = data.map(item => `
      <tr>
        <td><strong>${item.title}</strong></td>
        <td style="font-size:0.8rem;opacity:0.7;">${(item.description || '').substring(0, 80)}${item.description && item.description.length > 80 ? '…' : ''}</td>
        <td>
          <button class="btn-action btn-edit-app" data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>Edit</button>
          <button class="btn-action btn-danger btn-del-app" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `).join('');

    appsTableBody.querySelectorAll('.btn-edit-app').forEach(btn => btn.addEventListener('click', (e) => {
      const item = JSON.parse(e.target.getAttribute('data-item'));
      editingAppId = item.id;
      if (appFormTitle) appFormTitle.innerText = 'Edit App: ' + item.title;
      if (cancelAppBtn) cancelAppBtn.style.display = 'inline-block';
      setVal('app-title', item.title || '');
      setVal('app-image-url', item.image_url || '');
      setVal('app-download-url', item.download_url || '');
      setVal('app-desc', item.description || '');
      document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
    }));

    appsTableBody.querySelectorAll('.btn-del-app').forEach(btn => btn.addEventListener('click', async (e) => {
      if (!confirm('Delete this app?')) return;
      await supabaseClient.from('apps').delete().eq('id', e.target.getAttribute('data-id'));
      loadApps();
    }));
  };

  if (cancelAppBtn) cancelAppBtn.addEventListener('click', () => {
    editingAppId = null;
    if (appFormTitle) appFormTitle.innerText = 'Add New App';
    cancelAppBtn.style.display = 'none';
    if (appForm) appForm.reset();
  });

  if (appForm) appForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('save-app-btn');
    if (saveBtn) saveBtn.disabled = true;
    if (appFormMsg) { appFormMsg.style.color = 'var(--admin-text-muted)'; appFormMsg.innerText = 'Saving...'; }

    const payload = {
      title: getVal('app-title'),
      image_url: getVal('app-image-url'),
      download_url: getVal('app-download-url'),
      description: getVal('app-desc') || null,
    };

    try {
      if (editingAppId) {
        const { error } = await supabaseClient.from('apps').update(payload).eq('id', editingAppId);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.from('apps').insert([payload]);
        if (error) throw error;
      }
      if (appFormMsg) { appFormMsg.style.color = '#4caf50'; appFormMsg.innerText = '✓ Saved!'; }
      if (cancelAppBtn) cancelAppBtn.click();
      loadApps();
    } catch (err) {
      if (appFormMsg) { appFormMsg.style.color = '#ff4d4d'; appFormMsg.innerText = 'Error: ' + err.message; }
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  /* ────────────── Utility helpers ────────────── */
  function getVal(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
  }
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
  }

})();
