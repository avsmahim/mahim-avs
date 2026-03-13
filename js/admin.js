/* =====================================================
   ADMIN MASTER — Unified Control Logic for EVERYTHING
   Logic for: Navbar, Hero, Profile, Plugins, SFX, 
   Presets, Apps, Posts, Users, Media, Theme, Settings
   ===================================================== */

(function () {
    const BUCKET_NAME = 'downloads'; 

    // UI Elements
    const overlay = document.getElementById('admin-login-overlay');
    const emailInput = document.getElementById('admin-email');
    const passInput = document.getElementById('admin-password');
    const loginBtn = document.getElementById('admin-login-btn');
    const errorMsg = document.getElementById('admin-error');
    const logoutBtn = document.getElementById('admin-logout');
    const navItems = document.querySelectorAll('.nav-item');
    const adminSections = document.querySelectorAll('.admin-section');

    /* ==========================
       SESSION & AUTH
       ========================== */
    async function checkAdminSession() {
        if (!supabaseClient) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            verifyAdminAccess(session.user.id);
        } else {
            overlay.style.display = 'flex';
        }
    }

    async function verifyAdminAccess(userId) {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', userId)
            .single();

        if (data && data.is_admin) {
            overlay.style.display = 'none';
            initAdminPanel();
        } else {
            errorMsg.innerText = 'Access Denied: You are not an administrator.';
            errorMsg.style.display = 'block';
            await supabaseClient.auth.signOut();
        }
    }

    async function handleLogin() {
        errorMsg.style.display = 'none';
        loginBtn.innerText = 'AUTHENTICATING...';
        loginBtn.disabled = true;

        const email = emailInput ? emailInput.value : '';
        const password = passInput.value;

        if (!email || !password) {
            errorMsg.innerText = 'Please enter email and password.';
            errorMsg.style.display = 'block';
            loginBtn.innerText = 'AUTHENTICATE';
            loginBtn.disabled = false;
            return;
        }

        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
            loginBtn.innerText = 'AUTHENTICATE';
            loginBtn.disabled = false;
        } else {
            verifyAdminAccess(data.user.id);
        }
    }

    loginBtn.addEventListener('click', handleLogin);
    if (passInput) passInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    if (emailInput) emailInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') passInput.focus(); });

    if (logoutBtn) logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        location.reload();
    });

    /* ==========================
       NAV & INITIALIZATION
       ========================== */
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            adminSections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const target = item.getAttribute('data-target');
            const sectionEl = document.getElementById(`section-${target}`);
            if (sectionEl) sectionEl.classList.add('active');

            // Load data based on section
            if (target === 'dashboard') loadDashboardStats();
            if (target === 'plugins') loadPlugins();
            if (target === 'sfx') loadSFX();
            if (target === 'presets') loadPresets();
            if (target === 'media') loadMedia();
            if (target === 'posts') loadPosts();
            if (target === 'users') loadUsers();
            if (target === 'orders') loadOrders();
            if (target === 'ads') loadAds();
            if (target === 'navbar') loadNavbarSettings();
            if (target === 'hero') loadHeroSettings();
            if (target === 'profile-sec') loadProfileSettings();
            if (target === 'footer-sec') loadFooterSettings();
            if (target === 'theme') loadThemeSettings();
            if (target === 'apps') loadApps();
            if (target === 'settings') loadSiteSettings();
        });
    });

    function initAdminPanel() {
        if (!supabaseClient) return;
        loadDashboardStats();
        if (typeof window.initBlogEditor === 'function') {
            window.initBlogEditor(supabaseClient);
        }
    }

    /* ==========================
       DASHBOARD STATS
       ========================== */
    async function loadDashboardStats() {
        if (!supabaseClient) return;
        try {
            const getCount = async (table) => {
                const { count } = await supabaseClient.from(table).select('*', { count: 'exact', head: true });
                return count || 0;
            };

            const pCount = await getCount('plugins');
            const sCount = await getCount('sfx');
            const prCount = await getCount('presets');
            const aCount = await getCount('apps');
            const poCount = await getCount('posts');
            const uCount = await getCount('profiles');

            document.getElementById('stat-items').innerText = pCount + sCount + prCount + aCount;
            document.getElementById('stat-users').innerText = uCount;
            document.getElementById('stat-downloads').innerText = poCount; 
            
            const { data: pData } = await supabaseClient.from('purchases').select('id');
            document.getElementById('stat-revenue').innerText = pData ? `$${pData.length * 10}` : '$0';

        } catch (e) { console.error('Stats error:', e); }
    }

    /* ==========================
       HELPERS
       ========================== */
    function showMsg(id, text, ok) {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.color = ok ? '#4caf50' : '#ff4d4d';
        el.innerText = text;
        setTimeout(() => { el.innerText = ''; }, 3500);
    }
    function getVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }
    function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

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

    function createRowHTML(item, type) {
        return `
            <tr>
                <td><strong>${item.title}</strong></td>
                <td><span class="badge ${item.is_premium ? 'badge-premium' : 'badge-free'}">${item.is_premium ? 'Premium' : 'Free'}</span></td>
                <td>$${item.price || 0}</td>
                <td>
                    <button class="btn-action" onclick="window.editItem('${type}', '${item.id}')">Edit</button>
                    <button class="btn-action btn-danger" onclick="window.deleteItem('${type}', '${item.id}')">Del</button>
                </td>
            </tr>
        `;
    }

    /* ==========================
       ITEM MANAGERS (Plugins, SFX, Presets)
       ========================== */
    async function loadTableData(table, bodyId) {
        const body = document.getElementById(bodyId);
        if (!body) return;
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.5;">Loading...</td></tr>';
        const { data, error } = await supabaseClient.from(table).select('*').order('created_at', { ascending: false });
        if (error || !data) { body.innerHTML = '<tr><td colspan="4">Error loading data</td></tr>'; return; }
        if (data.length === 0) { body.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.5;">No items found.</td></tr>'; return; }
        body.innerHTML = data.map(item => createRowHTML(item, table)).join('');
    }

    window.loadPlugins = () => loadTableData('plugins', 'plugins-table-body');
    window.loadSFX = () => loadTableData('sfx', 'sfx-table-body');
    window.loadPresets = () => loadTableData('presets', 'presets-table-body');

    window.deleteItem = async (table, id) => {
        if (!confirm('Delete this item?')) return;
        await supabaseClient.from(table).delete().eq('id', id);
        if (table === 'plugins') loadPlugins();
        if (table === 'sfx') loadSFX();
        if (table === 'presets') loadPresets();
        if (table === 'apps') loadApps();
        loadDashboardStats();
    };

    window.editItem = async (table, id) => {
        const { data } = await supabaseClient.from(table).select('*').eq('id', id).single();
        if (!data) return;
        if (table === 'plugins') {
            document.getElementById('plugin-id').value = data.id;
            document.getElementById('plugin-title').value = data.title;
            document.getElementById('plugin-type').value = data.is_premium ? 'premium' : 'free';
            document.getElementById('plugin-price').value = data.price || 0;
            document.getElementById('plugin-file-url').value = data.file_url || '';
            document.getElementById('plugin-image-url').value = data.image_url || '';
            document.getElementById('plugin-desc').value = data.description || '';
            document.getElementById('plugin-form-title').innerText = "Edit Plugin: " + data.title;
            document.getElementById('cancel-plugin-btn').style.display = 'inline-block';
        }
        if (table === 'sfx') {
            document.getElementById('sfx-id').value = data.id;
            document.getElementById('sfx-title').value = data.title;
            document.getElementById('sfx-type').value = data.is_premium ? 'premium' : 'free';
            document.getElementById('sfx-price').value = data.price || 0;
            document.getElementById('sfx-audio-url').value = data.audio_url || '';
            document.getElementById('sfx-file-url').value = data.file_url || '';
            document.getElementById('sfx-image-url').value = data.image_url || '';
            document.getElementById('sfx-desc').value = data.description || '';
            document.getElementById('sfx-form-title').innerText = "Edit SFX: " + data.title;
            document.getElementById('cancel-sfx-btn').style.display = 'inline-block';
        }
        if (table === 'presets') {
            document.getElementById('preset-id').value = data.id;
            document.getElementById('preset-title').value = data.title;
            document.getElementById('preset-type').value = data.is_premium ? 'premium' : 'free';
            document.getElementById('preset-price').value = data.price || 0;
            document.getElementById('preset-file-url').value = data.file_url || '';
            document.getElementById('preset-image-url').value = data.image_url || '';
            document.getElementById('preset-desc').value = data.description || '';
            document.getElementById('preset-form-title').innerText = "Edit Preset: " + data.title;
            document.getElementById('cancel-preset-btn').style.display = 'inline-block';
        }
        document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
    };

    const setupForm = (formId, table, loader) => {
        const form = document.getElementById(formId);
        if (!form) return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = form.querySelector('input[type="hidden"]').value;
            const isPremium = form.querySelector('select').value === 'premium';
            
            const payload = {
                title: form.querySelector('input[type="text"]').value,
                is_premium: isPremium,
                price: parseFloat(form.querySelector('input[type="number"]').value) || 0,
                description: form.querySelector('textarea').value || null
            };
            if (table === 'plugins') { payload.file_url = getVal('plugin-file-url'); payload.image_url = getVal('plugin-image-url'); }
            if (table === 'sfx') { payload.audio_url = getVal('sfx-audio-url'); payload.file_url = getVal('sfx-file-url'); payload.image_url = getVal('sfx-image-url'); }
            if (table === 'presets') { payload.file_url = getVal('preset-file-url'); payload.image_url = getVal('preset-image-url'); }

            const { error } = id 
                ? await supabaseClient.from(table).update(payload).eq('id', id)
                : await supabaseClient.from(table).insert([payload]);

            if (error) { showMsg(formId + '-msg', error.message, false); }
            else { 
                showMsg(formId + '-msg', 'Saved!', true); 
                form.reset(); 
                form.querySelector('input[type="hidden"]').value = '';
                const title = form.parentElement.querySelector('.panel-title');
                if (title) title.innerText = "Add New " + (table.toUpperCase());
                const cancelBtn = form.querySelector('.btn-secondary');
                if (cancelBtn) cancelBtn.style.display = 'none';
                loader(); loadDashboardStats();
            }
        });
    };

    setupForm('plugin-form', 'plugins', loadPlugins);
    setupForm('sfx-form', 'sfx', loadSFX);
    setupForm('preset-form', 'presets', loadPresets);

    /* ==========================
       MEDIA MANAGER
       ========================== */
    async function loadMedia() {
        const grid = document.getElementById('media-grid');
        if (!grid) return;
        grid.innerHTML = '<p style="grid-column: 1/-1;">Loading media...</p>';
        const { data, error } = await supabaseClient.storage.from(BUCKET_NAME).list('', { limit: 100 });
        if (error || !data) { grid.innerHTML = '<p>Error loading media</p>'; return; }
        grid.innerHTML = data.filter(f => f.name !== '.emptyFolderPlaceholder').map(file => {
            const url = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(file.name).data.publicUrl;
            return `
                <div class="media-item">
                    ${file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? `<img src="${url}">` : `<div style="height:80px;background:#111;display:flex;align-items:center;justify-content:center;">FILE</div>`}
                    <div class="media-name">${file.name}</div>
                    <button class="btn-action" onclick="navigator.clipboard.writeText('${url}'); alert('URL Copied!')">Copy</button>
                    <button class="btn-action btn-danger" onclick="window.deleteMedia('${file.name}')">Del</button>
                </div>
            `;
        }).join('');
    }

    window.deleteMedia = async (name) => {
        if (!confirm('Delete file?')) return;
        await supabaseClient.storage.from(BUCKET_NAME).remove([name]);
        loadMedia();
    };

    const mediaForm = document.getElementById('media-form');
    if (mediaForm) {
        mediaForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('media-file').files[0];
            if (!file) return;
            const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(`${Date.now()}_${file.name}`, file);
            if (!error) { showMsg('media-msg', 'Uploaded!', true); loadMedia(); }
            else { showMsg('media-msg', error.message, false); }
        });
    }

    /* ==========================
       USERS & ORDERS
       ========================== */
    async function loadUsers() {
        const body = document.getElementById('users-table-body');
        const { data } = await supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
        if (!data) return;
        body.innerHTML = data.map(u => `
            <tr>
                <td><strong>${u.name || 'User'}</strong><br><small>${u.email}</small></td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td><span class="badge ${u.is_admin ? 'badge-premium' : ''}">${u.is_admin ? 'ADMIN' : 'User'}</span></td>
                <td><button class="btn-action" onclick="window.toggleAdmin('${u.id}', ${u.is_admin})">${u.is_admin ? 'Revoke' : 'Make Admin'}</button></td>
            </tr>
        `).join('');
    }
    window.toggleAdmin = async (id, status) => {
        await supabaseClient.from('profiles').update({ is_admin: !status }).eq('id', id);
        loadUsers();
    };

    async function loadOrders() {
        const body = document.getElementById('orders-table-body');
        if (!body) return;
        const { data } = await supabaseClient.from('purchases').select('id, user_id, item_id, created_at').order('created_at', { ascending: false });
        if (!data || data.length === 0) { body.innerHTML = '<tr><td colspan="4" style="text-align:center;opacity:0.5">No orders found.</td></tr>'; return; }
        body.innerHTML = data.map(o => `<tr><td>${o.id}</td><td>${o.user_id}</td><td>${o.item_id}</td><td>${new Date(o.created_at).toLocaleDateString()}</td></tr>`).join('');
    }

    async function loadPosts() {
        const body = document.getElementById('posts-table-body');
        const { data } = await supabaseClient.from('posts').select('*').order('published_at', { ascending: false });
        if (!data) return;
        body.innerHTML = data.map(p => `
            <tr>
                <td>${p.title}</td>
                <td>${p.labels || ''}</td>
                <td>${p.status}</td>
                <td><button class="btn-action" onclick="window.editPost('${p.id}')">Edit</button></td>
            </tr>
        `).join('');
    }

    /* ==========================
       SETTINGS
       ========================== */
    window.loadNavbarSettings = async () => {
        const m = await bulkGetSettings(['nav_logo_text', 'nav_logo_color', 'nav_signup_text', 'nav_signup_color']);
        setVal('nav-logo-text', m.nav_logo_text || 'AVS MAHIM');
        setVal('nav-logo-color', m.nav_logo_color || '#ffd700');
        setVal('nav-signup-text', m.nav_signup_text || 'SIGN UP');
        setVal('nav-signup-color', m.nav_signup_color || '#ffd700');
    };
    window.saveNavbarSettings = async () => {
        const { error } = await bulkSaveSettings({
            nav_logo_text: getVal('nav-logo-text'), nav_logo_color: getVal('nav-logo-color'),
            nav_signup_text: getVal('nav-signup-text'), nav_signup_color: getVal('nav-signup-color')
        });
        showMsg('navbar-msg', error ? error.message : 'Saved!', !error);
    };

    window.loadHeroSettings = async () => {
        const m = await bulkGetSettings(['hero_title', 'hero_subtitle', 'hero_btn_text', 'hero_btn_link', 'hero_bg_image', 'hero_bg_video']);
        setVal('hero-title', m.hero_title || '');
        setVal('hero-subtitle', m.hero_subtitle || '');
        setVal('hero-btn-text', m.hero_btn_text || '');
        setVal('hero-btn-link', m.hero_btn_link || '');
        setVal('hero-bg-image', m.hero_bg_image || '');
        setVal('hero-bg-video', m.hero_bg_video || '');
    };
    window.saveHeroSettings = async () => {
        const { error } = await bulkSaveSettings({
            hero_title: getVal('hero-title'), hero_subtitle: getVal('hero-subtitle'),
            hero_btn_text: getVal('hero-btn-text'), hero_btn_link: getVal('hero-btn-link'),
            hero_bg_image: getVal('hero-bg-image'), hero_bg_video: getVal('hero-bg-video')
        });
        showMsg('hero-msg', error ? error.message : 'Saved!', !error);
    };

    window.loadProfileSettings = async () => {
        const keys = ['profile_name', 'profile_image', 'profile_bio1', 'profile_bio2', 'profile_bio3', 'profile_bio4', 'profile_link1_text', 'profile_link1_url', 'profile_link2_text', 'profile_link2_url', 'profile_visible'];
        const m = await bulkGetSettings(keys);
        setVal('profile-name', m.profile_name || 'AVS Mahim');
        setVal('profile-image', m.profile_image || '');
        setVal('profile-bio1', m.profile_bio1 || '');
        setVal('profile-bio2', m.profile_bio2 || '');
        setVal('profile-bio3', m.profile_bio3 || '');
        setVal('profile-bio4', m.profile_bio4 || '');
        setVal('profile-link1-text', m.profile_link1_text || '');
        setVal('profile-link1-url', m.profile_link1_url || '');
        setVal('profile-link2-text', m.profile_link2_text || '');
        setVal('profile-link2-url', m.profile_link2_url || '');
        setVal('profile-visible', m.profile_visible || 'true');
    };
    window.saveProfileSettings = async () => {
        const { error } = await bulkSaveSettings({
            profile_name: getVal('profile-name'), profile_image: getVal('profile-image'),
            profile_bio1: getVal('profile-bio1'), profile_bio2: getVal('profile-bio2'),
            profile_bio3: getVal('profile-bio3'), profile_bio4: getVal('profile-bio4'),
            profile_link1_text: getVal('profile-link1-text'), profile_link1_url: getVal('profile-link1-url'),
            profile_link2_text: getVal('profile-link2-text'), profile_link2_url: getVal('profile-link2-url'),
            profile_visible: getVal('profile-visible')
        });
        showMsg('profile-sec-msg', error ? error.message : 'Saved!', !error);
    };

    window.loadFooterSettings = async () => {
        const m = await bulkGetSettings(['footer_desc', 'footer_copyright', 'footer_yt', 'footer_ig', 'footer_fb', 'footer_tw', 'footer_tt', 'footer_dc']);
        setVal('footer-desc', m.footer_desc || '');
        setVal('footer-copyright', m.footer_copyright || '');
        setVal('footer-yt', m.footer_yt || '');
        setVal('footer-ig', m.footer_ig || '');
        setVal('footer-fb', m.footer_fb || '');
        setVal('footer-tw', m.footer_tw || '');
        setVal('footer-tt', m.footer_tt || '');
        setVal('footer-dc', m.footer_dc || '');
    };
    window.saveFooterSettings = async () => {
        const { error } = await bulkSaveSettings({
            footer_desc: getVal('footer-desc'), footer_copyright: getVal('footer-copyright'),
            footer_yt: getVal('footer-yt'), footer_ig: getVal('footer-ig'),
            footer_fb: getVal('footer-fb'), footer_tw: getVal('footer-tw'),
            footer_tt: getVal('footer-tt'), footer_dc: getVal('footer-dc')
        });
        showMsg('footer-msg', error ? error.message : 'Saved!', !error);
    };

    window.loadThemeSettings = async () => {
        const m = await bulkGetSettings(['color_primary', 'color_bg', 'color_text', 'color_shadow']);
        setVal('color-primary', m.color_primary || '#ffd700');
        setVal('color-bg', m.color_bg || '#030609');
        setVal('color-text', m.color_text || '#ffffff');
        setVal('color-shadow', m.color_shadow || '#b8860b');
        window.updateThemePreview();
    };
    window.saveThemeSettings = async () => {
        const { error } = await bulkSaveSettings({
            color_primary: getVal('color-primary'), color_bg: getVal('color-bg'),
            color_text: getVal('color-text'), color_shadow: getVal('color-shadow')
        });
        showMsg('theme-msg', error ? error.message : 'Saved!', !error);
    };

    window.updateThemePreview = () => {
        const p = getVal('color-primary'); const b = getVal('color-bg'); 
        const nb = document.getElementById('preview-navbar');
        const ph = document.getElementById('preview-hero');
        if (nb) nb.style.background = b; if (ph) ph.style.background = b;
        const pl = document.getElementById('preview-logo');
        if (pl) pl.style.color = p;
        const pb = document.getElementById('preview-btn');
        if (pb) pb.style.background = p;
    };

    window.loadApps = async () => {
        const body = document.getElementById('apps-table-body');
        if (!body) return;
        body.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
        const { data } = await supabaseClient.from('apps').select('*').order('created_at', { ascending: false });
        if (!data || data.length === 0) { body.innerHTML = '<tr><td colspan="3">No apps found.</td></tr>'; return; }
        body.innerHTML = data.map(i => `<tr><td>${i.title}</td><td>${i.description || ''}</td><td><button class="btn-action" onclick="window.deleteItem('apps', '${i.id}')">Del</button></td></tr>`).join('');
    };

    window.loadAds = async () => {
        const m = await bulkGetSettings(['ad_header_code']);
        setVal('ad-header-code', m.ad_header_code || '');
    };
    window.saveAds = async () => {
        const { error } = await bulkSaveSettings({ ad_header_code: getVal('ad-header-code') });
        showMsg('ads-msg', error ? error.message : 'Saved!', !error);
    };

    window.loadSiteSettings = async () => {
        const m = await bulkGetSettings(['site_title', 'site_tagline', 'site_meta_desc', 'site_favicon', 'maintenance_mode']);
        setVal('setting-site-title', m.site_title || '');
        setVal('setting-tagline', m.site_tagline || '');
        setVal('setting-meta-desc', m.site_meta_desc || '');
        setVal('setting-favicon', m.site_favicon || '');
        setVal('setting-maintenance', m.maintenance_mode || 'false');
    };
    window.saveSiteSettings = async () => {
        const { error } = await bulkSaveSettings({
            site_title: getVal('setting-site-title'), site_tagline: getVal('setting-tagline'),
            site_meta_desc: getVal('setting-meta-desc'), site_favicon: getVal('setting-favicon'),
            maintenance_mode: getVal('setting-maintenance')
        });
        showMsg('settings-msg', error ? error.message : 'Saved!', !error);
    };

    // Init
    setTimeout(checkAdminSession, 500);

})();
