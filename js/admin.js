(function () {
    const PASSWORD = 'admin123'; // Hardcoded password requirement
    const BUCKET_NAME = 'downloads'; // Ensure this bucket exists in Supabase Storage

    // Login UI Logic
    const overlay = document.getElementById('admin-login-overlay');
    const passInput = document.getElementById('admin-password');
    const loginBtn = document.getElementById('admin-login-btn');
    const errorMsg = document.getElementById('admin-error');
    const logoutBtn = document.getElementById('admin-logout');

    // Check session storage
    if (sessionStorage.getItem('admin_auth') === 'true') {
        overlay.style.display = 'none';
        initAdminPanel();
    }

    function handleLogin() {
        if (passInput.value === PASSWORD) {
            sessionStorage.setItem('admin_auth', 'true');
            overlay.style.display = 'none';
            initAdminPanel();
        } else {
            errorMsg.style.display = 'block';
        }
    }

    loginBtn.addEventListener('click', handleLogin);
    passInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sessionStorage.removeItem('admin_auth');
        location.reload();
    });

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const adminSections = document.querySelectorAll('.admin-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            adminSections.forEach(s => s.classList.remove('active'));

            item.classList.add('active');
            const target = item.getAttribute('data-target');
            document.getElementById(`section-${target}`).classList.add('active');

            // Load data based on section
            if (target === 'dashboard') loadDashboardStats();
            if (target === 'items') loadItems();
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


    /* ==========================
       ITEMS MANAGER
       ========================== */
    const itemForm = document.getElementById('item-form');
    const itemsTableBody = document.getElementById('items-table-body');
    const itemFormMsg = document.getElementById('item-form-msg');
    const itemFormTitle = document.getElementById('item-form-title');
    const cancelItemBtn = document.getElementById('cancel-item-btn');

    let editingItemId = null;

    async function loadItems() {
        if (!supabaseClient) return;
        itemsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; opacity:0.5;">Loading items...</td></tr>`;

        const filterCategory = document.getElementById('filter-category').value;
        const filterType = document.getElementById('filter-type').value;

        let query = supabaseClient.from('items').select('*').order('created_at', { ascending: false });

        if (filterCategory !== 'all') query = query.eq('category', filterCategory);
        if (filterType !== 'all') query = query.eq('type', filterType);

        const { data, error } = await query;

        if (error) {
            itemsTableBody.innerHTML = `<tr><td colspan="5" style="color:#ff4d4d">Error loading items: ${error.message}</td></tr>`;
            return;
        }

        itemsTableBody.innerHTML = '';
        if (data.length === 0) {
            itemsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; opacity:0.5;">No items found.</td></tr>`;
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600;">${item.title}</div>
                    ${item.version ? `<div style="font-size: 0.8rem; color: var(--admin-text-muted);">v${item.version} | ${item.size || ''}</div>` : ''}
                </td>
                <td>
                    <span class="badge badge-category">${item.category}</span>
                    <span class="badge ${item.type === 'premium' ? 'badge-premium' : 'badge-free'}">${item.type}</span>
                </td>
                <td>$${item.price}</td>
                <td>${item.download_count || 0}</td>
                <td>
                    <button class="btn-action btn-edit" data-item='${JSON.stringify(item).replace(/'/g, "&#39;")}'>Edit</button>
                    <button class="btn-action btn-delete" data-id="${item.id}">Del</button>
                </td>
            `;
            itemsTableBody.appendChild(tr);
        });

        // Attach events
        document.querySelectorAll('#items-table-body .btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = JSON.parse(e.target.getAttribute('data-item'));
                editItem(item);
            });
        });

        document.querySelectorAll('#items-table-body .btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this item?')) {
                    await supabaseClient.from('items').delete().eq('id', id);
                    loadItems();
                    loadDashboardStats();
                }
            });
        });
    }

    // Filters event listeners
    document.getElementById('filter-category').addEventListener('change', loadItems);
    document.getElementById('filter-type').addEventListener('change', loadItems);

    function editItem(item) {
        editingItemId = item.id;
        itemFormTitle.innerText = "Edit Item: " + item.title;
        cancelItemBtn.style.display = 'inline-block';

        document.getElementById('item-title').value = item.title || '';
        document.getElementById('item-category').value = item.category || 'plugins';
        document.getElementById('item-type').value = item.type || 'free';
        document.getElementById('item-price').value = item.price || 0;

        document.getElementById('item-file-url').value = item.file_url || '';
        document.getElementById('item-thumbnail-url').value = item.thumbnail_url || '';

        document.getElementById('item-size').value = item.size || '';
        document.getElementById('item-version').value = item.version || '';

        document.getElementById('item-title').focus();
        document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
    }

    cancelItemBtn.addEventListener('click', () => {
        editingItemId = null;
        itemFormTitle.innerText = "Add New Resource";
        cancelItemBtn.style.display = 'none';
        itemForm.reset();
    });

    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        itemFormMsg.style.color = 'var(--admin-text-muted)';
        itemFormMsg.innerText = 'Saving...';

        const saveBtn = document.getElementById('save-item-btn');
        saveBtn.disabled = true;

        try {
            const payload = {
                title: document.getElementById('item-title').value,
                category: document.getElementById('item-category').value,
                type: document.getElementById('item-type').value,
                price: parseFloat(document.getElementById('item-price').value) || 0,
                file_url: document.getElementById('item-file-url').value,
                thumbnail_url: document.getElementById('item-thumbnail-url').value,
                size: document.getElementById('item-size').value,
                version: document.getElementById('item-version').value
            };

            if (editingItemId) {
                const { error } = await supabaseClient.from('items').update(payload).eq('id', editingItemId);
                if (error) throw error;
            } else {
                const { error } = await supabaseClient.from('items').insert([payload]);
                if (error) throw error;
            }

            itemFormMsg.style.color = '#4dff91';
            itemFormMsg.innerText = 'Item saved successfully!';

            cancelItemBtn.click(); // Reset form and mode
            loadItems();
            loadDashboardStats();

            setTimeout(() => itemFormMsg.innerText = '', 3000);

        } catch (err) {
            console.error(err);
            itemFormMsg.style.color = '#ff4d4d';
            itemFormMsg.innerText = 'Error: ' + err.message;
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

})();
