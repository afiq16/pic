/**
 * AURA VAULT - UPLOADER MODULE
 * Handles drag and drop, base64 conversion, canvas compression, photo filter presets, and Firebase online sync.
 */

const AuraUploader = (() => {
  let selectedFileDataUrl = null;
  let activeFilter = 'none';

  function init() {
    setupDragAndDrop();
    setupFilterPresets();
    setupFormSubmission();
  }

  function setupFilterPresets() {
    const filterBtns = document.querySelectorAll('.filter-preset-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.getAttribute('data-filter');

        const previewImg = document.getElementById('preview-img');
        if (previewImg) {
          applyCSSFilterToElement(previewImg, activeFilter);
        }
      });
    });
  }

  function applyCSSFilterToElement(el, filter) {
    if (filter === 'cyber') el.style.filter = 'contrast(125%) hue-rotate(180deg) saturate(140%)';
    else if (filter === 'noir') el.style.filter = 'grayscale(100%) contrast(150%)';
    else if (filter === 'vintage') el.style.filter = 'sepia(50%) contrast(110%) saturate(120%)';
    else if (filter === 'hdr') el.style.filter = 'saturate(180%) contrast(130%) brightness(105%)';
    else el.style.filter = 'none';
  }

  function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const removePreviewBtn = document.getElementById('btn-remove-preview');

    if (!dropZone || !fileInput) return;

    ['dragenter', 'dragover'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropZone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      }, false);
    });

    dropZone.addEventListener('drop', (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
      }
    });

    if (removePreviewBtn) {
      removePreviewBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUploadPreview();
      });
    }
  }

  function handleFileSelect(file) {
    if (!file.type.match('image.*')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      // 700px max, 0.65 quality ≈ 200-400KB base64 — fits Firestore 1MB limit
      compressImage(e.target.result, 700, 700, 0.65, (compressedDataUrl) => {
        selectedFileDataUrl = compressedDataUrl;
        displayPreview(compressedDataUrl);
      });
    };
    reader.readAsDataURL(file);
  }

  function compressImage(base64Str, maxWidth, maxHeight, quality, callback) {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      callback(compressedBase64);
    };
  }

  function displayPreview(dataUrl) {
    const prompt = document.getElementById('drop-prompt');
    const previewContainer = document.getElementById('drop-preview-container');
    const previewImg = document.getElementById('preview-img');

    if (prompt) prompt.classList.add('hidden');
    if (previewContainer) previewContainer.classList.remove('hidden');
    if (previewImg) {
      previewImg.src = dataUrl;
      applyCSSFilterToElement(previewImg, activeFilter);
    }
  }

  function resetUploadPreview() {
    selectedFileDataUrl = null;
    const prompt = document.getElementById('drop-prompt');
    const previewContainer = document.getElementById('drop-preview-container');
    const fileInput = document.getElementById('file-input');

    if (prompt) prompt.classList.remove('hidden');
    if (previewContainer) previewContainer.classList.add('hidden');
    if (fileInput) fileInput.value = '';
  }

  function setupFormSubmission() {
    const form = document.getElementById('upload-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const category = document.getElementById('media-category').value;
      
      if (!selectedFileDataUrl && category !== 'notes') {
        alert('Please select or drag an image first!');
        return;
      }

      const title = document.getElementById('media-title').value.trim();
      const privacy = document.getElementById('media-privacy').value;
      const caption = document.getElementById('media-caption').value.trim();
      const tagsRaw = document.getElementById('media-tags').value.trim();

      const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];

      const photoObj = {
        title,
        category,
        privacy,
        caption,
        filter: activeFilter,
        tags,
        dataUrl: selectedFileDataUrl || '', // Empty for text-only notes
        timestamp: Date.now()
      };

      try {
        await AuraDB.savePhoto(photoObj);
        AuraDB.logSecurityEvent('MEDIA_UPLOADED', `Uploaded "${title}" [${category}]`).catch(() => {});

        const modal = document.getElementById('upload-modal');
        if (modal) modal.classList.add('hidden');

        form.reset();
        resetUploadPreview();

        AuraGallery.render();

        if (window.confetti) {
          window.confetti({ particleCount: 50, spread: 60 });
        }
      } catch (err) {
        alert('Upload Error: ' + err.message);
      }
    });

    const cancelBtn = document.getElementById('btn-cancel-upload');
    const closeBtn = document.getElementById('close-upload-modal');

    [cancelBtn, closeBtn].forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          const modal = document.getElementById('upload-modal');
          if (modal) modal.classList.add('hidden');
        });
      }
    });
  }

  return {
    init,
    resetUploadPreview,
    applyCSSFilterToElement
  };
})();
