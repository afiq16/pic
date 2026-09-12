/**
 * AURA VAULT - ADVANCED HARDCORE SECURITY MODULE
 * Custom Master Passcode setup, Decoy Mode PIN, Anti-Brute Force Lockout, Haptics & Sound FX.
 */

const AuraAuth = (() => {
  let enteredPin = '';
  let failedAttempts = 0;
  let isLockedOut = false;
  let isDecoyMode = false;
  let sessionTimeoutTimer = null;

  const DECOY_PIN = '1111'; // Decoy fake mode PIN

  function init() {
    checkFirstTimeSetup();
    setupKeypadEvents();
    setupInactivityTimer();
  }

  function getMasterPin() {
    return localStorage.getItem('aura_master_pin');
  }

  function checkFirstTimeSetup() {
    const masterPin = getMasterPin();
    const firstTimeBox = document.getElementById('first-time-box');
    const subtitleText = document.getElementById('auth-subtitle-text');

    if (!masterPin) {
      if (firstTimeBox) firstTimeBox.classList.remove('hidden');
      if (subtitleText) subtitleText.textContent = 'First Time Launch • Create Your 4-Digit Master PIN';
    } else {
      if (firstTimeBox) firstTimeBox.classList.add('hidden');
      if (subtitleText) subtitleText.textContent = 'Military-Grade Security • Enter Master Passcode';
    }
  }

  function setupKeypadEvents() {
    const keypad = document.getElementById('keypad-grid');
    if (!keypad) return;

    keypad.addEventListener('click', (e) => {
      const btn = e.target.closest('.key-btn');
      if (!btn || isLockedOut) return;

      if (window.AuraSound) AuraSound.playClick();
      const key = btn.getAttribute('data-key');
      handleKeyPress(key);
    });

    document.addEventListener('keydown', (e) => {
      const authGate = document.getElementById('auth-gate');
      if (authGate && !authGate.classList.contains('hidden') && !isLockedOut) {
        if (e.key >= '0' && e.key <= '9') {
          if (window.AuraSound) AuraSound.playClick();
          handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
          handleKeyPress('clear');
        } else if (e.key === 'Enter') {
          handleKeyPress('submit');
        }
      }
    });

    const setPassBtn = document.getElementById('btn-set-custom-pass');
    if (setPassBtn) {
      setPassBtn.addEventListener('click', () => {
        const masterPin = getMasterPin();
        if (masterPin) {
          const current = prompt('Enter Current Master Passcode:');
          if (current !== masterPin) {
            alert('Incorrect Current Passcode!');
            return;
          }
        }
        const newPin = prompt('Enter NEW 4-digit Master Passcode:');
        if (newPin && newPin.length === 4 && !isNaN(newPin)) {
          localStorage.setItem('aura_master_pin', newPin);
          alert('Master Passcode successfully updated! Only you now possess this secret key.');
          AuraDB.logSecurityEvent('MASTER_PIN_UPDATED', 'Master passcode was changed');
          checkFirstTimeSetup();
        } else {
          alert('Invalid input. Passcode must be 4 digits.');
        }
      });
    }

    const decoyBtn = document.getElementById('btn-decoy-info');
    if (decoyBtn) {
      decoyBtn.addEventListener('click', () => {
        alert('DECOY MODE PROTECTION:\n\nIf you are ever forced to unlock your vault in front of an intruder, enter PIN "1111".\n\nThis opens a fake decoy gallery displaying public dummy photos while keeping your real secret memories completely hidden!');
      });
    }
  }

  function handleKeyPress(key) {
    const errorMsg = document.getElementById('auth-error-msg');
    if (errorMsg) errorMsg.classList.add('hidden');

    if (window._pinTimer) clearTimeout(window._pinTimer);

    if (key === 'clear') {
      enteredPin = '';
    } else if (key === 'submit') {
      verifyPin();
      return;
    } else if (enteredPin.length < 4) {
      enteredPin += key;
    }

    updatePinDots();

    if (enteredPin.length === 4) {
      window._pinTimer = setTimeout(verifyPin, 150);
    }
  }

  function updatePinDots() {
    const dots = document.querySelectorAll('#pin-dots .dot');
    dots.forEach((dot, idx) => {
      if (idx < enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  function verifyPin() {
    const masterPin = getMasterPin();

    // ---- First Time Setup ----
    if (!masterPin) {
      if (enteredPin.length === 4) {
        localStorage.setItem('aura_master_pin', enteredPin);
        AuraDB.logSecurityEvent('MASTER_PIN_CREATED', 'Initial Master passcode established').catch(() => {});
        checkFirstTimeSetup();
        unlockVault(false);
        enteredPin = '';
        updatePinDots();
        return;
      }
      return;
    }

    // Decoy Mode Activation
    if (enteredPin === DECOY_PIN) {
      if (window.AuraSound) AuraSound.playUnlockSuccess();
      isDecoyMode = true;
      AuraDB.logSecurityEvent('DECOY_MODE_ACTIVATED', 'Decoy vault unlocked via fake PIN').catch(() => {});
      unlockVault(true);
      enteredPin = '';
      updatePinDots();
      return;
    }

    // Real Master Lock Verification
    if (enteredPin === masterPin) {
      if (window.AuraSound) AuraSound.playUnlockSuccess();
      isDecoyMode = false;
      failedAttempts = 0;
      AuraDB.logSecurityEvent('VAULT_UNLOCKED', 'Master vault successfully unlocked').catch(() => {});
      unlockVault(false);
      enteredPin = '';
      updatePinDots();
    } else {
      // Failed attempt
      if (window.AuraSound) AuraSound.playAccessDenied();
      failedAttempts++;
      AuraDB.logSecurityEvent('FAILED_UNLOCK', `Failed attempt #${failedAttempts}`).catch(() => {});

      enteredPin = '';
      updatePinDots();

      const errorMsg = document.getElementById('auth-error-msg');
      const errorText = document.getElementById('error-text');

      if (failedAttempts >= 3) {
        triggerLockout();
      } else {
        if (errorText) errorText.textContent = `Access Denied: Invalid Security Key (${3 - failedAttempts} attempts left)`;
        if (errorMsg) errorMsg.classList.remove('hidden');
      }
    }
  }

  function triggerLockout() {
    isLockedOut = true;
    let secondsLeft = 30;
    const errorMsg = document.getElementById('auth-error-msg');
    const errorText = document.getElementById('error-text');

    if (errorMsg) errorMsg.classList.remove('hidden');

    const interval = setInterval(() => {
      secondsLeft--;
      if (errorText) errorText.textContent = `SYSTEM LOCKOUT ACTIVE: Try again in ${secondsLeft}s`;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        isLockedOut = false;
        failedAttempts = 0;
        if (errorMsg) errorMsg.classList.add('hidden');
      }
    }, 1000);
  }

  function unlockVault(decoy) {
    const authGate    = document.getElementById('auth-gate');
    const appContainer= document.getElementById('app-container');
    const badge       = document.getElementById('vault-mode-badge');

    if (authGate)     authGate.classList.add('hidden');
    if (appContainer) appContainer.classList.remove('hidden');

    if (badge) {
      if (decoy) {
        badge.innerHTML = `<i data-lucide="eye-off"></i> Decoy Safe Mode`;
        badge.style.color = 'var(--accent-rose)';
      } else {
        badge.innerHTML = `<i data-lucide="shield-check"></i> Encrypted Vault Master`;
        badge.style.color = 'var(--accent-emerald)';
      }
    }

    resetInactivityTimer();

    if (window.confetti && !decoy) {
      window.confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
    }

    if (window.lucide) lucide.createIcons();
    if (window.AuraGallery) AuraGallery.render();
  }

  function lockVault() {
    const authGate     = document.getElementById('auth-gate');
    const appContainer = document.getElementById('app-container');

    if (appContainer) appContainer.classList.add('hidden');
    if (authGate)     authGate.classList.remove('hidden');

    clearTimeout(sessionTimeoutTimer);
    enteredPin = '';
    updatePinDots();
    const errMsg = document.getElementById('auth-error-msg');
    if (errMsg) errMsg.classList.add('hidden');

    AuraDB.logSecurityEvent('VAULT_LOCKED', 'Vault locked').catch(() => {});
  }

  function setupInactivityTimer() {
    const events = ['mousemove', 'keypress', 'click', 'scroll', 'touchstart'];
    events.forEach(ev => {
      document.addEventListener(ev, resetInactivityTimer, { passive: true });
    });
  }

  function resetInactivityTimer() {
    clearTimeout(sessionTimeoutTimer);

    const storedMins = localStorage.getItem('aura_autolock_mins');
    const mins = storedMins !== null ? parseInt(storedMins, 10) : 5;
    
    if (mins === 0) return; // 0 means Never Lock

    const timeoutMs = mins * 60 * 1000;

    sessionTimeoutTimer = setTimeout(() => {
      const appContainer = document.getElementById('app-container');
      if (appContainer && !appContainer.classList.contains('hidden')) {
        lockVault();
        AuraDB.logSecurityEvent('SESSION_TIMEOUT', `Auto-lock after ${mins} min inactivity`).catch(() => {});
      }
    }, timeoutMs);
  }

  return {
    init,
    lockVault,
    unlockVault,
    isDecoyMode: () => isDecoyMode
  };
})();
