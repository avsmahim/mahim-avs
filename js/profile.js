document.addEventListener('DOMContentLoaded', async () => {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.error('Supabase client not initialized.');
        return;
    }

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error || !session) {
        // Redirect if not logged in
        window.location.href = 'index.html';
        return;
    }

    const user = session.user;

    // DOM Elements
    const form = document.getElementById('profile-form');
    const btnSave = document.getElementById('prof-save-btn');
    const msg = document.getElementById('prof-msg');
    const banner = document.getElementById('profile-warning-banner');
    const progressFill = document.getElementById('profile-progress-fill');
    const progressText = document.getElementById('profile-progress-text');

    const elName = document.getElementById('prof-name');
    const elEmail = document.getElementById('prof-email');
    const elUsername = document.getElementById('prof-username');
    const elPhone = document.getElementById('prof-phone');
    const elDob = document.getElementById('prof-dob');
    const elGender = document.getElementById('prof-gender');
    const elCountry = document.getElementById('prof-country');
    const elWebsite = document.getElementById('prof-website');
    const elBio = document.getElementById('prof-bio');
    const elAvatarUpload = document.getElementById('avatar-upload');
    const elAvatarPreview = document.getElementById('avatar-preview');

    let currentAvatarUrl = null;
    let hasImageToUpload = false;
    let fileToUpload = null;

    // Initial bindings
    elEmail.value = user.email;
    elName.value = user.user_metadata?.full_name || '';

    // Calculate Completeness
    const checkCompletion = () => {
        let total = 9; // Name, Email, Username, Phone, DOB, Gender, Country, Website, Bio
        let filled = 0;

        if (elName.value.trim()) filled++;
        if (elEmail.value.trim()) filled++;
        if (elUsername.value.trim()) filled++;
        if (elPhone.value.trim()) filled++;
        if (elDob.value.trim()) filled++;
        if (elGender.value.trim()) filled++;
        if (elCountry.value.trim()) filled++;
        if (elWebsite.value.trim()) filled++;
        if (elBio.value.trim()) filled++;

        // Photo is an extra requirement
        if (currentAvatarUrl || hasImageToUpload) filled++;
        total++;

        const percent = Math.round((filled / total) * 100);
        progressFill.style.width = percent + '%';
        progressText.innerText = percent + '% Complete';

        if (percent < 100) {
            banner.style.display = 'flex';
        } else {
            banner.style.display = 'none';
        }

        // Required fields check to enable save
        const nameValid = elName.value.trim() !== '';
        const photoValid = (currentAvatarUrl !== null || hasImageToUpload);
        if (nameValid && photoValid) {
            btnSave.disabled = false;
        } else {
            btnSave.disabled = true;
        }
    };

    // Fetch Existing Data
    try {
        const { data: prof, error: profErr } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (prof) {
            if (prof.name) elName.value = prof.name;
            if (prof.username) elUsername.value = prof.username;
            if (prof.phone) elPhone.value = prof.phone;
            if (prof.dob) elDob.value = prof.dob;
            if (prof.gender) elGender.value = prof.gender;
            if (prof.country) elCountry.value = prof.country;
            if (prof.website) elWebsite.value = prof.website;
            if (prof.bio) elBio.value = prof.bio;
            if (prof.avatar_url) {
                currentAvatarUrl = prof.avatar_url;
                elAvatarPreview.src = currentAvatarUrl;
            }
        }
        checkCompletion();
    } catch (e) { console.error('Error fetching profile:', e); }

    // Avatar Selection
    elAvatarUpload.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            fileToUpload = e.target.files[0];
            hasImageToUpload = true;
            const reader = new FileReader();
            reader.onload = function (evt) {
                elAvatarPreview.src = evt.target.result;
            };
            reader.readAsDataURL(fileToUpload);
            checkCompletion();
        }
    });

    // Watch input changes for completion bar
    const inputs = [elName, elUsername, elPhone, elDob, elGender, elCountry, elWebsite, elBio];
    inputs.forEach(inp => {
        inp.addEventListener('input', checkCompletion);
        inp.addEventListener('change', checkCompletion);
    });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        btnSave.disabled = true;
        btnSave.innerText = 'SAVING...';
        msg.innerText = '';
        msg.style.color = '';

        try {
            // 1. Upload new image if exists
            if (hasImageToUpload && fileToUpload) {
                const fileExt = fileToUpload.name.split('.').pop();
                const fileName = `${user.id}_${Math.random()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabaseClient.storage
                    .from('avatars')
                    .upload(filePath, fileToUpload, { upsert: true });

                if (uploadError) throw uploadError;

                // Get public URL
                const { data: publicUrlData } = supabaseClient.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                currentAvatarUrl = publicUrlData.publicUrl;
                hasImageToUpload = false;
                fileToUpload = null;
            }

            // 2. Save payload
            const payload = {
                id: user.id,
                name: elName.value.trim(),
                email: user.email,
                username: elUsername.value.trim(),
                phone: elPhone.value.trim(),
                dob: elDob.value || null,
                gender: elGender.value,
                country: elCountry.value.trim(),
                website: elWebsite.value.trim(),
                bio: elBio.value.trim(),
                avatar_url: currentAvatarUrl
            };

            const { error: upsertError } = await supabaseClient.from('profiles').upsert(payload);
            if (upsertError) throw upsertError;

            // Also try to update user metadata full_name
            await supabaseClient.auth.updateUser({
                data: { full_name: elName.value.trim() }
            });

            msg.innerText = 'Profile saved successfully!';
            msg.style.color = '#0f0';
            checkCompletion();

            // Give navbar time to update or force reload
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            console.error(err);
            msg.innerText = err.message || 'An error occurred while saving.';
            msg.style.color = '#f00';
            btnSave.disabled = false;
        }

        btnSave.innerText = 'SAVE PROFILE';
    });

});
