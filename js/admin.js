/**
 * AURA VAULT - MASTER CONTROL HUB & PRIVACY SHIELD
 * Manages tab privacy shield, anti-inspect protection, backup export, and website control settings.
 */

const AuraAdmin = (() => {
  let tabShieldEnabled = true;
  let antiInspectEnabled = true;

  function init() {
    setupTabPrivacyShield();
    setupAntiInspect();
    setupAdminModalEvents();
  }

  function setupTabPrivacyShield() {
    const shield = document.getElementById('tab-privacy-shield');

    window.addEventListener('blur', () => {
      if (tabShieldEnabled && shield) {
        shield.classList.remove('hidden');
      }
    });

    window.addEventListener('focus', () => {
      if (shield) {
        shield.classList.add('hidden');
      }
    });
  }

  function setupAntiInspect() {
    document.addEventListener('contextmenu', (e) => {
      if (antiInspectEnabled) {
        const appContainer = document.getElementById('app-container');
        if (appContainer && !appContainer.classList.contains('hidden')) {
          e.preventDefault();
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (antiInspectEnabled) {
        // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' || 
           (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
           (e.ctrlKey && e.key === 'u')) {
          e.preventDefault();
        }
      }
    });
  }

  function setupAdminModalEvents() {
    const adminBtn = document.getElementById('btn-master-admin');
    const adminModal = document.getElementById('admin-modal');
    const closeAdminBtn = document.getElementById('close-admin-modal');
    const saveAdminBtn = document.getElementById('btn-save-admin');
    const exportBtn = document.getElementById('btn-export-vault');
    const purgeBtn = document.getElementById('btn-purge-local');

    if (adminBtn && adminModal) {
      adminBtn.addEventListener('click', async () => {
        adminModal.classList.remove('hidden');

        // Vault Analytics Calculation
        try {
          const photos = await AuraDB.getAllPhotos();
          
          let totalNotes = 0;
          let totalBytes = 0;

          photos.forEach(p => {
            if (!p.dataUrl) {
              totalNotes++;
            } else {
              totalBytes += p.dataUrl.length;
            }
          });

          const sizeMB = (totalBytes * 0.75 / (1024 * 1024)).toFixed(2);

          const statTotal = document.getElementById('admin-stat-total');
          const statNotes = document.getElementById('admin-stat-notes');
          const statSize = document.getElementById('admin-stat-size');

          if (statTotal) statTotal.textContent = photos.length;
          if (statNotes) statNotes.textContent = totalNotes;
          if (statSize) statSize.textContent = sizeMB + ' MB';
        } catch (err) {
          console.error("Error calculating vault analytics", err);
        }

        // Render Access Intelligence Logs
        renderAccessLogs();
      });
    }

    if (closeAdminBtn && adminModal) {
      closeAdminBtn.addEventListener('click', () => {
        adminModal.classList.add('hidden');
      });
    }

    if (saveAdminBtn) {
      saveAdminBtn.addEventListener('click', () => {
        const shieldToggle = document.getElementById('toggle-tab-shield');
        const inspectToggle = document.getElementById('toggle-anti-inspect');
        const timeoutSelect = document.getElementById('select-autolock-time');

        tabShieldEnabled = shieldToggle ? shieldToggle.checked : true;
        antiInspectEnabled = inspectToggle ? inspectToggle.checked : true;

        const timeoutMins = parseInt(timeoutSelect ? timeoutSelect.value : '5', 10);
        localStorage.setItem('aura_autolock_mins', timeoutMins);

        AuraDB.logSecurityEvent('ADMIN_SETTINGS_SAVED', `Anti-peek: ${tabShieldEnabled}, Anti-inspect: ${antiInspectEnabled}, Timeout: ${timeoutMins}m`);
        alert('Master Control settings saved successfully!');

        if (adminModal) adminModal.classList.add('hidden');
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        const photos = await AuraDB.getAllPhotos();
        const logs = await AuraDB.getSecurityLogs();

        const backupData = {
          vaultVersion: '2.0',
          exportDate: new Date().toISOString(),
          photosCount: photos.length,
          photos,
          logs
        };

        const jsonStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `AuraVault_Encrypted_Backup_${Date.now()}.json`;
        a.click();

        AuraDB.logSecurityEvent('VAULT_EXPORTED', `Vault data backup exported (${photos.length} media items)`);
      });
    }

    if (purgeBtn) {
      purgeBtn.addEventListener('click', async () => {
        if (confirm('EMERGENCY WIPE: Are you sure you want to clear all locally cached memories on this device?')) {
          localStorage.clear();
          indexedDB.deleteDatabase('AuraVaultDB');
          alert('Local Cache Wiped! Application will now reload.');
          location.reload();
        }
      });
    }

    const clearLogsBtn = document.getElementById('btn-clear-logs');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', async () => {
        if (confirm('Clear all access logs from this device?')) {
          await AuraDB.clearSecurityLogs();
          renderAccessLogs();
        }
      });
    }
  }

  // ---- Render Access Intelligence Logs ----
  async function renderAccessLogs() {
    const container = document.getElementById('access-log-container');
    const empty = document.getElementById('access-log-empty');
    if (!container) return;

    const logs = await AuraDB.getSecurityLogs();

    // Remove old log cards (keep empty message)
    container.querySelectorAll('.access-log-card').forEach(el => el.remove());

    if (!logs || logs.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    const eventStyles = {
      'VAULT_UNLOCKED': { color: 'var(--accent-emerald)', icon: '🔓', label: 'Unlocked' },
      'DECOY_MODE_ACTIVATED': { color: '#f59e0b', icon: '🎭', label: 'Decoy Mode' },
      'FAILED_UNLOCK': { color: 'var(--accent-rose)', icon: '🚫', label: 'Failed Attempt' },
      'SESSION_TIMEOUT': { color: 'var(--accent-cyan)', icon: '⏱️', label: 'Auto Lock' },
      'VAULT_LOCKED': { color: 'var(--accent-violet)', icon: '🔒', label: 'Locked' },
      'MEDIA_UPLOADED': { color: 'var(--accent-cyan)', icon: '📤', label: 'Upload' },
      'MEDIA_DELETED': { color: 'var(--accent-rose)', icon: '🗑️', label: 'Deleted' },
      'VAULT_EXPORTED': { color: '#f59e0b', icon: '💾', label: 'Exported' },
      'ADMIN_SETTINGS_SAVED': { color: 'var(--accent-violet)', icon: '⚙️', label: 'Settings Saved' },
    };

    logs.forEach(log => {
      const style = eventStyles[log.type] || { color: 'var(--text-muted)', icon: '📋', label: log.type };
      const ts = log.timestampStr || log.timestamp;
      const card = document.createElement('div');
      card.className = 'access-log-card';
      card.style.cssText = `
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-left: 3px solid ${style.color};
        border-radius: var(--radius-sm);
        padding: 10px 12px;
        font-size: 0.82rem;
        animation: fadeInUp 0.3s ease;
      `;

      const deviceLine = log.device ? `${log.deviceIcon || '📋'} <strong>${log.device}</strong> (${log.os || ''} · ${log.browser || ''} · ${log.screen || ''})` : '📋 Unknown Device';
      const locationLine = log.city ? `${log.flag || '🌍'} <strong>${log.city}${log.region ? ', ' + log.region : ''}</strong> — ${log.country} &nbsp;·&nbsp; IP: <code style="color: var(--accent-cyan)">${log.ip}</code>` : '🌍 Location unavailable';

      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <span style="color:${style.color}; font-weight:600;">${style.icon} ${style.label}</span>
          <span style="color: var(--text-dim);">${ts}</span>
        </div>
        <div style="color: var(--text-main); margin-bottom: 3px;">${deviceLine}</div>
        <div style="color: var(--text-muted);">${locationLine}</div>
      `;
      container.appendChild(card);
    });

    if (window.lucide) lucide.createIcons();
  }


  return {
    init,
    isTabShieldActive: () => tabShieldEnabled
  };
})();
