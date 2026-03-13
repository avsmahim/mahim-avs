/* =====================================================
   AVS MASTER ADMIN LOGIN & LOGIC (V2 REBUILD)
   Unifies: Auth, Builder, Navbar, Hero, CRUD, Users, Media
   ===================================================== */

(function () {
    const BUCKET_NAME = 'downloads';
    let currentUser = null;

    // UI Elements
    const overlay = document.getElementById('login-overlay');
    const authBtn = document.getElementById('auth-btn');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const errorMsg = document.getElementById('error-msg');
    const menuItems = document.querySelectorAll('.menu-item');
    const sections = document.querySelectorAll('.section');
    const logoutBtn = document.getElementById('logout-btn');

    /* ==========================
       1. AUTHENTICATION & ACCESS
       ========================== */
    async function checkSession() {
        if (!supabaseClient) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            verifyAdmin(session.user);
        } else {
            overlay.style.display = 'flex';
        }
    }

    async function verifyAdmin(user) {
        const { data, error } = await supabaseClient
            .from('profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (data && data.is_admin) {
            currentUser = user;
            overlay.style.display = 'none';
            initApp();
        } else {
            errorMsg.innerText = "ACCESS DENIED: Not an administrator.";
            errorMsg.style.display = 'block';
            await supabaseClient.auth.signOut();
        }
    }

    authBtn.addEventListener('click', async () => {
        errorMsg.style.display = 'none';
        authBtn.innerText = "AUTHENTICATING...";
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: emailInput.value,
            password: passInput.value
        });
        if (error) {
            errorMsg.innerText = error.message;
            errorMsg.style.display = 'block';
            authBtn.innerText = "Sign In";
        } else {
            verifyAdmin(data.user);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        location.reload();
    });

    /* ==========================
       2. NAVIGATION
       ========================== */
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.id === 'logout-btn') return;
            const target = item.getAttribute('data-target');
            
            menuItems.forEach(m => m.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(`section-${target}`).classList.add('active');

            // Load data for section
            loadSectionData(target);
        });
    });

    function loadSectionData(target) {
        if (target === 'dashboard') loadDashboard();
        if (target === 'builder') loadBuilder();
        if (target === 'navbar') loadNavbar();
        if (target === 'hero') loadHero();
        if (target === 'plugins') loadTable('plugins');
        if (target === 'sfx') loadTable('sfx');
        if (target === 'presets') loadTable('presets');
        if (target === 'apps') loadTable('apps');
        if (target === 'posts') loadTable('posts');
        if (target === 'users') loadUsers();
        if (target === 'media') loadMedia();
        if (target === 'theme') loadTheme();
        if (target === 'settings') loadSettings();
    }

    /* ==========================
       3. DASHBOARD
       ========================== */
    async function loadDashboard() {
        const getCount = async (table) => {
            const { count } = await supabaseClient.from(table).select('*', { count: 'exact', head: true });
            return count || 0;
        };
        document.getElementById('dash-users').innerText = await getCount('profiles');
        const pCount = await getCount('plugins');
        const sCount = await getCount('sfx');
        const prCount = await getCount('presets');
        document.getElementById('dash-items').innerText = pCount + sCount + prCount;
        document.getElementById('dash-posts').innerText = await getCount('posts');
    }

    /* ==========================
       4. PAGE BUILDER (DRAGGABLE)
       ========================== */
    async function loadBuilder() {
        const list = document.getElementById('layout-list');
        list.innerHTML = "Loading...";
        const { data } = await supabaseClient.from('page_layout').select('*').order('position', { ascending: true });
        
        list.innerHTML = "";
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'sortable-item';
            div.setAttribute('data-id', item.id);
            div.setAttribute('data-name', item.section_name);
            div.innerHTML = `
                <span>${item.section_name}</span>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <label class="toggle">
                        <input type="checkbox" class="vis-toggle" ${item.is_visible ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <svg viewBox="0 0 24 24" width="20" height="20" style="opacity: 0.3;"><path fill="currentColor" d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                </div>
            `;
            list.appendChild(div);
        });

        new Sortable(list, { animation: 150 });
    }

    window.saveLayout = async function() {
        const items = document.querySelectorAll('.sortable-item');
        const layout = [];
        items.forEach((item, index) => {
            layout.push({
                id: item.getAttribute('data-id'),
                position: index + 1,
                is_visible: item.querySelector('.vis-toggle').checked
            });
        });

        for (const row of layout) {
            await supabaseClient.from('page_layout').update({ position: row.position, is_visible: row.is_visible }).eq('id', row.id);
        }
        alert("Layout saved! Open main site to see changes.");
    };

    /* ==========================
       5. SETTINGS HELPERS
       ========================== */
    async function bulkGet(keys) {
        const { data } = await supabaseClient.from('site_settings').select('*').in('key', keys);
        const map = {};
        (data || []).forEach(r => map[r.key] = r.value);
        return map;
    }

    async function bulkSet(obj) {
        const rows = Object.entries(obj).map(([key, value]) => ({ key, value: String(value) }));
        return supabaseClient.from('site_settings').upsert(rows);
    }

    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
    const getVal = (id) => document.getElementById(id).value;

    /* ==========================
       6. NAVBAR & HERO
       ========================== */
    async function loadNavbar() {
        const s = await bulkGet(['nav_logo_text', 'nav_btn_text', 'nav_btn_color']);
        setVal('nav-logo-text', s.nav_logo_text || 'AVS MAHIM');
        setVal('nav-btn-text', s.nav_btn_text || 'SIGN UP');
        setVal('nav-btn-color', s.nav_btn_color || '#ffd700');
    }

    window.saveNavbar = async function() {
        await bulkSet({
            nav_logo_text: getVal('nav-logo-text'),
            nav_btn_text: getVal('nav-btn-text'),
            nav_btn_color: getVal('nav-btn-color')
        });
        alert("Navbar settings saved!");
    };

    async function loadHero() {
        const s = await bulkGet(['hero_title', 'hero_subtitle', 'hero_bg', 'hero_btn_text', 'hero_btn_link']);
        setVal('hero-title', s.hero_title || '');
        setVal('hero-subtitle', s.hero_subtitle || '');
        setVal('hero-bg', s.hero_bg || '');
        setVal('hero-btn-text', s.hero_btn_text || '');
        setVal('hero-btn-link', s.hero_btn_link || '');
    }

    window.saveHero = async function() {
        await bulkSet({
            hero_title: getVal('hero-title'),
            hero_subtitle: getVal('hero-subtitle'),
            hero_bg: getVal('hero-bg'),
            hero_btn_text: getVal('hero-btn-text'),
            hero_btn_link: getVal('hero-btn-link')
        });
        alert("Hero settings saved!");
    };

    /* ==========================
       7. CRUD TABLES (Plugins, SFX, etc)
       ========================== */
    async function loadTable(table) {
        const body = document.getElementById(`${table}-table`);
        body.innerHTML = "<tr><td colspan='5'>Loading...</td></tr>";
        const { data } = await supabaseClient.from(table).select('*').order('created_at', { ascending: false });
        
        body.innerHTML = (data || []).map(item => `
            <tr>
                ${item.image_url ? `<td><img src="${item.image_url}" class="row-image"></td>` : table === 'sfx' ? '' : '<td>—</td>'}
                <td><strong>${item.title}</strong></td>
                ${table !== 'posts' && table !== 'apps' ? `<td><span class="badge ${item.is_premium ? 'badge-premium' : 'badge-free'}">${item.is_premium ? 'Premium' : 'Free'}</span></td>` : ''}
                ${table !== 'posts' && table !== 'apps' ? `<td>$${item.price || 0}</td>` : table === 'apps' ? `<td>${(item.description || '').substring(0,30)}...</td>` : ''}
                ${table === 'posts' ? `<td>${item.status}</td>` : ''}
                <td>
                    <button class="btn btn-primary btn-small" onclick="window.editItem('${table}', '${item.id}')">Edit</button>
                    <button class="btn btn-danger btn-small" onclick="window.deleteItem('${table}', '${item.id}')">Del</button>
                </td>
            </tr>
        `).join('');
    }

    window.deleteItem = async function(table, id) {
        if (!confirm("Delete this item permanently?")) return;
        await supabaseClient.from(table).delete().eq('id', id);
        loadTable(table);
    };

    window.openModal = function(type, id = null) {
        const modal = document.getElementById('item-modal');
        const form = document.getElementById('item-form');
        const fields = document.getElementById('form-fields');
        document.getElementById('modal-title').innerText = (id ? 'Edit ' : 'Add ') + type.toUpperCase();
        document.getElementById('item-id').value = id || '';
        document.getElementById('item-type-hidden').value = type;

        let html = `
            <div class="form-group"><label class="form-label">Title</label><input type="text" name="title" class="input" required></div>
            <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="input" rows="2"></textarea></div>
        `;

        if (type !== 'post' && type !== 'app') {
            html += `
                <div class="form-group"><label class="form-label">Price</label><input type="number" name="price" step="0.01" class="input" value="0"></div>
                <div class="form-group">
                    <label class="form-label">Type</label>
                    <select name="is_premium" class="input">
                        <option value="false">Free</option>
                        <option value="true">Premium</option>
                    </select>
                </div>
            `;
        }

        if (type === 'plugin' || type === 'preset') {
            html += `<div class="form-group"><label class="form-label">Image URL</label><input type="text" name="image_url" class="input"></div>`;
            html += `<div class="form-group"><label class="form-label">File URL</label><input type="text" name="file_url" class="input"></div>`;
        } else if (type === 'sfx') {
            html += `<div class="form-group"><label class="form-label">Audio URL</label><input type="text" name="audio_url" class="input"></div>`;
        } else if (type === 'app') {
            html += `<div class="form-group"><label class="form-label">Image URL</label><input type="text" name="image_url" class="input"></div>`;
            html += `<div class="form-group"><label class="form-label">Download URL</label><input type="text" name="download_url" class="input"></div>`;
        } else if (type === 'post') {
            html += `<div class="form-group"><label class="form-label">Image URL</label><input type="text" name="image_url" class="input"></div>`;
            html += `
                <div class="form-group">
                    <label class="form-label">Status</label>
                    <select name="status" class="input"><option value="published">Published</option><option value="draft">Draft</option></select>
                </div>
            `;
        }

        fields.innerHTML = html;
        modal.style.display = 'flex';
    };

    window.editItem = async function(table, id) {
        const displayType = table.endsWith('s') ? table.slice(0, -1) : table; 
        openModal(displayType, id);
        const { data } = await supabaseClient.from(table).select('*').eq('id', id).single();
        const form = document.getElementById('item-form');
        for (const key in data) {
            const input = form.querySelector(`[name="${key}"]`);
            if (input) input.value = data[key];
        }
    };

    document.getElementById('item-form').onsubmit = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = Object.fromEntries(formData.entries());
        const type = document.getElementById('item-type-hidden').value;
        const table = type + (type === 'sfx' ? '' : 's'); 
        const id = document.getElementById('item-id').value;

        if (payload.is_premium) payload.is_premium = payload.is_premium === 'true';

        const { error } = id 
            ? await supabaseClient.from(table).update(payload).eq('id', id)
            : await supabaseClient.from(table).insert([payload]);

        if (error) alert(error.message);
        else {
            closeModal();
            loadTable(table);
        }
    };

    window.closeModal = () => document.getElementById('item-modal').style.display = 'none';

    /* ==========================
       8. USER MANAGER
       ========================== */
    async function loadUsers() {
        const body = document.getElementById('users-table');
        const search = getVal('user-search').toLowerCase();
        let query = supabaseClient.from('profiles').select('*').order('created_at', { ascending: false });
        if (search) query = query.ilike('email', `%${search}%`);
        
        const { data } = await query;
        body.innerHTML = (data || []).map(u => `
            <tr>
                <td>${u.name || 'User'}</td>
                <td>${u.email}</td>
                <td>
                    <label class="toggle">
                        <input type="checkbox" onchange="toggleAdminStatus('${u.id}', this.checked)" ${u.is_admin ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </td>
                <td>${new Date(u.created_at).toLocaleDateString()}</td>
                <td><button class="btn btn-danger btn-small" onclick="deleteUser('${u.id}')">Delete</button></td>
            </tr>
        `).join('');
    }

    window.toggleAdminStatus = async (id, status) => {
        await supabaseClient.from('profiles').update({ is_admin: status }).eq('id', id);
    };

    window.deleteUser = async (id) => {
        if (!confirm("Delete user profile?")) return;
        await supabaseClient.from('profiles').delete().eq('id', id);
        loadUsers();
    };

    /* ==========================
       9. MEDIA LIBRARY
       ========================== */
    async function loadMedia() {
        const grid = document.getElementById('media-grid');
        grid.innerHTML = "Loading...";
        const { data } = await supabaseClient.storage.from(BUCKET_NAME).list('', { limit: 100 });
        
        grid.innerHTML = (data || []).filter(f => f.name !== '.emptyFolderPlaceholder').map(file => {
            const url = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(file.name).data.publicUrl;
            return `
                <div class="media-item">
                    <img src="${url}">
                    <div class="media-overlay">
                        <button class="btn btn-primary btn-small" onclick="copyUrl('${url}')">URL</button>
                        <button class="btn btn-danger btn-small" onclick="deleteMedia('${file.name}')">DEL</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.copyUrl = (url) => { navigator.clipboard.writeText(url); alert("URL Copied!"); };

    window.deleteMedia = async (name) => {
        if (!confirm("Delete media?")) return;
        await supabaseClient.storage.from(BUCKET_NAME).remove([name]);
        loadMedia();
    };

    window.uploadMedia = async (file) => {
        if (!file) return;
        const name = `${Date.now()}_${file.name}`;
        const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(name, file);
        if (error) alert(error.message);
        else loadMedia();
    };

    /* ==========================
       10. THEME & SETTINGS
       ========================== */
    async function loadTheme() {
        const s = await bulkGet(['color_primary', 'color_bg', 'color_text']);
        setVal('color-primary', s.color_primary || '#ffd700');
        setVal('color-bg', s.color_bg || '#030609');
        setVal('color-text', s.color_text || '#ffffff');
    }

    window.saveTheme = async function() {
        await bulkSet({
            color_primary: getVal('color-primary'),
            color_bg: getVal('color-bg'),
            color_text: getVal('color-text')
        });
        alert("Theme saved!");
    };

    async function loadSettings() {
        const s = await bulkGet(['site_title', 'site_desc', 'site_favicon', 'maintenance_mode']);
        setVal('site-title', s.site_title || '');
        setVal('site-desc', s.site_desc || '');
        setVal('site-favicon', s.site_favicon || '');
        document.getElementById('site-maintenance').checked = s.maintenance_mode === 'true';
    }

    window.saveSettings = async function() {
        await bulkSet({
            site_title: getVal('site-title'),
            site_desc: getVal('site-desc'),
            site_favicon: getVal('site-favicon'),
            maintenance_mode: document.getElementById('site-maintenance').checked
        });
        alert("General settings saved!");
    };

    /* ==========================
       INIT
       ========================== */
    function initApp() {
        loadDashboard();
    }

    checkSession();

})();
