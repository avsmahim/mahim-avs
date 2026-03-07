document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) return;

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        window.location.href = 'index.html';
        return;
    }

    const user = session.user;
    const username = user.user_metadata?.full_name || user.email.split('@')[0];
    document.getElementById('dash-welcome').innerText = `Hi ${username}!`;

    const statDate = document.getElementById('stat-date');
    const statProgress = document.getElementById('stat-progress');
    const statFill = document.getElementById('stat-fill');
    const downloadsList = document.getElementById('downloads-list');
    const purchasesList = document.getElementById('purchases-list');

    // Load Profile Stats
    try {
        const { data: prof } = await supabaseClient.from('profiles').select('*').eq('id', user.id).single();
        if (prof) {
            statDate.innerText = new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            let total = 10;
            let filled = 0;
            if (prof.name) filled++;
            if (prof.email) filled++;
            if (prof.username) filled++;
            if (prof.phone) filled++;
            if (prof.dob) filled++;
            if (prof.gender) filled++;
            if (prof.country) filled++;
            if (prof.website) filled++;
            if (prof.bio) filled++;
            if (prof.avatar_url) filled++;

            const percent = Math.round((filled / total) * 100);
            statProgress.innerText = percent + '%';
            statFill.style.width = percent + '%';
        }
    } catch (err) { console.error('Error fetching stats', err); }

    // Load My Downloads (Placeholder since we don't have a user_downloads table yet)
    downloadsList.innerHTML = `<div class="dash-list-item"><h4>Cinematic LUTs Pack (Free)</h4><span>Downloaded 2 days ago</span></div><div class="dash-list-item"><h4>Impact SFX Demo</h4><span>Downloaded 1 week ago</span></div><div style="margin-top: 10px; font-size:0.8rem;"><a style="color:var(--btn-color); text-decoration:none;" href="index.html#resources">Browse More</a></div>`;

    // Load My Purchases 
    try {
        const { data: purc } = await supabaseClient.from('purchases').select('id, created_at, item_id, status').eq('user_id', user.id);
        if (purc && purc.length > 0) {
            let html = '';
            purc.forEach(p => {
                if (p.status === 'completed') {
                    html += `<div class="dash-list-item"><h4>Order #${p.id.split('-')[0].toUpperCase()}</h4><span>${new Date(p.created_at).toLocaleDateString()}</span></div>`;
                }
            });
            purchasesList.innerHTML = html || '<p style="opacity:0.5;">No successful purchases yet.</p>';
        } else {
            purchasesList.innerHTML = '<p style="opacity:0.5;">No purchases yet.</p>';
        }
    } catch (err) {
        purchasesList.innerHTML = '<p style="opacity:0.5;">No purchases yet.</p>';
    }

    // Settings
    const resetBtn = document.getElementById('dash-reset-pwd');
    const deleteBtn = document.getElementById('dash-delete-acc');
    const settingsMsg = document.getElementById('settings-msg');

    resetBtn.addEventListener('click', async () => {
        resetBtn.disabled = true;
        const { error } = await supabaseClient.auth.resetPasswordForEmail(user.email, {
            redirectTo: window.location.href, // This will bounce them back with a token
        });
        if (error) {
            settingsMsg.innerText = error.message;
            settingsMsg.style.color = '#f00';
        } else {
            settingsMsg.innerText = 'Password reset link sent to your email!';
            settingsMsg.style.color = '#0f0';
        }
        resetBtn.disabled = false;
    });

    deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
            settingsMsg.innerText = 'Account deletion not implemented in this demo.';
            settingsMsg.style.color = '#f00';
        }
    });
});
