(function () {
  'use strict';

  const authModal = document.getElementById('auth-modal');
  const navAuthBtn = document.getElementById('nav-auth-btn');
  const authCloseBtn = document.getElementById('auth-close');
  const authTabs = document.querySelectorAll('.auth-tab');
  const authForms = document.querySelectorAll('.auth-form');
  const signinForm = document.getElementById('signin-form');
  const signupForm = document.getElementById('signup-form');
  const signinMsg = document.getElementById('signin-msg');
  const signupMsg = document.getElementById('signup-msg');
  let currentUser = null;

  /* --- Modal helpers --- */
  function openModal(defaultTab) {
    if (authModal) {
      authModal.classList.add('open');
      switchTab(defaultTab || 'signin');
    }
  }
  function closeModal() {
    if (authModal) authModal.classList.remove('open');
  }

  function switchTab(tabId) {
    authTabs.forEach(t => t.classList.remove('active'));
    authForms.forEach(f => f.classList.remove('active'));
    const accDetails = document.getElementById('account-section');
    if (accDetails) accDetails.classList.remove('active');

    const activeTab = document.querySelector('.auth-tab[data-tab="' + tabId + '"]');
    if (activeTab) activeTab.classList.add('active');

    // Update left panel title
    const leftTitle = document.getElementById('left-panel-title');
    if (leftTitle) {
      if (tabId === 'signup' || tabId === 'signup-step2' || tabId === 'account') {
        leftTitle.innerHTML = 'WELCOME!';
      } else {
        leftTitle.innerHTML = 'WELCOME<br>BACK!';
      }
    }

    if (tabId === 'account') {
      if (accDetails) accDetails.classList.add('active');
    } else {
      const form = document.getElementById(tabId + '-form');
      if (form) {
        form.classList.add('active');
        // Simple entry animation trigger
        form.style.opacity = '0';
        form.style.transform = 'translateX(10px)';
        setTimeout(() => {
          form.style.transition = 'all 0.4s ease';
          form.style.opacity = '1';
          form.style.transform = 'translateX(0)';
        }, 10);
      }
    }
  }

  function setMsg(el, type, text) {
    if (!el) return;
    el.className = 'auth-msg' + (type ? ' ' + type : '');
    el.innerText = text || '';
  }

  /* --- Navbar UI update --- */
  async function updateUserUI(user) {
    currentUser = user;
    const tAccount = document.getElementById('tab-account');
    const tSignin = document.getElementById('tab-signin');
    const tSignup = document.getElementById('tab-signup');
    const userDropdownMenu = document.getElementById('user-dropdown-menu');

    if (navAuthBtn) {
      if (user) {
        let name = (user.user_metadata && user.user_metadata.full_name)
          ? user.user_metadata.full_name
          : user.email.split('@')[0];

        let avatarHtml = `<img src="https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111&color=fff&size=32" class="user-avatar" alt="Avatar">`;

        try {
          if (supabaseClient) {
            const { data: prof } = await supabaseClient.from('profiles').select('avatar_url').eq('id', user.id).single();
            if (prof && prof.avatar_url) {
              avatarHtml = `<img src="${prof.avatar_url}" class="user-avatar" alt="Avatar">`;
            }
          }
        } catch (e) { }

        navAuthBtn.innerHTML = `Hi, ${name.split(' ')[0]} ${avatarHtml}`;
      } else {
        navAuthBtn.innerText = 'SIGN UP';
        if (userDropdownMenu) userDropdownMenu.classList.remove('active');
      }
    }

    if (user) {
      if (tAccount) tAccount.style.display = 'block';
      if (tSignin) tSignin.style.display = 'none';
      if (tSignup) tSignup.style.display = 'none';
      const pName = document.getElementById('profile-name');
      const pEmail = document.getElementById('profile-email');
      const pDate = document.getElementById('profile-date');
      if (pName) pName.innerText = (user.user_metadata && user.user_metadata.full_name) || 'N/A';
      if (pEmail) pEmail.innerText = user.email;
      if (pDate) pDate.innerText = new Date(user.created_at).toLocaleDateString();
      if (authModal && authModal.classList.contains('open')) switchTab('account');
    } else {
      if (tAccount) tAccount.style.display = 'none';
      if (tSignin) tSignin.style.display = 'block';
      if (tSignup) tSignup.style.display = 'block';
      if (authModal && authModal.classList.contains('open')) switchTab('signin');
    }
  }

  /* --- Close on backdrop click --- */
  if (authModal) {
    authModal.addEventListener('click', function (e) {
      if (e.target === authModal) closeModal();
    });
  }

  /* --- Close button --- */
  if (authCloseBtn) {
    authCloseBtn.addEventListener('click', closeModal);
  }

  /* --- Tab switching --- */
  authTabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      switchTab(tab.getAttribute('data-tab'));
    });
  });

  /* --- ACCOUNT / DROPDOWN navbar button --- */
  const userDropdownMenu = document.getElementById('user-dropdown-menu');
  const userDropdownContainer = document.getElementById('user-dropdown-container');
  const navLogoutBtn = document.getElementById('nav-logout-btn');

  if (navAuthBtn) {
    navAuthBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (currentUser) {
        // User logged in: Toggle dropdown
        if (userDropdownMenu) {
          userDropdownMenu.classList.toggle('active');
        }
      } else {
        // User not logged in: Open sign in modal
        openModal();
      }
    });
  }

  /* --- Mobile Signup Button --- */
  const mobileSignupBtn = document.getElementById('mobile-signup-btn');
  if (mobileSignupBtn) {
    mobileSignupBtn.addEventListener('click', function (e) {
      e.preventDefault();
      openModal('signup');
    });
  }

  /* --- Close dropdown when clicking outside --- */
  document.addEventListener('click', function (e) {
    if (currentUser && userDropdownContainer && userDropdownMenu) {
      if (!userDropdownContainer.contains(e.target)) {
        userDropdownMenu.classList.remove('active');
      }
    }
  });

  /* --- Navbar Dropdown Logout button --- */
  if (navLogoutBtn) {
    navLogoutBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      try {
        if (supabaseClient) await supabaseClient.auth.signOut();
        if (userDropdownMenu) userDropdownMenu.classList.remove('active');
        if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('profile.html')) {
          window.location.href = 'index.html';
        }
      } catch (err) { console.warn('signOut error', err); }
    });
  }

  /* --- SIGN IN form --- */
  if (signinForm) {
    signinForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!supabaseClient) { setMsg(signinMsg, 'error', 'Auth service unavailable.'); return; }
      const email = document.getElementById('signin-email').value.trim();
      const password = document.getElementById('signin-password').value;
      const btn = document.getElementById('signin-btn');

      setMsg(signinMsg, 'loading', 'Signing in...');
      if (btn) { btn.disabled = true; btn.innerText = 'PLEASE WAIT...'; }

      const { error } = await supabaseClient.auth.signInWithPassword({ email, password });

      if (error) {
        setMsg(signinMsg, 'error', error.message);
        if (btn) { btn.disabled = false; btn.innerText = 'LOGIN'; }
      } else {
        setMsg(signinMsg, 'success', 'Welcome back!');
        setTimeout(function () {
          closeModal();
          setMsg(signinMsg, '', '');
          if (btn) { btn.disabled = false; btn.innerText = 'LOGIN'; }
        }, 1200);
      }
    });
  }

  /* --- SIGN UP form --- */
  if (signupForm) {
    signupForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!supabaseClient) { setMsg(signupMsg, 'error', 'Auth service unavailable.'); return; }
      const full_name = document.getElementById('signup-name').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value;
      const btn = document.getElementById('signup-btn');

      if (!full_name) { setMsg(signupMsg, 'error', 'Please enter your full name.'); return; }
      if (password.length < 6) { setMsg(signupMsg, 'error', 'Password must be at least 6 characters.'); return; }

      setMsg(signupMsg, 'loading', 'Creating your account...');
      if (btn) { btn.disabled = true; btn.innerText = 'PLEASE WAIT...'; }

      // Step 1: Auth sign-up
      const { data: signUpData, error: signUpError } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { data: { full_name: full_name } }
      });

      if (signUpError) {
        setMsg(signupMsg, 'error', signUpError.message);
        if (btn) { btn.disabled = false; btn.innerText = 'CREATE ACCOUNT'; }
        return;
      }

      // Step 2 Initial: Save basic profile row so the record exists
      if (signUpData && signUpData.user) {
        const { error: profileError } = await supabaseClient.from('profiles').upsert({
          id: signUpData.user.id,
          name: full_name,
          email: email
        }, { onConflict: 'id' });
        if (profileError) console.warn('Profile save warning:', profileError.message);
      }

      // Stop creating account loader
      if (btn) { btn.disabled = false; btn.innerText = 'CREATE ACCOUNT'; }

      // Stop creating account loader
      if (btn) { btn.disabled = false; btn.innerText = 'CREATE ACCOUNT'; }

      // Use switchTab to show Step 2
      switchTab('signup-step2');
      
      // Pre-fill
      if (document.getElementById('step2-name')) document.getElementById('step2-name').value = full_name;
      if (document.getElementById('step2-email')) document.getElementById('step2-email').value = email;
    });
  }

  // --- Step 2 Profile Setup ---
  const step2Form = document.getElementById('signup-step2-form');
  const step2Upload = document.getElementById('step2-avatar-upload');
  const step2Preview = document.getElementById('step2-avatar-preview');
  const step2Btn = document.getElementById('step2-btn');
  const step2Msg = document.getElementById('step2-msg');
  const step2Name = document.getElementById('step2-name');

  let step2AvatarFile = null;

  if (step2Form && step2Upload && step2Name) {
    // Handling image preview
    step2Upload.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        step2AvatarFile = file;
        const reader = new FileReader();
        reader.onload = (e) => { step2Preview.src = e.target.result; };
        reader.readAsDataURL(file);
      }
      checkStep2Valid();
    });

    step2Name.addEventListener('input', checkStep2Valid);

    function checkStep2Valid() {
      if (step2Name.value.trim().length > 0 && step2AvatarFile) {
        step2Btn.disabled = false;
        step2Btn.style.opacity = '1';
      } else {
        step2Btn.disabled = true;
        step2Btn.style.opacity = '0.5';
      }
    }

    step2Form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setMsg(step2Msg, 'loading', 'Saving profile...');
      step2Btn.disabled = true;

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        setMsg(step2Msg, 'error', 'No active session found. Please wait or log in again.');
        step2Btn.disabled = false;
        return;
      }

      const user = session.user;
      let finalAvatarUrl = null;

      // Upload avatar
      if (step2AvatarFile) {
        const fileExt = step2AvatarFile.name.split('.').pop();
        const filePath = `${user.id}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabaseClient.storage.from('avatars').upload(filePath, step2AvatarFile);

        if (uploadError) {
          setMsg(step2Msg, 'error', 'Failed to upload photo: ' + uploadError.message);
          step2Btn.disabled = false;
          return;
        }
        finalAvatarUrl = supabaseClient.storage.from('avatars').getPublicUrl(filePath).data.publicUrl;
      }

      // Prepare updates
      const updates = {
        id: user.id,
        name: step2Name.value.trim(),
        email: document.getElementById('step2-email').value.trim(),
        username: document.getElementById('step2-username').value.trim() || null,
        phone: document.getElementById('step2-phone').value.trim() || null,
        dob: document.getElementById('step2-dob').value || null,
      };
      if (finalAvatarUrl) updates.avatar_url = finalAvatarUrl;

      // Save
      const { error: updateErr } = await supabaseClient.from('profiles').upsert(updates, { onConflict: 'id' });

      if (updateErr) {
        setMsg(step2Msg, 'error', 'Save failed: ' + updateErr.message);
        step2Btn.disabled = false;
      } else {
        setMsg(step2Msg, 'success', 'Profile setup complete! Redirecting...');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      }
    });
  }

  /* --- Logout button (inside profile tab) --- */
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      if (supabaseClient) await supabaseClient.auth.signOut();
      closeModal();
    });
  }

  /* --- Forgot password --- */
  var forgotBtn = document.getElementById('forgot-password');
  if (forgotBtn) {
    forgotBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      if (!supabaseClient) return;
      var email = prompt('Enter your email address to reset password:');
      if (email) {
        var result = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
        if (result.error) alert(result.error.message);
        else alert('Password reset link sent! Check your inbox.');
      }
    });
  }

  /* --- Google OAuth --- */
  async function signInWithGoogle(btn) {
    if (!supabaseClient) {
      alert('Authentication service is not available. Please refresh the page.');
      return;
    }
    var origText = btn ? btn.innerText : '';
    if (btn) { btn.disabled = true; btn.innerText = 'OPENING GOOGLE...'; }
    var result = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
    if (result.error) {
      alert('Google sign-in failed: ' + result.error.message +
        '\n\nMake sure Google is enabled in your Supabase Auth settings.');
      if (btn) { btn.disabled = false; btn.innerText = origText; }
    }
    // On success, browser redirects automatically — no need to re-enable button
  }
  var gSignin = document.getElementById('google-signin');
  var gSignup = document.getElementById('google-signup');
  if (gSignin) gSignin.addEventListener('click', function () { signInWithGoogle(gSignin); });
  if (gSignup) gSignup.addEventListener('click', function () { signInWithGoogle(gSignup); });

  /* --- Report link --- */
  var reportBtn = document.getElementById('report-link');
  if (reportBtn) {
    reportBtn.addEventListener('click', async function (e) {
      e.preventDefault();
      if (!supabaseClient) return;
      var topic = prompt('Topic of your report:');
      var desc = prompt('Brief description:');
      if (topic && desc) {
        var r = await supabaseClient.from('reports').insert([{ topic: topic, description: desc, user_id: currentUser ? currentUser.id : null }]);
        if (r.error) alert('Failed to submit report.');
        else alert('Thank you for your report!');
      }
    });
  }

  /* --- Initialize Supabase auth state --- */
  if (supabaseClient) {
    supabaseClient.auth.getSession().then(function (r) {
      updateUserUI(r.data && r.data.session ? r.data.session.user : null);
    });
    supabaseClient.auth.onAuthStateChange(function (_event, session) {
      updateUserUI(session ? session.user : null);
    });
  } else {
    updateUserUI(null);
  }

})();
