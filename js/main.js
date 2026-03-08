/* =========================================
   GSAP + LENIS INITIALIZATION
   ========================================= */
try {
  gsap.registerPlugin(ScrollTrigger);
} catch (e) { console.warn('GSAP init failed:', e); }




/* =========================================
   DOM ELEMENTS
   ========================================= */
const canvas = document.getElementById('sequence-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const loadingScreen = document.getElementById('loading-screen');
const loadingProgress = document.getElementById('loading-progress');
const scrollText = document.getElementById('scroll-text');
const progressBar = document.getElementById('progress-bar');
const sequenceSection = document.querySelector('.scroll-sequence');
const navbar = document.getElementById('navbar');
const grid = document.getElementById('resources-grid');
const filterBtns = document.querySelectorAll('.filter-btn');

/* =========================================
   SCROLL SEQUENCE ANIMATION
   ========================================= */
const totalFrames = 79;
const images = [];
let imagesLoaded = 0;

if (canvas) {
  canvas.width = 1920;
  canvas.height = 1080;
}

function loadImages() {
  for (let i = 1; i <= totalFrames; i++) {
    const img = new Image();
    const indexStr = i.toString().padStart(5, '0');
    img.src = `${indexStr}.png`;
    images.push(img);

    img.onload = () => {
      imagesLoaded++;
      const percent = Math.floor((imagesLoaded / totalFrames) * 100);
      if (loadingProgress) loadingProgress.innerText = `${percent}%`;

      if (imagesLoaded === totalFrames) {
        if (loadingScreen) {
          loadingScreen.style.opacity = '0';
          setTimeout(() => { loadingScreen.style.display = 'none'; }, 250);
        }
        if (ctx && images[0]) ctx.drawImage(images[0], 0, 0, canvas.width, canvas.height);
      }
    };
    img.onerror = () => {
      imagesLoaded++;
      if (imagesLoaded === totalFrames && loadingScreen) {
        loadingScreen.style.opacity = '0';
        setTimeout(() => { loadingScreen.style.display = 'none'; }, 250);
      }
    };
  }

  // Forced Fallback
  setTimeout(() => {
    if (loadingScreen && loadingScreen.style.display !== 'none') {
      console.log('Forced Loader Clear');
      loadingScreen.style.opacity = '0';
      setTimeout(() => { loadingScreen.style.display = 'none'; }, 250);
    }
  }, 5000);
}

if (sequenceSection) {
  loadImages();
  window.addEventListener('scroll', () => {
    const sectionTop = sequenceSection.offsetTop;
    const sectionHeight = sequenceSection.offsetHeight;
    const scrollY = window.scrollY;
    let scrollProgress = (scrollY - sectionTop) / (sectionHeight - window.innerHeight);
    scrollProgress = Math.max(0, Math.min(1, scrollProgress));

    if (progressBar) progressBar.style.width = `${scrollProgress * 100}%`;
    if (scrollText) scrollText.style.opacity = scrollProgress > 0.05 ? '0' : '1';

    if (images.length === totalFrames) {
      let frameIndex = Math.floor(scrollProgress * (totalFrames - 1));
      if (ctx && images[frameIndex] && images[frameIndex].complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(images[frameIndex], 0, 0, canvas.width, canvas.height);
      }
    }
  });
}

/* =========================================
   RESOURCE DATA & FILTER LOGIC
   ========================================= */
let resourcesData = [];
let purchasesData = [];

async function fetchResources(searchQuery = '') {
  let query = supabaseClient.from('items').select('*');
  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`);
  }
  const { data, error } = await query;
  if (error) { console.error('Error fetching items:', error); return []; }
  return data || [];
}

async function fetchPurchases(userId) {
  if (!userId) return [];
  const { data, error } = await supabaseClient.from('purchases').select('item_id').eq('user_id', userId);
  if (error) { console.error('Error fetching purchases:', error); return []; }
  return data.map(p => p.item_id) || [];
}

async function renderResources(filter = 'all', searchQuery = '') {
  if (!grid) return;

  const fixedAdHTML = grid.querySelector('.inline-ad') ? grid.querySelector('.inline-ad').outerHTML : '';
  grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; opacity: 0.5;">LOADING ITEMS...</div>';

  resourcesData = await fetchResources(searchQuery);

  // Determine user and purchases
  let userId = null;
  let purchasedItemIds = [];
  const { data: { session } } = await supabase.auth.getSession();
  if (session && session.user) {
    userId = session.user.id;
    purchasedItemIds = await fetchPurchases(userId);
  }

  grid.innerHTML = fixedAdHTML;

  const filtered = filter === 'all' ? resourcesData : resourcesData.filter(item => item.category === filter);

  if (filtered.length === 0) {
    grid.innerHTML += '<div style="grid-column: 1/-1; text-align: center; padding: 4rem; opacity: 0.5;">NO ITEMS FOUND.</div>';
    return;
  }

  filtered.forEach((item, index) => {
    const isPremium = item.type === 'premium';
    const hasPurchased = purchasedItemIds.includes(item.id);

    const badgeHtml = isPremium
      ? `<span class="card-badge premium-badge">PREMIUM</span>`
      : `<span class="card-badge">${item.category}</span>`;

    let btnHtml = '';
    if (isPremium && !hasPurchased) {
      btnHtml = `<a href="order.html?product=${item.id}" class="card-btn btn-premium">BUY NOW - $${item.price}</a>`;
    } else {
      const btnText = isPremium ? 'DOWNLOAD' : 'FREE DOWNLOAD';
      btnHtml = `<a href="${item.file_url || '#'}" target="_blank" class="card-btn">${btnText}</a>`;
    }

    const sizeText = item.size ? `SIZE: ${item.size}` : '';
    const versionText = item.version ? ` | VER: ${item.version}` : '';
    const downloadsText = ` | DLs: ${item.download_count || 0}`;

    const card = document.createElement('div');
    card.className = 'resource-card';
    card.style.opacity = '0';
    card.innerHTML = `
          <div class="card-img-wrapper">
            ${badgeHtml}
            <img src="${item.thumbnail_url || ''}" alt="${item.title}" class="card-img" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'400\\' height=\\'225\\'><rect width=\\'100%\\' height=\\'100%\\' fill=\\'%23111\\'/><text x=\\'50%\\' y=\\'50%\\' fill=\\'%23555\\' font-family=\\'sans-serif\\' font-size=\\'20\\' text-anchor=\\'middle\\' dominant-baseline=\\'middle\\'>No Image</text></svg>'">
          </div>
          <div class="card-content">
            <h3 class="card-title">${item.title}</h3>
            <div class="card-meta">${sizeText}${versionText}${downloadsText}</div>
            ${btnHtml}
          </div>
        `;
    grid.appendChild(card);
    gsap.to(card, { opacity: 1, y: 0, duration: 0.6, delay: index * 0.1, ease: "power2.out", startAt: { y: 30 } });
  });
}

if (grid) {
  const defaultCategory = grid.getAttribute('data-category') || 'all';
  const isSearch = grid.getAttribute('data-search') === 'true';

  if (!isSearch) {
    renderResources(defaultCategory);
  }

  const searchBtn = document.getElementById('search-btn');
  const searchInput = document.getElementById('search-input');

  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      renderResources('all', searchInput.value.trim());
    });
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') renderResources('all', searchInput.value.trim());
    });
  }
}

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderResources(btn.getAttribute('data-filter'));
  });
});

/* =========================================
   NAVBAR SCROLL EFFECT & LINKS
   ========================================= */
if (navbar) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  });

  // Handle smooth scrolling & filtering for navbar links
  const navLinks = navbar.querySelectorAll('a[href^="#"]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Download Handling
      async function handleDownload(item) {
        // Free item
        if (item.type === 'free') {
          await supabaseClient.rpc('increment_download', { row_id: item.id }).catch(e => console.log(e));
          window.open(item.file_url || '#', '_blank');
          return;
        }

        // Premium item
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) {
          // Need to logic
          document.getElementById('auth-modal').style.display = 'flex';
          document.getElementById('signin-msg').innerText = "Please login to purchase premium items.";
          return;
        }

        // Redirect to order page with item details securely
        // In a real app we'd trigger a Stripe checkout here. 
        // For now, redirect to our fake order page.
        window.location.href = `order.html?id=${item.id}&title=${encodeURIComponent(item.title)}&price=${item.price}`;
      }
      const targetId = link.getAttribute('href').substring(1);
      if (targetId === 'home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (['plugin', 'sfx', 'preset'].includes(targetId)) {
        e.preventDefault();
        // Scroll to the resources section
        const targetEl = document.getElementById('resources');
        if (targetEl) {
          window.scrollTo({ top: targetEl.offsetTop - 100, behavior: 'smooth' });

          // Trigger the corresponding filter button
          const filterMap = {
            'plugin': 'plugins',
            'sfx': 'sfx',
            'preset': 'presets'
          };
          const filterBtn = document.querySelector(`.filter-btn[data-filter="${filterMap[targetId]}"]`);
          if (filterBtn) {
            // Wait briefly for scroll to start before filtering, looks smoother
            setTimeout(() => filterBtn.click(), 200);
          }
        }
      }
    });
  });
}

/* =========================================
   FEATURED PROJECTS SECTION
   ========================================= */
const fpGrid = document.getElementById('fp-grid');
const fpTabs = document.querySelectorAll('.fp-tab');

// Placeholder cards shown when no Supabase videos are uploaded yet
const FP_PLACEHOLDERS = [
  { title: 'Ultimate Plugins Pack', meta: '05:57 • Youtube Videos', category: 'youtube', progress: 45 },
  { title: 'Cinematic SFX Bundle', meta: '02:14 • Shorts', category: 'shorts', progress: 20 },
  { title: 'Pro Color Presets Tutorial', meta: '12:30 • Tutorial Videos', category: 'tutorial', progress: 70 },
  { title: 'Free Motion Pack Download', meta: '03:45 • Free Resources', category: 'free', progress: 10 },
];

function buildFpCard(item, index) {
  const durationMatch = item.meta ? item.meta.match(/(\d+:\d+)/) : null;
  const duration = durationMatch ? durationMatch[1] : '05:00';
  const progress = item.progress || Math.floor(Math.random() * 60 + 10);
  const thumbHtml = item.thumbnail_url
    ? `<img src="${item.thumbnail_url}" alt="${item.title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'fp-card-thumb-placeholder\\'><span>NO PREVIEW</span></div>'">`
    : `<div class="fp-card-thumb-placeholder"><span>AVS MAHIM</span></div>`;

  // Stagger card slide up: left=0.8s, right=1.0s (based on index)
  const animDelay = 0.8 + (index * 0.2);

  return `
    <div class="fp-card" data-category="${item.category || 'all'}" style="transition-delay: ${animDelay}s, 0s, 0s, 0s, 0s;">
      <div class="fp-card-thumb">
        ${thumbHtml}
        <div class="fp-play-btn">
          <svg viewBox="0 0 24 24" fill="white" width="12" height="12"><path d="M8 5v14l11-7z"/></svg>
        </div>
        <span class="fp-duration">${duration}</span>
        <div class="fp-card-icons">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="14" height="14"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="14" height="14"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/></svg>
        </div>
        <div class="fp-progress-bar"><div class="fp-progress-fill" style="width:${progress}%"></div></div>
      </div>
      <div class="fp-card-info">
        <div class="fp-card-title">${item.title}</div>
        <div class="fp-card-meta">${item.meta || item.category || 'AVS Mahim'}</div>
      </div>
    </div>`;
}

async function renderFpSection(activeFilter = 'all') {
  if (!fpGrid) return;
  fpGrid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:#555;font-size:0.9rem;letter-spacing:0.1em;">LOADING...</div>';

  let items = [];
  try {
    // Try fetching from Supabase items table - use video_url presence as indicator of video items
    const { data, error } = await supabaseClient.from('items').select('*').not('video_url', 'is', null).limit(8);
    if (!error && data && data.length > 0) {
      items = data.map(d => ({
        title: d.title,
        thumbnail_url: d.thumbnail_url,
        category: d.video_category || d.category || 'youtube',
        meta: `${d.duration || '05:00'} • ${d.video_category || d.category || 'Video'}`,
        progress: d.progress || Math.floor(Math.random() * 60 + 10),
      }));
    }
  } catch (e) { /* silently fall back to placeholders */ }

  // Fall back to placeholders if no video items found
  if (items.length === 0) items = FP_PLACEHOLDERS;

  // Filter
  const filtered = activeFilter === 'all' ? items : items.filter(i => i.category === activeFilter);
  const display = filtered.length > 0 ? filtered : items.slice(0, 4);

  fpGrid.innerHTML = display.map((item, i) => buildFpCard(item, i)).join('');
}

if (fpGrid) {
  renderFpSection();
  fpTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      fpTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderFpSection(tab.getAttribute('data-fp-filter'));
    });
  });
}

/* =========================================
   LAYER 4 - PRODUCT CATEGORY COUNTS
   ========================================= */
async function loadL4Counts() {
  const categoryMap = {
    plugins: { el: document.getElementById('l4-count-plugins'), filter: { category: 'plugins' } },
    sfx: { el: document.getElementById('l4-count-sfx'), filter: { category: 'sfx' } },
    presets: { el: document.getElementById('l4-count-presets'), filter: { category: 'presets' } },
    apps: { el: document.getElementById('l4-count-apps'), filter: { category: 'apps' } },
    tutorials: { el: document.getElementById('l4-count-tutorials'), filter: null }, // videos
  };

  try {
    // Fetch all items once (avoiding specific column names that might crash if missing)
    const { data, error } = await supabaseClient.from('items').select('*');
    if (error || !data) return;

    const counts = { plugins: 0, sfx: 0, presets: 0, apps: 0, tutorials: 0 };
    data.forEach(item => {
      if (item.video_url) counts.tutorials++;
      if (item.category === 'plugins') counts.plugins++;
      if (item.category === 'sfx') counts.sfx++;
      if (item.category === 'presets') counts.presets++;
      if (item.category === 'apps') counts.apps++;
    });

    Object.entries(categoryMap).forEach(([key, { el }]) => {
      if (el) el.textContent = counts[key] > 0 ? counts[key] : '0';
    });
  } catch (e) {
    // silently ignore – counts just stay as '—'
  }
}

// Run on pages that have l4 section
if (document.getElementById('l4-count-plugins')) {
  loadL4Counts();
}

/* =========================================
   MZ MEDIA HERO (LAYER 2) ANIMATIONS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  const mz2Section = document.getElementById('mz2-trigger-section');
  const mz2Counter = document.getElementById('mz2-counter');

  if (!mz2Section || !mz2Counter) return;

  let hasAnimated = false;

  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.3 // Trigger when 30% of the section is visible
  };

  const mz2Observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasAnimated) {
        hasAnimated = true;
        // Add class to trigger CSS transitions
        mz2Section.classList.add('mz2-in-view');

        // Run counter animation after 1s delay (matching text fade-in)
        setTimeout(() => {
          animateCounter(mz2Counter, 0, 500, 1500); // 0 to 500 over 1.5 seconds
        }, 1000);

        // Optional: stop observing once activated
        observer.unobserve(mz2Section);
      }
    });
  }, observerOptions);

  mz2Observer.observe(mz2Section);

  // Helper function for smooth number counting
  function animateCounter(element, start, end, duration) {
    let startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // using ease-out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      element.innerText = Math.floor(easeProgress * (end - start) + start);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.innerText = end;
      }
    }

    window.requestAnimationFrame(step);
  }
});

/* =========================================
   FEATURED PROJECTS (LAYER 3) ANIMATIONS
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  // 1. Scroll Triggers
  const mz3Section = document.querySelector('.mz3-animate-trigger');
  if (mz3Section) {
    let hasMz3Animated = false;
    const mz3Observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !hasMz3Animated) {
          hasMz3Animated = true;
          mz3Section.classList.add('mz3-in-view');
          observer.unobserve(mz3Section);
        }
      });
    }, { root: null, rootMargin: '0px', threshold: 0.1 });
    mz3Observer.observe(mz3Section);
  }

  // 2. Scroll Parallax for Header
  const l3Header = document.querySelector('[data-scroll-parallax]');
  if (l3Header) {
    window.addEventListener('scroll', () => {
      const rect = l3Header.getBoundingClientRect();
      const viewHeight = window.innerHeight;
      // Only do parallax when it's near/in viewport
      if (rect.top <= viewHeight && rect.bottom >= 0) {
        // Slowing down the scroll for depth
        const scrollOffset = (viewHeight / 2 - rect.top) * 0.1;
        l3Header.style.transform = `translateY(${-scrollOffset}px)`;
      }
    });
  }

  // 3. Mouse Parallax for Cards (Event Delegation on fp-grid)
  const layer3Grid = document.getElementById('fp-grid');
  if (layer3Grid) {
    layer3Grid.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.fp-card');
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate max 3 degree tilt
      const rotateX = ((y - centerY) / centerY) * -3;
      const rotateY = ((x - centerX) / centerX) * 3;

      // Apply transform, preserving the initial CSS hover translation/scale
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.03) translateY(-4px)`;
    });

    layer3Grid.addEventListener('mouseleave', () => {
      resetCards();
    });

    layer3Grid.addEventListener('mouseout', (e) => {
      const card = e.target.closest('.fp-card');
      if (card && !card.contains(e.relatedTarget)) {
        card.style.transform = ''; // clears inline transform, falls back to CSS
      }
    });

    function resetCards() {
      const cards = layer3Grid.querySelectorAll('.fp-card');
      cards.forEach(c => {
        c.style.transform = '';
      });
    }
  }
});
