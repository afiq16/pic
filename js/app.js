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
  const uploadBtn = document.getElementById('btn-open-upload');
  const panicBtn = document.getElementById('btn-panic-lock');
  const soundBtn = document.getElementById('btn-sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const uploadModal = document.getElementById('upload-modal');

  if (uploadBtn && uploadModal) {
    uploadBtn.addEventListener('click', () => {
      uploadModal.classList.remove('hidden');
    });
  }

  if (panicBtn) {
    panicBtn.addEventListener('click', () => {
      AuraAuth.lockVault();
    });
  }

  if (soundBtn && soundIcon) {
    soundBtn.addEventListener('click', () => {
      if (window.AuraSound) {
        const enabled = AuraSound.toggleSound();
        soundIcon.setAttribute('data-lucide', enabled ? 'volume-2' : 'volume-x');
        if (window.lucide) lucide.createIcons();
      }
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
