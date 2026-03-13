(function () {
    const PASSWORD = 'admin123'; // Hardcoded password requirement
    const BUCKET_NAME = 'downloads'; // Ensure this bucket exists in Supabase Storage

    // Login UI Logic
    const overlay = document.getElementById('admin-login-overlay');
    const emailInput = document.getElementById('admin-email');
    const passInput = document.getElementById('admin-password');
    const loginBtn = document.getElementById('admin-login-btn');
    const errorMsg = document.getElementById('admin-error');
    const logoutBtn = document.getElementById('admin-logout');

    // Check session
    async function checkAdminSession() {
        if (!supabaseClient) return;
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            verifyAdminAccess(session.user.id);
        } else {
            overlay.style.display = 'flex'; // Show login
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

        const email = emailInput ? emailInput.value : passInput.value; // Fallback if no email field yet
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
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    if (emailInput) {
        emailInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') passInput.focus();
        });
    }

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await supabaseClient.auth.signOut();
        location.reload();
    });

    // Initialize session check after Supabase loads (using a small delay to ensure client is ready)
    setTimeout(checkAdminSession, 500);

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const adminSections = document.querySelectorAll('.admin-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            adminSections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const target = item.getAttribute('data-target');
            // Try both naming conventions: section-{target} is the pattern
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
        });
    });


    // Main Init
    function initAdminPanel() {
        if (!supabaseClient) {
            alert('Supabase client not initialized. Check console for errors.');
            return;
        }
        loadDashboardStats();
        // Initialize the blog editor
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
            // Count Items
            const { count: itemsCount, error: itemsError } = await supabaseClient.from('items').select('*', { count: 'exact', head: true });
            if (!itemsError) document.getElementById('stat-items').innerText = itemsCount;

            // Count Downloads
            const { data: itemsData, error: dError } = await supabaseClient.from('items').select('download_count, price');
            if (!dError && itemsData) {
                const totalDownloads = itemsData.reduce((acc, curr) => acc + (curr.download_count || 0), 0);
                document.getElementById('stat-downloads').innerText = totalDownloads;
            }

            // Count Orders & Revenue
            const { data: purchasesData, error: pError } = await supabaseClient.from('purchases').select('id, items(price)');
            if (!pError && purchasesData) {
                let revenue = 0;
                purchasesData.forEach(p => {
                    if (p.items && p.items.price) revenue += parseFloat(p.items.price);
                });
                document.getElementById('stat-revenue').innerText = `$${revenue.toFixed(2)}`;
            }

            // Count Users (if possible, fallback to 0 if RLS prevents)
            let usersCount = 0;
            const { count, error: uError } = await supabaseClient.from('profiles').select('*', { count: 'exact', head: true });
            if (!uError) usersCount = count;
            if (!uError) document.getElementById('stat-users').innerText = usersCount || 'Protected';

        } catch (e) {
            console.error('Error loading stats:', e);
        }
    }

    // Generic helper for CRUD tables
    function createRowHTML(item, typeClass) {
        return `
            <tr>
                <td><div style="font-weight: 600;">${item.title}</div></td>
                <td><span class="badge ${item.type === 'premium' ? 'badge-premium' : 'badge-free'}">${item.type || (item.is_premium ? 'premium' : 'free')}</span></td>
                <td>$${item.price || 0}</td>
                <td>
                    <button class="btn-action btn-edit" data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>Edit</button>
                    <button class="btn-action btn-delete" data-id="${item.id}">Del</button>
                </td>
            </tr>
        `;
    }


    /* ==========================
       PLUGINS MANAGER
       ========================== */
    const pluginForm = document.getElementById('plugin-form');
    const pluginsTableBody = document.getElementById('plugins-table-body');
    const pluginFormMsg = document.getElementById('plugin-form-msg');
    const pluginFormTitle = document.getElementById('plugin-form-title');
    const cancelPluginBtn = document.getElementById('cancel-plugin-btn');
    let editingPluginId = null;

    async function loadPlugins() {
        if (!supabaseClient) return;
        pluginsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity:0.5;">Loading plugins...</td></tr>`;
        const { data, error } = await supabaseClient.from('plugins').select('*').order('created_at', { ascending: false });

        if (error) { pluginsTableBody.innerHTML = `<tr><td colspan="4" style="color:#ff4d4d">Error: ${error.message}</td></tr>`; return; }
        if (!data || data.length === 0) { pluginsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity:0.5;">No plugins found.</td></tr>`; return; }

        pluginsTableBody.innerHTML = data.map(item => createRowHTML(item, 'plugins')).join('');
        
        pluginsTableBody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => editPlugin(JSON.parse(e.target.getAttribute('data-item')))));
        pluginsTableBody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async (e) => {
            if (confirm('Are you sure you want to delete this plugin?')) {
                await supabaseClient.from('plugins').delete().eq('id', e.target.getAttribute('data-id'));
                loadPlugins(); loadDashboardStats();
            }
        }));
    }

    function editPlugin(item) {
        editingPluginId = item.id;
        pluginFormTitle.innerText = "Edit Plugin: " + item.title;
        cancelPluginBtn.style.display = 'inline-block';
        document.getElementById('plugin-title').value = item.title || '';
        document.getElementById('plugin-type').value = item.is_premium ? 'premium' : 'free';
        document.getElementById('plugin-price').value = item.price || 0;
        document.getElementById('plugin-file-url').value = item.file_url || '';
        document.getElementById('plugin-image-url').value = item.image_url || '';
        document.getElementById('plugin-desc').value = item.description || '';
        document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelPluginBtn.addEventListener('click', () => {
        editingPluginId = null;
        pluginFormTitle.innerText = "Add New Plugin";
        cancelPluginBtn.style.display = 'none';
        pluginForm.reset();
    });

    pluginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        pluginFormMsg.style.color = 'var(--admin-text-muted)'; pluginFormMsg.innerText = 'Saving...';
        const saveBtn = document.getElementById('save-plugin-btn'); saveBtn.disabled = true;

        const payload = {
            title: document.getElementById('plugin-title').value,
            is_premium: document.getElementById('plugin-type').value === 'premium',
            price: parseFloat(document.getElementById('plugin-price').value) || 0,
            file_url: document.getElementById('plugin-file-url').value,
            image_url: document.getElementById('plugin-image-url').value,
            description: document.getElementById('plugin-desc').value || null
        };

        try {
            if (editingPluginId) {
                const { error } = await supabaseClient.from('plugins').update(payload).eq('id', editingPluginId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('plugins').insert([payload]);
                if (error) throw error;
            }
            pluginFormMsg.style.color = '#4caf50'; pluginFormMsg.innerText = 'Saved successfully!';
            cancelPluginBtn.click(); loadPlugins(); loadDashboardStats();
        } catch (err) {
            pluginFormMsg.style.color = '#ff4d4d'; pluginFormMsg.innerText = 'Error: ' + err.message;
        } finally {
            saveBtn.disabled = false;
        }
    });

    /* ==========================
       SFX MANAGER
       ========================== */
    const sfxForm = document.getElementById('sfx-form');
    const sfxTableBody = document.getElementById('sfx-table-body');
    const sfxFormMsg = document.getElementById('sfx-form-msg');
    const sfxFormTitle = document.getElementById('sfx-form-title');
    const cancelSfxBtn = document.getElementById('cancel-sfx-btn');
    let editingSfxId = null;

    async function loadSFX() {
        if (!supabaseClient) return;
        sfxTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity:0.5;">Loading SFX...</td></tr>`;
        const { data, error } = await supabaseClient.from('sfx').select('*').order('created_at', { ascending: false });

        if (error) { sfxTableBody.innerHTML = `<tr><td colspan="4" style="color:#ff4d4d">Error: ${error.message}</td></tr>`; return; }
        if (!data || data.length === 0) { sfxTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity:0.5;">No SFX found.</td></tr>`; return; }

        sfxTableBody.innerHTML = data.map(item => createRowHTML(item, 'sfx')).join('');
        
        sfxTableBody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => editSFX(JSON.parse(e.target.getAttribute('data-item')))));
        sfxTableBody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async (e) => {
            if (confirm('Are you sure you want to delete this SFX?')) {
                await supabaseClient.from('sfx').delete().eq('id', e.target.getAttribute('data-id'));
                loadSFX(); loadDashboardStats();
            }
        }));
    }

    function editSFX(item) {
        editingSfxId = item.id;
        sfxFormTitle.innerText = "Edit SFX: " + item.title;
        cancelSfxBtn.style.display = 'inline-block';
        document.getElementById('sfx-title').value = item.title || '';
        document.getElementById('sfx-type').value = item.is_premium ? 'premium' : 'free';
        document.getElementById('sfx-price').value = item.price || 0;
        document.getElementById('sfx-audio-url').value = item.audio_url || '';
        document.getElementById('sfx-file-url').value = item.file_url || '';
        document.getElementById('sfx-image-url').value = item.image_url || '';
        document.getElementById('sfx-desc').value = item.description || '';
        document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelSfxBtn.addEventListener('click', () => {
        editingSfxId = null;
        sfxFormTitle.innerText = "Add New SFX";
        cancelSfxBtn.style.display = 'none';
        sfxForm.reset();
    });

    sfxForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        sfxFormMsg.style.color = 'var(--admin-text-muted)'; sfxFormMsg.innerText = 'Saving...';
        const saveBtn = document.getElementById('save-sfx-btn'); saveBtn.disabled = true;

        const payload = {
            title: document.getElementById('sfx-title').value,
            is_premium: document.getElementById('sfx-type').value === 'premium',
            price: parseFloat(document.getElementById('sfx-price').value) || 0,
            audio_url: document.getElementById('sfx-audio-url').value,
            file_url: document.getElementById('sfx-file-url').value,
            image_url: document.getElementById('sfx-image-url').value,
            description: document.getElementById('sfx-desc').value || null
        };

        try {
            if (editingSfxId) {
                const { error } = await supabaseClient.from('sfx').update(payload).eq('id', editingSfxId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('sfx').insert([payload]);
                if (error) throw error;
            }
            sfxFormMsg.style.color = '#4caf50'; sfxFormMsg.innerText = 'Saved successfully!';
            cancelSfxBtn.click(); loadSFX(); loadDashboardStats();
        } catch (err) {
            sfxFormMsg.style.color = '#ff4d4d'; sfxFormMsg.innerText = 'Error: ' + err.message;
        } finally {
            saveBtn.disabled = false;
        }
    });

    /* ==========================
       PRESETS MANAGER
       ========================== */
    const presetForm = document.getElementById('preset-form');
    const presetsTableBody = document.getElementById('presets-table-body');
    const presetFormMsg = document.getElementById('preset-form-msg');
    const presetFormTitle = document.getElementById('preset-form-title');
    const cancelPresetBtn = document.getElementById('cancel-preset-btn');
    let editingPresetId = null;

    async function loadPresets() {
        if (!supabaseClient) return;
        presetsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity:0.5;">Loading presets...</td></tr>`;
        const { data, error } = await supabaseClient.from('presets').select('*').order('created_at', { ascending: false });

        if (error) { presetsTableBody.innerHTML = `<tr><td colspan="4" style="color:#ff4d4d">Error: ${error.message}</td></tr>`; return; }
        if (!data || data.length === 0) { presetsTableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; opacity:0.5;">No presets found.</td></tr>`; return; }

        presetsTableBody.innerHTML = data.map(item => createRowHTML(item, 'presets')).join('');
        
        presetsTableBody.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => editPreset(JSON.parse(e.target.getAttribute('data-item')))));
        presetsTableBody.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', async (e) => {
            if (confirm('Are you sure you want to delete this preset?')) {
                await supabaseClient.from('presets').delete().eq('id', e.target.getAttribute('data-id'));
                loadPresets(); loadDashboardStats();
            }
        }));
    }

    function editPreset(item) {
        editingPresetId = item.id;
        presetFormTitle.innerText = "Edit Preset: " + item.title;
        cancelPresetBtn.style.display = 'inline-block';
        document.getElementById('preset-title').value = item.title || '';
        document.getElementById('preset-type').value = item.is_premium ? 'premium' : 'free';
        document.getElementById('preset-price').value = item.price || 0;
        document.getElementById('preset-file-url').value = item.file_url || '';
        document.getElementById('preset-image-url').value = item.image_url || '';
        document.getElementById('preset-desc').value = item.description || '';
        document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelPresetBtn.addEventListener('click', () => {
        editingPresetId = null;
        presetFormTitle.innerText = "Add New Preset";
        cancelPresetBtn.style.display = 'none';
        presetForm.reset();
    });

    presetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        presetFormMsg.style.color = 'var(--admin-text-muted)'; presetFormMsg.innerText = 'Saving...';
        const saveBtn = document.getElementById('save-preset-btn'); saveBtn.disabled = true;

        const payload = {
            title: document.getElementById('preset-title').value,
            is_premium: document.getElementById('preset-type').value === 'premium',
            price: parseFloat(document.getElementById('preset-price').value) || 0,
            file_url: document.getElementById('preset-file-url').value,
            image_url: document.getElementById('preset-image-url').value,
            description: document.getElementById('preset-desc').value || null
        };

        try {
            if (editingPresetId) {
                const { error } = await supabaseClient.from('presets').update(payload).eq('id', editingPresetId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('presets').insert([payload]);
                if (error) throw error;
            }
            presetFormMsg.style.color = '#4caf50'; presetFormMsg.innerText = 'Saved successfully!';
            cancelPresetBtn.click(); loadPresets(); loadDashboardStats();
        } catch (err) {
            presetFormMsg.style.color = '#ff4d4d'; presetFormMsg.innerText = 'Error: ' + err.message;
        } finally {
            saveBtn.disabled = false;
        }
    });


    /* ==========================
       MEDIA MANAGER
       ========================== */
    const mediaForm = document.getElementById('media-form');
    const mediaGrid = document.getElementById('media-grid');
    const mediaMsg = document.getElementById('media-msg');

    async function loadMedia() {
        if (!supabaseClient) return;
        mediaGrid.innerHTML = '<p style="grid-column: 1/-1;">Loading media files...</p>';

        try {
            const { data, error } = await supabaseClient.storage.from(BUCKET_NAME).list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'created_at', order: 'desc' },
            });

            if (error) throw error;

            mediaGrid.innerHTML = '';
            if (data.length === 0) {
                mediaGrid.innerHTML = '<p style="grid-column: 1/-1; opacity: 0.5;">No files found in storage.</p>';
                return;
            }

            data.forEach(file => {
                // Ignore empty folders
                if (file.name === '.emptyFolderPlaceholder') return;

                const publicUrl = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(file.name).data.publicUrl;

                // Determine icon/thumb based on file type
                let thumbHtml = '';
                const isImage = file.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);

                if (isImage) {
                    thumbHtml = `<img src="${publicUrl}" alt="${file.name}">`;
                } else {
                    thumbHtml = `<div style="height: 80px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); margin-bottom:0.5rem; border-radius:4px;"><svg style="width:40px;height:40px;opacity:0.5" viewBox="0 0 24 24"><path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg></div>`;
                }

                const div = document.createElement('div');
                div.className = 'media-item';
                div.innerHTML = `
                    ${thumbHtml}
                    <div class="media-name" title="${file.name}">${file.name}</div>
                    <button class="btn-action btn-copy" data-url="${publicUrl}" style="width: 100%; margin:0;">Copy URL</button>
                    <button class="btn-action btn-delete mt-2 media-delete-btn" data-name="${file.name}" style="width: 100%; margin:0; margin-top:5px;">Delete</button>
                `;
                mediaGrid.appendChild(div);
            });

            // Copy Listeners
            document.querySelectorAll('.btn-copy').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    navigator.clipboard.writeText(e.target.getAttribute('data-url'));
                    e.target.innerText = 'Copied!';
                    setTimeout(() => e.target.innerText = 'Copy URL', 2000);
                });
            });

            // Delete Listeners
            document.querySelectorAll('.media-delete-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if (confirm('Delete this file permanently?')) {
                        const name = e.target.getAttribute('data-name');
                        await supabaseClient.storage.from(BUCKET_NAME).remove([name]);
                        loadMedia();
                    }
                });
            });

        } catch (err) {
            mediaGrid.innerHTML = `<p style="grid-column: 1/-1; color: #ff4d4d;">Error loading media: ${err.message}</p>`;
        }
    }

    // Expose for refresh button
    window.loadMedia = loadMedia;

    mediaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileInput = document.getElementById('media-file');
        const file = fileInput.files[0];
        if (!file) return;

        mediaMsg.style.color = 'white';
        mediaMsg.innerText = 'Uploading... Please wait.';
        const btn = document.getElementById('upload-media-btn');
        btn.disabled = true;

        try {
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(fileName, file);
            if (error) throw error;

            mediaMsg.style.color = '#4dff91';
            mediaMsg.innerText = 'File uploaded successfully!';
            fileInput.value = '';
            loadMedia();

            setTimeout(() => mediaMsg.innerText = '', 3000);
        } catch (err) {
            mediaMsg.style.color = '#ff4d4d';
            mediaMsg.innerText = 'Upload failed: ' + err.message;
        } finally {
            btn.disabled = false;
        }
    });


    /* ==========================
       POSTS MANAGER
       Blog editor is in blog-editor.js
       ========================== */

    async function loadPosts() {
        const table = document.getElementById('posts-table-body');
        if (!table || !supabaseClient) return;
        const { data, error } = await supabaseClient
            .from('posts')
            .select('id, title, labels, status, published_at')
            .order('published_at', { ascending: false });
        if (error) {
            table.innerHTML = `<tr><td colspan="5" style="color:#ff4d4d">${error.message}</td></tr>`;
            return;
        }
        if (!data || data.length === 0) {
            table.innerHTML = `<tr><td colspan="5" style="text-align:center;opacity:0.5">No posts yet. Click "+ New Post" to create one.</td></tr>`;
            return;
        }
        table.innerHTML = data.map(p => {
            const bg = p.status === 'published' ? '#43a047' : '#888';
            const date = p.published_at ? new Date(p.published_at).toLocaleDateString() : '—';
            const id = (p.id || '').toString().replace(/'/g, '');
            return `<tr>
                <td>${p.title || '—'}</td>
                <td style="font-size:0.8rem;opacity:0.7">${p.labels || '—'}</td>
                <td><span style="padding:2px 8px;border-radius:4px;background:${bg};color:#fff;font-size:0.75rem">${p.status || 'draft'}</span></td>
                <td style="font-size:0.8rem;opacity:0.7">${date}</td>
                <td>
                    <button class="btn-action" onclick="window.editPost('${id}')">Edit</button>
                    <button class="btn-action btn-danger" onclick="window.deletePost('${id}')">Delete</button>
                </td>
            </tr>`;
        }).join('');
    }

    /* ==========================
       USERS MANAGER
       ========================== */
    async function loadUsers() {
        const table = document.getElementById('users-table-body');
        if (!table || !supabaseClient) return;
        table.innerHTML = `<tr><td colspan="4" style="text-align:center;opacity:0.5;">Loading users...</td></tr>`;
        try {
            const { data, error } = await supabaseClient.from('profiles').select('id, name, email, is_admin, created_at').order('created_at', { ascending: false });
            if (error) throw error;
            if (!data || data.length === 0) {
                table.innerHTML = `<tr><td colspan="4" style="text-align:center;opacity:0.5;">No user profiles found.</td></tr>`;
                return;
            }
            table.innerHTML = data.map(u => `
                <tr>
                    <td><strong>${u.name || '—'}</strong><br><span style="font-size:0.7rem;opacity:0.5;">${u.id}</span></td>
                    <td>${u.email || '—'}</td>
                    <td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                        <span style="padding:2px 8px;border-radius:4px;font-size:0.75rem;background:${u.is_admin ? '#ffd700' : 'rgba(255,255,255,0.08)'};color:${u.is_admin ? '#000' : 'inherit'}">${u.is_admin ? 'ADMIN' : 'User'}</span>
                        <button class="btn-action" style="margin-left:0.4rem;" onclick="toggleAdmin('${u.id}', ${u.is_admin})">${u.is_admin ? 'Revoke Admin' : 'Make Admin'}</button>
                    </td>
                </tr>
            `).join('');
        } catch(e) {
            table.innerHTML = `<tr><td colspan="4" style="color:#ff4d4d;">${e.message}</td></tr>`;
        }
    }

    // Toggle admin status
    window.toggleAdmin = async function(userId, currentStatus) {
        if (!confirm(`${currentStatus ? 'Revoke' : 'Grant'} admin access?`)) return;
        const { error } = await supabaseClient.from('profiles').update({ is_admin: !currentStatus }).eq('id', userId);
        if (!error) loadUsers();
    };

    /* ==========================
       ORDERS / SALES
       ========================== */
    async function loadOrders() {
        const table = document.getElementById('orders-table-body');
        if (!table || !supabaseClient) return;
        table.innerHTML = `<tr><td colspan="4" style="text-align:center;opacity:0.5;">Loading orders...</td></tr>`;
        try {
            const { data, error } = await supabaseClient.from('purchases').select('id, user_id, item_id, created_at').order('created_at', { ascending: false }).limit(100);
            if (error) throw error;
            if (!data || data.length === 0) {
                table.innerHTML = `<tr><td colspan="4" style="text-align:center;opacity:0.5;">No orders found.</td></tr>`;
                return;
            }
            table.innerHTML = data.map(o => `
                <tr>
                    <td style="font-size:0.75rem;">${o.id}</td>
                    <td style="font-size:0.75rem;">${o.user_id || '—'}</td>
                    <td style="font-size:0.75rem;">${o.item_id || '—'}</td>
                    <td style="font-size:0.75rem;">${o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                </tr>
            `).join('');
        } catch(e) {
            table.innerHTML = `<tr><td colspan="4" style="color:#ff4d4d;">${e.message}</td></tr>`;
        }
    }

})();

