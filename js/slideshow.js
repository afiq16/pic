/**
 * AURA VAULT - SLIDESHOW PRESENTATION MODULE
 * Interactive presentation mode with auto-play and smooth transitions.
 */

const AuraSlideshow = (() => {
  let photos = [];
  let currentIndex = 0;
  let isPlaying = false;
  let intervalTimer = null;

  function init() {
    setupSlideshowControls();
  }

  async function startSlideshow() {
    const allPhotos = await AuraDB.getAllPhotos();
    if (allPhotos.length === 0) {
      alert('No media items to present in slideshow!');
      return;
    }

    photos = allPhotos;
    currentIndex = 0;
    isPlaying = true;

    const overlay = document.getElementById('slideshow-overlay');
    if (overlay) overlay.classList.remove('hidden');

    displaySlide(0);
    startAutoPlay();
  }

  function displaySlide(index) {
    if (photos.length === 0) return;
    const photo = photos[index];

    const img = document.getElementById('slideshow-img');
    const textNote = document.getElementById('slideshow-text-note');
    const title = document.getElementById('slideshow-title');
    const desc = document.getElementById('slideshow-desc');

    if (img && textNote) {
      if (!photo.dataUrl) {
        img.style.display = 'none';
        textNote.style.display = 'flex';
        textNote.innerHTML = `<i data-lucide="file-text" style="width:64px;height:64px;margin-bottom:20px;"></i><br>${escapeHtml(photo.caption || 'Secret Note')}`;
      } else {
        textNote.style.display = 'none';
        img.style.display = 'block';
        img.src = photo.dataUrl;

        if (photo.filter && window.AuraUploader) {
          AuraUploader.applyCSSFilterToElement(img, photo.filter);
        } else {
          img.style.filter = 'none';
        }
      }
    }

    if (title) title.textContent = photo.title;
    if (desc) desc.textContent = photo.caption || 'Encrypted Memory';
    
    if (window.lucide) lucide.createIcons();
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function startAutoPlay() {
    stopAutoPlay();
    intervalTimer = setInterval(() => {
      currentIndex = (currentIndex + 1) % photos.length;
      displaySlide(currentIndex);
    }, 4000);
    updatePlayPauseIcon(true);
  }

  function stopAutoPlay() {
    if (intervalTimer) clearInterval(intervalTimer);
    intervalTimer = null;
    updatePlayPauseIcon(false);
  }

  function updatePlayPauseIcon(playing) {
    const btn = document.getElementById('ss-playpause');
    if (btn) {
      btn.innerHTML = `<i data-lucide="${playing ? 'pause' : 'play'}"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  function setupSlideshowControls() {
    const slideshowBtn = document.getElementById('btn-slideshow');
    const closeBtn = document.getElementById('close-slideshow');
    const prevBtn = document.getElementById('ss-prev');
    const nextBtn = document.getElementById('ss-next');
    const playPauseBtn = document.getElementById('ss-playpause');

    if (slideshowBtn) {
      slideshowBtn.addEventListener('click', () => {
        startSlideshow();
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        stopAutoPlay();
        const overlay = document.getElementById('slideshow-overlay');
        if (overlay) overlay.classList.add('hidden');
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        displaySlide(currentIndex);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % photos.length;
        displaySlide(currentIndex);
      });
    }

    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
          stopAutoPlay();
          isPlaying = false;
        } else {
          startAutoPlay();
          isPlaying = true;
        }
      });
    }
  }

  return {
    init,
    startSlideshow
  };
})();
