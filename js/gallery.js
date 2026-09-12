/**
 * AURA VAULT - GALLERY & LIGHTBOX MODULE
 * Dynamic photo grid rendering, search & album filtering, lightbox viewer, zoom/rotate, comments, and reactions.
 */

const AuraGallery = (() => {
  let currentCategory = 'all';
  let searchQuery = '';
  let sortBy = 'newest';
  let activePhoto = null;
  let zoomLevel = 1;
  let rotationAngle = 0;

  function init() {
    setupCategoryPills();
    setupSearchAndSort();
    setupLightboxControls();
  }

  // Category filter tabs
  function setupCategoryPills() {
    const pills = document.querySelectorAll('.cat-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentCategory = pill.getAttribute('data-category');
        render();
      });
    });
  }

  // Search input & sorting dropdown
  function setupSearchAndSort() {
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    const sortSelect = document.getElementById('sort-select');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        if (clearBtn) {
          if (searchQuery.length > 0) clearBtn.classList.remove('hidden');
          else clearBtn.classList.add('hidden');
        }
        render();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        searchQuery = '';
        clearBtn.classList.add('hidden');
        render();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        render();
      });
    }
  }

  // Main Render Function
  async function render() {
    const grid = document.getElementById('gallery-grid');
    const emptyState = document.getElementById('empty-state');
    if (!grid) return;

    let allPhotos = await AuraDB.getAllPhotos();
    updateCategoryCounts(allPhotos);

    // Filter by decoy
    const isDecoy = window.AuraAuth ? AuraAuth.isDecoyMode() : false;
    if (isDecoy) {
      allPhotos = allPhotos.filter(photo => photo.privacy !== 'only_me' && photo.category !== 'private');
    }

    // Filter by category
    let filtered = allPhotos.filter(photo => {
      if (currentCategory === 'all') return true;
      return photo.category === currentCategory;
    });

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(photo => {
        const titleMatch = photo.title.toLowerCase().includes(searchQuery);
        const captionMatch = photo.caption && photo.caption.toLowerCase().includes(searchQuery);
        const tagMatch = photo.tags && photo.tags.some(t => t.toLowerCase().includes(searchQuery));
        return titleMatch || captionMatch || tagMatch;
      });
    }

    // Sort photos
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp;
      if (sortBy === 'oldest') return a.timestamp - b.timestamp;
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'popular') {
        const totalA = (a.reactions?.love || 0) + (a.reactions?.fire || 0);
        const totalB = (b.reactions?.love || 0) + (b.reactions?.fire || 0);
        return totalB - totalA;
      }
      return b.timestamp - a.timestamp;
    });

    // Render Cards
    grid.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
    } else {
      if (emptyState) emptyState.classList.add('hidden');

      filtered.forEach(photo => {
        const card = createPhotoCardElement(photo);
        grid.appendChild(card);
      });
    }

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Calculate category pill item counts
  function updateCategoryCounts(allPhotos) {
    const countAll = document.getElementById('count-all');
    const countFav = document.getElementById('count-favorites');
    const countFam = document.getElementById('count-family');
    const countPriv = document.getElementById('count-private');
    const countTrips = document.getElementById('count-trips');

    if (countAll) countAll.textContent = allPhotos.length;
    if (countFav) countFav.textContent = allPhotos.filter(p => p.category === 'favorites').length;
    if (countFam) countFam.textContent = allPhotos.filter(p => p.category === 'family').length;
    if (countPriv) countPriv.textContent = allPhotos.filter(p => p.category === 'private').length;
    if (countTrips) countTrips.textContent = allPhotos.filter(p => p.category === 'trips').length;
  }

  // Create single Photo Card DOM node
  function createPhotoCardElement(photo) {
    const card = document.createElement('div');
    card.className = 'photo-card glass-panel';

    const formattedDate = new Date(photo.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const loveCount = photo.reactions?.love || 0;
    const fireCount = photo.reactions?.fire || 0;

    const isTextOnly = !photo.dataUrl;
    
    const mediaHtml = isTextOnly 
      ? `<div class="card-text-note" style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(139, 92, 246, 0.1); color: var(--text-main); text-align: center; padding: 20px;">
           <i data-lucide="file-text" style="width: 40px; height: 40px; margin-bottom: 10px; color: var(--accent-violet);"></i>
           <p style="font-size: 0.9rem; max-height: 60px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(photo.caption || 'Secret Note')}</p>
         </div>`
      : `<img src="${photo.dataUrl}" alt="${escapeHtml(photo.title)}" loading="lazy">`;

    card.innerHTML = `
      <div class="card-img-wrapper" ${!isTextOnly ? 'id="card-img-wrapper-' + photo.id + '"' : ''}>
        ${mediaHtml}
        <div class="card-overlay"></div>
        <span class="privacy-tag-top"><i data-lucide="${photo.privacy === 'only_me' ? 'lock' : 'users'}"></i> ${photo.privacy === 'only_me' ? 'Private' : 'Circle'}</span>
      </div>
      <div class="card-body">
        <h4 class="card-title">${escapeHtml(photo.title)}</h4>
        <div class="card-meta">
          <span>${formattedDate}</span>
          <div class="card-reactions-bar">
            <span class="rx-mini-pill">❤️ ${loveCount}</span>
            <span class="rx-mini-pill">🔥 ${fireCount}</span>
          </div>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openLightbox(photo);
    });

    if (!isTextOnly && photo.filter && window.AuraUploader) {
      setTimeout(() => {
        const imgEl = card.querySelector('img');
        if (imgEl) AuraUploader.applyCSSFilterToElement(imgEl, photo.filter);
      }, 0);
    }

    return card;
  }

  // Open Fullscreen Lightbox
  function openLightbox(photo) {
    activePhoto = photo;
    zoomLevel = 1;
    rotationAngle = 0;

    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const title = document.getElementById('lb-title');
    const date = document.getElementById('lb-date');
    const caption = document.getElementById('lb-caption');
    const privacyBadge = document.getElementById('lb-privacy-tag');
    const tagsList = document.getElementById('lb-tags-list');

    const textNote = document.getElementById('lightbox-text-note');

    if (img && textNote) {
      if (!photo.dataUrl) {
        img.style.display = 'none';
        textNote.style.display = 'flex';
        textNote.textContent = photo.caption || 'Secret Note';
      } else {
        textNote.style.display = 'none';
        img.style.display = 'block';
        img.src = photo.dataUrl;
        img.style.transform = `scale(1) rotate(0deg)`;
        
        if (photo.filter && window.AuraUploader) {
          AuraUploader.applyCSSFilterToElement(img, photo.filter);
        } else {
          img.style.filter = 'none';
        }
      }
    }
    if (title) title.textContent = photo.title;
    if (date) date.textContent = new Date(photo.timestamp).toLocaleDateString();
    if (caption) caption.textContent = photo.caption || 'No caption provided.';
    if (privacyBadge) privacyBadge.textContent = photo.privacy === 'only_me' ? 'Strict Private' : 'Circle Shared';

    // Tags
    if (tagsList) {
      tagsList.innerHTML = '';
      if (photo.tags && photo.tags.length > 0) {
        photo.tags.forEach(tag => {
          const badge = document.createElement('span');
          badge.className = 'tag-badge';
          badge.textContent = '#' + tag;
          tagsList.appendChild(badge);
        });
      }
    }

    updateReactionCounts();
    renderComments();

    if (modal) modal.classList.remove('hidden');

    if (window.lucide) {
      lucide.createIcons();
    }
  }

  function updateReactionCounts() {
    if (!activePhoto) return;
    const r = activePhoto.reactions || {};
    document.getElementById('rx-love-count').textContent = r.love || 0;
    document.getElementById('rx-fire-count').textContent = r.fire || 0;
    document.getElementById('rx-sparkles-count').textContent = r.sparkles || 0;
    document.getElementById('rx-vault-count').textContent = r.vault || 0;
  }

  function renderComments() {
    if (!activePhoto) return;
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;

    commentsList.innerHTML = '';
    const comments = activePhoto.comments || [];

    if (comments.length === 0) {
      commentsList.innerHTML = `<p class="text-dim" style="font-size:0.8rem; text-align:center; padding:10px;">No secret comments yet. Be the first to comment!</p>`;
    } else {
      comments.forEach(c => {
        const bubble = document.createElement('div');
        bubble.className = 'comment-bubble';
        bubble.innerHTML = `
          <div class="comment-author">${escapeHtml(c.author)} • <span style="color:var(--text-dim); font-weight:normal;">${c.time || 'just now'}</span></div>
          <div>${escapeHtml(c.text)}</div>
        `;
        commentsList.appendChild(bubble);
      });
    }
  }

  // Lightbox Zoom, Rotate, Reactions & Comment Handlers
  function setupLightboxControls() {
    const closeBtn = document.getElementById('close-lightbox');
    const zoomInBtn = document.getElementById('btn-zoom-in');
    const zoomOutBtn = document.getElementById('btn-zoom-out');
    const rotateBtn = document.getElementById('btn-rotate');
    const downloadBtn = document.getElementById('btn-download');
    const deleteBtn = document.getElementById('btn-delete-photo');
    const commentForm = document.getElementById('comment-form');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        const modal = document.getElementById('lightbox-modal');
        if (modal) modal.classList.add('hidden');
      });
    }

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => {
        zoomLevel = Math.min(zoomLevel + 0.3, 3);
        applyTransform();
      });
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => {
        zoomLevel = Math.max(zoomLevel - 0.3, 0.7);
        applyTransform();
      });
    }

    if (rotateBtn) {
      rotateBtn.addEventListener('click', () => {
        rotationAngle = (rotationAngle + 90) % 360;
        applyTransform();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        if (!activePhoto) return;
        const a = document.createElement('a');
        a.href = activePhoto.dataUrl;
        a.download = `${activePhoto.title.replace(/\s+/g, '_')}_aura.jpg`;
        a.click();
      });
    }

    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (!activePhoto) return;
        if (confirm(`Are you sure you want to delete "${activePhoto.title}" from your private vault?`)) {
          await AuraDB.deletePhoto(activePhoto.id);
          const modal = document.getElementById('lightbox-modal');
          if (modal) modal.classList.add('hidden');
          render();
        }
      });
    }

    // Reaction pills click
    const rxBar = document.querySelector('.reactions-bar');
    if (rxBar) {
      rxBar.addEventListener('click', async (e) => {
        const btn = e.target.closest('.rx-pill');
        if (!btn || !activePhoto) return;

        const rxType = btn.getAttribute('data-rx');
        if (!activePhoto.reactions) activePhoto.reactions = {};
        activePhoto.reactions[rxType] = (activePhoto.reactions[rxType] || 0) + 1;

        await AuraDB.savePhoto(activePhoto);
        updateReactionCounts();
        render();

        if (window.confetti) {
          window.confetti({ particleCount: 20, spread: 40 });
        }
      });
    }

    // Comment submission
    if (commentForm) {
      commentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!activePhoto) return;

        const authorInput = document.getElementById('comment-author');
        const textInput = document.getElementById('comment-text');

        const author = authorInput ? authorInput.value.trim() : 'Circle Member';
        const text = textInput ? textInput.value.trim() : '';

        if (!text) return;

        if (!activePhoto.comments) activePhoto.comments = [];
        activePhoto.comments.push({
          id: 'c-' + Date.now(),
          author,
          text,
          time: 'Just now'
        });

        await AuraDB.savePhoto(activePhoto);
        textInput.value = '';
        renderComments();
      });
    }
  }

  function applyTransform() {
    const img = document.getElementById('lightbox-img');
    if (img) {
      img.style.transform = `scale(${zoomLevel}) rotate(${rotationAngle}deg)`;
    }
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  return {
    init,
    render,
    openLightbox
  };
})();
