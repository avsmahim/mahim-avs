/* ============================================================
   AVS Blog Editor — Full Featured Rich Text Editor
   Features: Custom Emoji Picker, Margins, Image Resize/Drag,
             Dark Mode, Full Toolbar, Supabase Save
   ============================================================ */

(function () {
    'use strict';
    window.editingPostId = null;

    /* ═══════════════════════════════════════════════════════════
       OPEN / CLOSE / SAVE EDITOR
       ═══════════════════════════════════════════════════════════ */
    window.openPostEditor = function (post = null) {
        window.editingPostId = post ? post.id : null;
        document.getElementById('post-editor-panel').style.display = 'flex';
        document.getElementById('post-form-msg').innerHTML = '';

        if (post) {
            document.getElementById('post-title').value = post.title || '';
            const contentEditor = document.querySelector('#post-content-editor .ql-editor');
            if (contentEditor) contentEditor.innerHTML = post.content || '';
            document.getElementById('post-labels').value = post.labels ? post.labels.join(', ') : '';

            if (post.published_at) {
                const fDate = new Date(post.published_at).toISOString().slice(0, 16);
                document.getElementById('post-published-on').value = fDate;
            } else {
                document.getElementById('post-published-on').value = '';
            }

            document.getElementById('post-permalink').value = post.permalink || '';
            document.getElementById('post-location').value = post.location || '';
            document.getElementById('post-search-desc').value = post.search_description || '';

            if (post.status === 'draft') {
                document.getElementById('opt-draft').checked = true;
            } else {
                document.getElementById('opt-publish').checked = true;
            }
        } else {
            resetBlogEditor();
        }
    };

    window.closePostEditor = function () {
        document.getElementById('post-editor-panel').style.display = 'none';
        resetBlogEditor();
    };

    function resetBlogEditor() {
        document.getElementById('post-title').value = '';
        const contentEditor = document.querySelector('#post-content-editor .ql-editor');
        if (contentEditor) contentEditor.innerHTML = '';
        document.getElementById('post-labels').value = '';
        document.getElementById('post-published-on').value = '';
        document.getElementById('post-permalink').value = '';
        document.getElementById('post-location').value = '';
        document.getElementById('post-search-desc').value = '';
        document.getElementById('opt-publish').checked = true;
        window.editingPostId = null;
        document.getElementById('post-form-msg').innerHTML = '';
    }

    window.savePost = async function (isAutoSave = false) {
        const msgEl = document.getElementById('post-form-msg');
        const saveBtn = document.getElementById('save-status-btn');
        if (!isAutoSave) {
            msgEl.innerHTML = '<span style="color:#0277bd;">Saving post...</span>';
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg> Saving...';
        } else {
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg> Autosaving...';
        }

        const title = document.getElementById('post-title').value.trim();
        const contentEditor = document.querySelector('#post-content-editor .ql-editor');
        let content = contentEditor ? contentEditor.innerHTML : '';
        if (content === '<p><br></p>') content = '';

        if (!title && !content) {
            if (!isAutoSave) msgEl.innerHTML = '<span style="color:#c62828;">Title and content cannot be empty.</span>';
            return;
        }

        const labelsInput = document.getElementById('post-labels').value;
        const labels = labelsInput ? labelsInput.split(',').map(s => s.trim()).filter(s => s) : [];
        const publishedOn = document.getElementById('post-published-on').value;
        const permalink = document.getElementById('post-permalink').value.trim();
        const locationStr = document.getElementById('post-location').value.trim();
        const searchDesc = document.getElementById('post-search-desc').value.trim();
        const status = document.getElementById('opt-draft').checked ? 'draft' : 'published';

        const postData = {
            title: title || 'Untitled Post',
            content: content,
            labels: labels,
            permalink: permalink || (title ? title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') : ''),
            location: locationStr,
            search_description: searchDesc,
            status: status
        };

        if (publishedOn) {
            postData.published_at = new Date(publishedOn).toISOString();
        } else if (status === 'published' && !window.editingPostId) {
            postData.published_at = new Date().toISOString();
        }

        try {
            let res;
            if (window.editingPostId) {
                res = await supabaseClient.from('posts').update(postData).eq('id', window.editingPostId).select();
            } else {
                res = await supabaseClient.from('posts').insert([postData]).select();
            }

            if (res.error) throw res.error;
            if (res.data && res.data.length > 0) { window.editingPostId = res.data[0].id; }

            if (!isAutoSave) {
                msgEl.innerHTML = '<span style="color:#2e7d32;">Post saved successfully!</span>';
                if (window.loadPosts) window.loadPosts();
                setTimeout(() => { if (msgEl.innerHTML.includes('saved successfully')) msgEl.innerHTML = ''; }, 3000);
            }
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24" style="fill:#2e7d32"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg> Saved';

        } catch (err) {
            console.error('Error saving post:', err);
            msgEl.innerHTML = `<span style="color:#c62828;">Error saving: ${err.message}</span>`;
            saveBtn.innerHTML = '<svg viewBox="0 0 24 24" style="fill:#c62828"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM11 15h2v2h-2zm0-8h2v6h-2z"/></svg> Failed';
        }
    };

    // Init Editor Theme
    window.toggleEditorTheme = function () {
        document.body.classList.toggle('theme-dark');
        localStorage.setItem('theme-dark', document.body.classList.contains('theme-dark'));
    };
    if (localStorage.getItem('theme-dark') === 'true') {
        document.body.classList.add('theme-dark');
    }

    window.toggleMarginsPopup = function () {
        const popup = document.getElementById('custom-margins-popup');
        if (popup) popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
    };

    let imageOverlay = null;
    let currentHandlingImage = null;

    function initCustomImageHandling(quillEditor) {
        quillEditor.root.addEventListener('click', function (e) {
            if (e.target.tagName === 'IMG') {
                showImageHandles(e.target, quillEditor);
            } else if (imageOverlay && !imageOverlay.contains(e.target)) {
                hideImageHandles();
            }
        });
        quillEditor.on('text-change', hideImageHandles);
    }

    function hideImageHandles() {
        if (imageOverlay) {
            imageOverlay.remove();
            imageOverlay = null;
        }
        currentHandlingImage = null;
    }

    function showImageHandles(img, quillEditor) {
        if (imageOverlay) hideImageHandles();
        currentHandlingImage = img;
        if (window.getComputedStyle(img).position === 'static') img.style.position = 'relative';

        const container = quillEditor.container;
        imageOverlay = document.createElement('div');
        imageOverlay.className = 'quill-image-overlay';
        imageOverlay.style.position = 'absolute';
        imageOverlay.style.border = '2px dashed #2196F3';
        imageOverlay.style.boxSizing = 'border-box';
        imageOverlay.style.cursor = 'move';
        imageOverlay.style.zIndex = '100';

        function updateOverlay() {
            if (!currentHandlingImage) return;
            const rootRect = container.getBoundingClientRect();
            const imgRect = currentHandlingImage.getBoundingClientRect();
            imageOverlay.style.top = (imgRect.top - rootRect.top + container.scrollTop) + 'px';
            imageOverlay.style.left = (imgRect.left - rootRect.left + container.scrollLeft) + 'px';
            imageOverlay.style.width = imgRect.width + 'px';
            imageOverlay.style.height = imgRect.height + 'px';
        }
        updateOverlay();

        const cursors = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize'];
        const positions = [
            { top: '-5px', left: '-5px' }, { top: '-5px', left: '50%' }, { top: '-5px', right: '-5px' }, { top: '50%', right: '-5px' },
            { bottom: '-5px', right: '-5px' }, { bottom: '-5px', left: '50%' }, { bottom: '-5px', left: '-5px' }, { top: '50%', left: '-5px' }
        ];

        positions.forEach((pos, i) => {
            const handle = document.createElement('div');
            handle.style.position = 'absolute';
            handle.style.width = '10px';
            handle.style.height = '10px';
            handle.style.backgroundColor = '#2196F3';
            handle.style.border = '1px solid white';
            handle.style.cursor = cursors[i];
            Object.assign(handle.style, pos);
            if (pos.left === '50%') handle.style.transform = 'translateX(-50%)';
            if (pos.top === '50%') handle.style.transform = 'translateY(-50%)';

            handle.addEventListener('mousedown', function (e) {
                e.stopPropagation(); e.preventDefault();
                const startX = e.clientX, startY = e.clientY;
                const startW = currentHandlingImage.offsetWidth, startH = currentHandlingImage.offsetHeight;
                function doDrag(e) {
                    const dx = e.clientX - startX, dy = e.clientY - startY;
                    let nw = startW, nh = startH;
                    if (i === 3 || i === 4 || i === 2) nw = startW + dx;
                    if (i === 6 || i === 7 || i === 0) nw = startW - dx;
                    if (i === 4 || i === 5 || i === 6) nh = startH + dy;
                    if (i === 0 || i === 1 || i === 2) nh = startH - dy;
                    if (nw > 20) currentHandlingImage.style.width = nw + 'px';
                    if (nh > 20) currentHandlingImage.style.height = nh + 'px';
                    updateOverlay();
                }
                function stopDrag() {
                    document.removeEventListener('mousemove', doDrag);
                    document.removeEventListener('mouseup', stopDrag);
                }
                document.addEventListener('mousemove', doDrag);
                document.addEventListener('mouseup', stopDrag);
            });
            imageOverlay.appendChild(handle);
        });

        imageOverlay.addEventListener('mousedown', function (e) {
            e.preventDefault();
            const startX = e.clientX, startY = e.clientY;
            let startTop = parseFloat(currentHandlingImage.style.top) || 0;
            let startLeft = parseFloat(currentHandlingImage.style.left) || 0;
            function doMove(e) {
                const dy = e.clientY - startY, dx = e.clientX - startX;
                currentHandlingImage.style.top = (startTop + dy) + 'px';
                currentHandlingImage.style.left = (startLeft + dx) + 'px';
                updateOverlay();
            }
            function stopMove() {
                document.removeEventListener('mousemove', doMove);
                document.removeEventListener('mouseup', stopMove);
            }
            document.addEventListener('mousemove', doMove);
            document.addEventListener('mouseup', stopMove);
        });

        container.appendChild(imageOverlay);
    }

    window.initBlogEditor = function (supabase) {
        window.supabaseClient = supabase;

        // Initialize Quill
        if (typeof Quill !== 'undefined' && document.getElementById('post-content-editor')) {
            window.quillEditor = new Quill('#post-content-editor', {
                theme: 'snow',
                modules: {
                    toolbar: '#editor-toolbar'
                }
            });
            initCustomImageHandling(window.quillEditor);

            // Custom Color Palette Logic (Safely Implemented)
            const colorBtn = document.getElementById('custom-color-btn');
            const highlightBtn = document.getElementById('custom-highlight-btn');
            const colorPalette = document.getElementById('custom-color-palette');
            const colorIndicator = document.getElementById('color-btn-indicator');
            const bgIndicator = document.getElementById('bg-btn-indicator');

            const colors = [
                '#000000', '#ffffff', '#ff0000', '#ff6600', '#ffff00',
                '#00ff00', '#00ffff', '#0000ff', '#ff00ff', '#ff69b4',
                '#8b0000', '#006400', '#00008b', '#4b0082', '#808080',
                '#c0c0c0', '#ffd700', '#ff8c00', '#00ced1', '#9400d3'
            ];

            let activeColorMode = 'color';
            let paletteOpen = false;

            if (colorBtn && highlightBtn && colorPalette) {
                // Populate swatch grid
                colors.forEach(color => {
                    const swatch = document.createElement('div');
                    swatch.style.width = '24px';
                    swatch.style.height = '24px';
                    swatch.style.backgroundColor = color;
                    swatch.style.borderRadius = '4px';
                    swatch.style.margin = '2px';
                    swatch.style.cursor = 'pointer';
                    swatch.style.border = '1px solid #ddd';

                    swatch.addEventListener('click', (e) => {
                        e.stopPropagation(); // Fixed: pass 'e' properly
                        if (window.quillEditor) {
                            window.quillEditor.focus();
                            window.quillEditor.format(activeColorMode, color);
                            if (activeColorMode === 'color' && colorIndicator) {
                                colorIndicator.setAttribute('fill', color);
                            } else if (activeColorMode === 'background' && bgIndicator) {
                                bgIndicator.setAttribute('fill', color);
                            }
                        }
                        colorPalette.style.display = 'none';
                        paletteOpen = false;
                    });
                    colorPalette.appendChild(swatch);
                });

                colorBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (paletteOpen && activeColorMode === 'color') {
                        colorPalette.style.display = 'none';
                        paletteOpen = false;
                    } else {
                        activeColorMode = 'color';
                        colorPalette.style.display = 'flex';
                        paletteOpen = true;
                    }
                });

                highlightBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (paletteOpen && activeColorMode === 'background') {
                        colorPalette.style.display = 'none';
                        paletteOpen = false;
                    } else {
                        activeColorMode = 'background';
                        colorPalette.style.display = 'flex';
                        paletteOpen = true;
                    }
                });

                document.addEventListener('click', (e) => {
                    if (paletteOpen &&
                        !colorPalette.contains(e.target) &&
                        !colorBtn.contains(e.target) &&
                        !highlightBtn.contains(e.target)) {
                        colorPalette.style.display = 'none';
                        paletteOpen = false;
                    }
                });
            }
        }

        // Auto permalink generation based on title
        const titleInput = document.getElementById('post-title');
        const permalinkInput = document.getElementById('post-permalink');
        if (titleInput && permalinkInput) {
            titleInput.addEventListener('input', () => {
                if (!window.editingPostId && !permalinkInput.dataset.manuallyEdited) {
                    permalinkInput.value = titleInput.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                }
            });
            permalinkInput.addEventListener('input', () => {
                permalinkInput.dataset.manuallyEdited = 'true';
            });
        }

        const publishBtn = document.getElementById('publish-post-btn');
        if (publishBtn) {
            publishBtn.addEventListener('click', () => {
                document.getElementById('opt-publish').checked = true;
                window.savePost();
            });
        }

        // Custom Margins Popup Logic
        const marginsApply = document.getElementById('margins-apply');
        if (marginsApply) {
            marginsApply.addEventListener('click', () => {
                const ml = document.getElementById('margin-left').value + 'cm';
                const mr = document.getElementById('margin-right').value + 'cm';
                const mt = document.getElementById('margin-top').value + 'cm';
                const mb = document.getElementById('margin-bottom').value + 'cm';
                const editor = document.querySelector('#post-content-editor .ql-editor');
                if (editor) {
                    editor.style.padding = `${mt} ${mr} ${mb} ${ml}`;
                }
                document.getElementById('custom-margins-popup').style.display = 'none';
            });
        }

        // Emoji Picker Logic
        const emojiBtn = document.querySelector('.ql-emoji');
        const emojiPicker = document.getElementById('custom-emoji-picker');
        if (emojiBtn && emojiPicker) {

            // Toggle Picker
            emojiBtn.addEventListener('click', (e) => {
                e.preventDefault();
                emojiPicker.style.display = emojiPicker.style.display === 'block' ? 'none' : 'block';
            });

            // Close on X button
            const closeBtn = document.getElementById('emoji-close-btn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    emojiPicker.style.display = 'none';
                });
            }

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (emojiPicker.style.display === 'block' &&
                    !emojiPicker.contains(e.target) &&
                    !emojiBtn.contains(e.target)) {
                    emojiPicker.style.display = 'none';
                }
            });

            const emojiGrid = document.getElementById('emoji-grid');
            const epickerTabs = document.querySelectorAll('.epicker-tab');

            // Data
            const basicEmojis = ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'];
            const asciiStickers = [
                '( ͡° ͜ʖ ͡°)', '¯\\_(ツ)_/¯', 'ʕ•ᴥ•ʔ', '(ง\'̀-\'́)ง', '(╯°□°）╯︵ ┻━┻', '┬─┬ノ( º _ ºノ)',
                '(☞ﾟヮﾟ)☞', 'ಠ_ಠ', '(ಥ﹏ಥ)', '(ノಠ益ಠ)ノ', '༼ つ ◕_◕ ༽つ', 'ᕙ(⇀‸↼‶)ᕗ', '(•_•) ( •_•)>⌐■-■ (⌐■_■)',
                '(~˘▾˘)~', 'ಠ‿ಠ', '♡( ◡‿◡ )'
            ];

            function renderGridItems(items, isSticker = false) {
                emojiGrid.innerHTML = '';
                items.forEach(item => {
                    const el = document.createElement(isSticker ? 'div' : 'span');
                    el.innerText = item;
                    el.style.cursor = 'pointer';
                    el.style.margin = '4px';

                    if (isSticker) {
                        el.style.fontSize = '1.1rem';
                        el.style.padding = '8px';
                        el.style.background = '#f5f5f5';
                        el.style.borderRadius = '4px';
                        el.style.textAlign = 'center';
                        el.style.display = 'inline-block';
                        // Dark mode adjustments using CSS var or direct
                        if (document.body.classList.contains('theme-dark')) {
                            el.style.background = '#333';
                        }
                    } else {
                        el.style.fontSize = '1.5rem';
                    }

                    el.addEventListener('click', () => {
                        if (window.quillEditor) {
                            window.quillEditor.focus();
                            const range = window.quillEditor.getSelection(true);
                            window.quillEditor.insertText(range.index, item);
                            window.quillEditor.setSelection(range.index + item.length);
                        }
                        emojiPicker.style.display = 'none';
                    });
                    emojiGrid.appendChild(el);
                });
            }

            // Tabs Logic
            epickerTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    epickerTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');

                    const type = tab.getAttribute('data-type');
                    if (type === 'stickers') {
                        renderGridItems(asciiStickers, true);
                    } else {
                        renderGridItems(basicEmojis, false);
                    }
                });
            });

            // Initial render
            if (emojiGrid && emojiGrid.children.length === 0) {
                renderGridItems(basicEmojis, false);
            }
        }

        // Auto-save every 30 seconds if changes
        setInterval(() => {
            const title = document.getElementById('post-title');
            if (title && title.value.trim() && document.getElementById('post-editor-panel').style.display === 'flex') {
                window.savePost(true);
            }
        }, 30000);
    };

    window.editPost = function (id) {
        if (!supabaseClient) return;
        window.editingPostId = id;
        supabaseClient.from('posts').select('*').eq('id', id).single().then(({ data, error }) => {
            if (error) { alert('Error loading post: ' + error.message); return; }
            if (data) {
                window.openPostEditor(data);
                const publishBtn = document.getElementById('publish-post-btn');
                if (publishBtn) publishBtn.textContent = 'Update Post';
            }
        });
    };

    window.deletePost = async function (id) {
        if (!confirm('Delete this post?')) return;
        const { error } = await supabaseClient.from('posts').delete().eq('id', id);
        if (error) alert('Error: ' + error.message);
        else if (typeof loadPosts === 'function') loadPosts();
    };

})();