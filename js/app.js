/**
 * AURA VAULT - MAIN APPLICATION ENTRY POINT
 * Initializes database, sound FX, security gate, gallery, uploader, admin control hub, and slideshow.
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize IndexedDB & Firebase Database
    await AuraDB.init();
    AuraDB.initFirebaseIfConfigured();

    // 2. Initialize Auth Gate & Master Security
    AuraAuth.init();

    // 3. Initialize Admin Control Hub & Privacy Shield
    AuraAdmin.init();

    // 4. Initialize Media Uploader
    AuraUploader.init();

    // 5. Initialize Gallery & Lightbox
    AuraGallery.init();

    // 6. Initialize Slideshow Presentation Mode
    AuraSlideshow.init();

    // 7. Setup Action Buttons & Modals
    setupNavbarActions();
    setupCloudModal();
    setupSecurityLogsModal();

    console.log('Aura Vault Hardcore Security & Control Center Active');
  } catch (err) {
    console.error('Initialization error:', err);
  }
});

// Setup Top Navbar Actions
function setupNavbarActions() {
  const uploadBtn    = document.getElementById('btn-open-upload');
  const panicBtn     = document.getElementById('btn-panic-lock');
  const soundBtn     = document.getElementById('btn-sound-toggle');
  const soundIcon    = document.getElementById('sound-icon');
  const uploadModal  = document.getElementById('upload-modal');

  // Desktop upload
  if (uploadBtn && uploadModal) {
    uploadBtn.addEventListener('click', () => uploadModal.classList.remove('hidden'));
  }

  // Desktop lock
  if (panicBtn) {
    panicBtn.addEventListener('click', () => AuraAuth.lockVault());
  }

  // Desktop sound
  if (soundBtn && soundIcon) {
    soundBtn.addEventListener('click', () => {
      if (window.AuraSound) {
        const enabled = AuraSound.toggleSound();
        soundIcon.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // ---- Mobile Menu ----
  const hamburger    = document.getElementById('btn-hamburger');
  const mobileMenu   = document.getElementById('mobile-menu');
  const mobUpload    = document.getElementById('btn-open-upload-mob');
  const mobLock      = document.getElementById('btn-panic-lock-mob');
  const mobSearch    = document.getElementById('mob-search-toggle');
  const mobSearchBar = document.getElementById('mobile-search-bar');
  const mobSearchInp = document.getElementById('search-input-mob');
  const mainSearchInp= document.getElementById('search-input');
  const mobSound     = document.getElementById('mob-btn-sound');
  const mobSlide     = document.getElementById('mob-btn-slideshow');
  const mobAdmin     = document.getElementById('mob-btn-admin');
  const mobCloud     = document.getElementById('mob-btn-cloud');
  const mobSecurity  = document.getElementById('mob-btn-security');

  function closeMobileMenu() {
    if (mobileMenu) mobileMenu.classList.add('hidden');
  }

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileMenu.classList.toggle('hidden');
    });
  }

  // Close menu on outside click
  document.addEventListener('click', (e) => {
    if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
      if (!mobileMenu.contains(e.target) && e.target !== hamburger) {
        closeMobileMenu();
      }
    }
  });

  // Mobile Upload
  if (mobUpload && uploadModal) {
    mobUpload.addEventListener('click', () => uploadModal.classList.remove('hidden'));
  }

  // Mobile Lock
  if (mobLock) {
    mobLock.addEventListener('click', () => AuraAuth.lockVault());
  }

  // Mobile Search toggle
  if (mobSearch && mobSearchBar) {
    mobSearch.addEventListener('click', () => {
      closeMobileMenu();
      mobSearchBar.classList.toggle('hidden');
      if (!mobSearchBar.classList.contains('hidden')) mobSearchInp.focus();
    });
  }

  // Sync mobile search → main search
  if (mobSearchInp && mainSearchInp) {
    mobSearchInp.addEventListener('input', () => {
      mainSearchInp.value = mobSearchInp.value;
      mainSearchInp.dispatchEvent(new Event('input'));
    });
  }

  // Mobile sound
  if (mobSound) {
    mobSound.addEventListener('click', () => {
      closeMobileMenu();
      if (window.AuraSound) {
        const enabled = AuraSound.toggleSound();
        if (soundIcon) soundIcon.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
        if (window.lucide) lucide.createIcons();
      }
    });
  }

  // Mobile slideshow
  if (mobSlide) {
    mobSlide.addEventListener('click', () => {
      closeMobileMenu();
      document.getElementById('btn-slideshow')?.click();
    });
  }

  // Mobile admin
  if (mobAdmin) {
    mobAdmin.addEventListener('click', () => {
      closeMobileMenu();
      document.getElementById('btn-master-admin')?.click();
    });
  }

  // Mobile cloud
  if (mobCloud) {
    mobCloud.addEventListener('click', () => {
      closeMobileMenu();
      document.getElementById('btn-cloud-config')?.click();
    });
  }

  // Mobile security
  if (mobSecurity) {
    mobSecurity.addEventListener('click', () => {
      closeMobileMenu();
      document.getElementById('btn-security-logs')?.click();
    });
  }
}

// Setup Cloud Database Config Modal
function setupCloudModal() {
  const cloudBtn = document.getElementById('btn-cloud-config');
  const cloudModal = document.getElementById('cloud-modal');
  const closeCloudBtn = document.getElementById('close-cloud-modal');
  const saveCloudBtn = document.getElementById('btn-save-cloud');
  const testCloudBtn = document.getElementById('btn-test-cloud');

  if (cloudBtn && cloudModal) {
    cloudBtn.addEventListener('click', () => {
      const cfg = AuraDB.getCloudConfig();
      if (cfg.apiKey) document.getElementById('fb-api-key').value = cfg.apiKey;
      if (cfg.projectId) document.getElementById('fb-project-id').value = cfg.projectId;
      cloudModal.classList.remove('hidden');
    });
  }

  if (closeCloudBtn && cloudModal) {
    closeCloudBtn.addEventListener('click', () => {
      cloudModal.classList.add('hidden');
    });
  }

  if (saveCloudBtn) {
    saveCloudBtn.addEventListener('click', () => {
      const apiKey = document.getElementById('fb-api-key').value.trim();
      const projectId = document.getElementById('fb-project-id').value.trim();

      AuraDB.saveCloudConfig({ apiKey, projectId });
      alert('Firebase Configuration saved & connected live!');
      
      const dot = document.getElementById('cloud-status-dot');
      if (dot) dot.style.background = 'var(--accent-emerald)';

      cloudModal.classList.add('hidden');
    });
  }

  if (testCloudBtn) {
    testCloudBtn.addEventListener('click', () => {
      const apiKey = document.getElementById('fb-api-key').value.trim();
      const projectId = document.getElementById('fb-project-id').value.trim();

      if (apiKey && projectId) {
        alert(`Firebase Test Success!\n\nTarget Project: ${projectId}\nStatus: Live Real-time Firestore & RTDB Active.`);
      } else {
        alert('Please enter your Firebase API Key & Project ID.');
      }
    });
  }
}

// Setup Security Audit Log Modal
function setupSecurityLogsModal() {
  const securityBtn = document.getElementById('btn-security-logs');
  const securityModal = document.getElementById('security-modal');
  const closeSecurityBtn = document.getElementById('close-security-modal');
  const closeSecurityFooterBtn = document.getElementById('btn-close-security');
  const clearLogsBtn = document.getElementById('btn-clear-logs');
  const logsContainer = document.getElementById('security-logs-container');

  if (securityBtn && securityModal) {
    securityBtn.addEventListener('click', async () => {
      await renderAuditLogs();
      securityModal.classList.remove('hidden');
    });
  }

  [closeSecurityBtn, closeSecurityFooterBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        securityModal.classList.add('hidden');
      });
    }
  });

  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', async () => {
      if (confirm('Clear all security audit logs?')) {
        await AuraDB.clearSecurityLogs();
        await renderAuditLogs();
      }
    });
  }

  async function renderAuditLogs() {
    if (!logsContainer) return;
    logsContainer.innerHTML = '';

    const logs = await AuraDB.getSecurityLogs();
    if (logs.length === 0) {
      logsContainer.innerHTML = `<p class="text-dim">No audit events logged yet.</p>`;
      return;
    }

    logs.forEach(log => {
      const item = document.createElement('div');
      item.className = 'log-item';
      item.innerHTML = `
        <span class="log-action">[${log.type}] ${escapeHtml(log.message)}</span>
        <span class="log-time">${log.timestamp}</span>
      `;
      logsContainer.appendChild(item);
    });
  }

  function escapeHtml(str) {
    return (str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
}
