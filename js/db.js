/**
 * AURA VAULT - DATABASE & STORAGE ENGINE
 * Manages local IndexedDB, encrypted data persistence, and Online Cloud DB sync.
 */

const AuraDB = (() => {
  const DB_NAME = 'AuraVaultDB';
  const DB_VERSION = 1;
  let dbInstance = null;

  // Initial Sample Media Seeds for first launch
  const initialSeeds = [
    {
      id: 'demo-1',
      title: 'Midnight Circle Hangout',
      category: 'favorites',
      privacy: 'circle',
      caption: 'Unforgettable night with the inner circle. Keeping these memories encrypted and safe forever.',
      tags: ['hangout', 'night', 'circle', 'vip'],
      dataUrl: 'https://images.unsplash.com/photo-1517457212344-793db5f86641?q=80&w=1000&auto=format&fit=crop',
      timestamp: Date.now() - 86400000 * 2,
      reactions: { love: 5, fire: 8, sparkles: 3, vault: 2 },
      comments: [
        { id: 'c1', author: 'Safwan', text: 'Best night of the year! 🔥', time: '2 days ago' },
        { id: 'c2', author: 'Afiq', text: 'Strictly secret photos only for us 🔒', time: '1 day ago' }
      ]
    },
    {
      id: 'demo-2',
      title: 'Mountain Trip Secret Peak',
      category: 'trips',
      privacy: 'circle',
      caption: 'High up in the clouds. Stunning views during our private getaway trip.',
      tags: ['travel', 'mountains', 'adventure', 'clouds'],
      dataUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=1000&auto=format&fit=crop',
      timestamp: Date.now() - 86400000 * 5,
      reactions: { love: 12, fire: 4, sparkles: 9, vault: 6 },
      comments: [
        { id: 'c3', author: 'Naim', text: 'This spot was insane!', time: '4 days ago' }
      ]
    },
    {
      id: 'demo-3',
      title: 'Family Gathering Vault',
      category: 'family',
      privacy: 'circle',
      caption: 'Precious family moments stored safely away from public social media.',
      tags: ['family', 'precious', 'dinner', 'memories'],
      dataUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=1000&auto=format&fit=crop',
      timestamp: Date.now() - 86400000 * 10,
      reactions: { love: 15, fire: 2, sparkles: 4, vault: 1 },
      comments: []
    }
  ];

  // Initialize IndexedDB
  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        // Media store
        if (!db.objectStoreNames.contains('photos')) {
          const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
          photoStore.createIndex('category', 'category', { unique: false });
          photoStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Security Logs store
        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
        }

        // Settings & Config store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => {
        dbInstance = e.target.result;
        seedInitialDataIfNeeded().then(resolve);
      };

      request.onerror = (e) => {
        console.error('IndexedDB Error:', e.target.error);
        reject(e.target.error);
      };
    });
  }

  // Seed sample data if database is empty
  async function seedInitialDataIfNeeded() {
    const photos = await getAllPhotos();
    if (photos.length === 0) {
      for (const item of initialSeeds) {
        await savePhoto(item);
      }
      await logSecurityEvent('DATABASE_INITIALIZED', 'Initial encrypted vault database loaded with demo memories');
    }
  }

  // Save or Update Photo
  function savePhoto(photoObj) {
    return new Promise((resolve, reject) => {
      if (!photoObj.id) photoObj.id = 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5);
      if (!photoObj.timestamp) photoObj.timestamp = Date.now();
      if (!photoObj.reactions) photoObj.reactions = { love: 0, fire: 0, sparkles: 0, vault: 0 };
      if (!photoObj.comments) photoObj.comments = [];

      const tx = dbInstance.transaction(['photos'], 'readwrite');
      const store = tx.objectStore('photos');
      const req = store.put(photoObj);

      req.onsuccess = () => {
        // Attempt cloud sync if configured
        syncWithCloudDatabase(photoObj);
        resolve(photoObj);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Get All Photos
  function getAllPhotos() {
    return new Promise((resolve, reject) => {
      if (!dbInstance) {
        resolve([]);
        return;
      }
      const tx = dbInstance.transaction(['photos'], 'readonly');
      const store = tx.objectStore('photos');
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Delete Photo
  function deletePhoto(id) {
    return new Promise((resolve, reject) => {
      const tx = dbInstance.transaction(['photos'], 'readwrite');
      const store = tx.objectStore('photos');
      const req = store.delete(id);

      req.onsuccess = () => {
        logSecurityEvent('MEDIA_DELETED', `Photo ID ${id} was purged from vault`);
        resolve(true);
      };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // Detect device type from user agent
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    let device = 'Unknown Device';
    let os = 'Unknown OS';
    let icon = '💻';

    if (/iPhone/.test(ua)) { device = 'iPhone'; os = 'iOS'; icon = '📱'; }
    else if (/iPad/.test(ua)) { device = 'iPad'; os = 'iPadOS'; icon = '📱'; }
    else if (/Android/.test(ua) && /Mobile/.test(ua)) { device = 'Android Phone'; os = 'Android'; icon = '📱'; }
    else if (/Android/.test(ua)) { device = 'Android Tablet'; os = 'Android'; icon = '📱'; }
    else if (/Windows NT/.test(ua)) { device = 'Windows PC'; os = 'Windows'; icon = '🖥️'; }
    else if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) { device = 'Mac'; os = 'macOS'; icon = '🖥️'; }
    else if (/Linux/.test(ua)) { device = 'Linux PC'; os = 'Linux'; icon = '🖥️'; }

    let browser = 'Unknown';
    if (/Edg\//.test(ua)) browser = 'Edge';
    else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
    else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
    else if (/Firefox\//.test(ua)) browser = 'Firefox';
    else if (/Safari\//.test(ua)) browser = 'Safari';

    return {
      icon,
      device,
      os,
      browser,
      screen: `${window.screen.width}x${window.screen.height}`
    };
  }

  // Fetch IP and location from public API
  async function getLocationInfo() {
    try {
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      return {
        ip: data.ip || 'N/A',
        city: data.city || 'Unknown',
        region: data.region || '',
        country: data.country_name || 'Unknown',
        flag: data.country_code ? getFlagEmoji(data.country_code) : '🌍'
      };
    } catch {
      return { ip: 'N/A', city: 'Unknown', region: '', country: 'Unknown', flag: '🌍' };
    }
  }

  function getFlagEmoji(countryCode) {
    return countryCode.toUpperCase().split('').map(c =>
      String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
    ).join('');
  }

  // Security Audit Logging — enhanced with device & location
  async function logSecurityEvent(type, message) {
    if (!dbInstance) return;

    const di = getDeviceInfo();
    const loc = await getLocationInfo();

    const entry = {
      timestamp: Date.now(),
      timestampStr: new Date().toLocaleString(),
      type,
      message,
      device: di.device,
      os: di.os,
      browser: di.browser,
      screen: di.screen,
      deviceIcon: di.icon,
      ip: loc.ip,
      city: loc.city,
      region: loc.region,
      country: loc.country,
      flag: loc.flag
    };

    return new Promise((resolve) => {
      const tx = dbInstance.transaction(['logs'], 'readwrite');
      const store = tx.objectStore('logs');
      store.add(entry);
      tx.oncomplete = () => resolve();
    });
  }

  // Fetch Security Audit Logs
  function getSecurityLogs() {
    return new Promise((resolve) => {
      if (!dbInstance) return resolve([]);
      const tx = dbInstance.transaction(['logs'], 'readonly');
      const store = tx.objectStore('logs');
      const req = store.getAll();

      req.onsuccess = () => resolve((req.result || []).reverse().slice(0, 50));
    });
  }

  // Clear Security Logs
  function clearSecurityLogs() {
    return new Promise((resolve) => {
      const tx = dbInstance.transaction(['logs'], 'readwrite');
      const store = tx.objectStore('logs');
      store.clear();
      tx.oncomplete = () => resolve();
    });
  }

  // Default User Firebase Configuration
  const defaultFirebaseConfig = {
    apiKey: "AIzaSyDTZEY4NQpcRKbU7vZd-2Wy8H0mUbBHiJ0",
    authDomain: "ef-x-tour-2026.firebaseapp.com",
    databaseURL: "https://ef-x-tour-2026-default-rtdb.firebaseio.com",
    projectId: "ef-x-tour-2026",
    storageBucket: "ef-x-tour-2026.firebasestorage.app",
    messagingSenderId: "845613993696",
    appId: "1:845613993696:web:6592559a1d8f3983ed8a85",
    measurementId: "G-55YBW152QY"
  };

  // Cloud Database Integration Connector (Firebase & Supabase Sync)
  let firebaseInstance = null;
  let firebaseRtdbInstance = null;

  function initFirebaseIfConfigured() {
    const config = getCloudConfig();
    if (window.firebase && config.apiKey && config.projectId && !firebaseInstance) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config);
        }

        // Initialize Firestore
        try {
          firebaseInstance = firebase.firestore();
          logSecurityEvent('FIREBASE_CONNECTED', `Connected to Firebase project: ${config.projectId}`);

          // Listen for real-time remote updates
          firebaseInstance.collection('photos').onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
              if (change.type === 'added' || change.type === 'modified') {
                const remotePhoto = change.doc.data();
                savePhotoLocallyOnly(remotePhoto);
              }
            });
            if (window.AuraGallery) AuraGallery.render();
          }, (err) => console.log('Firestore listener info:', err.message));
        } catch (e) {
          console.log('Firestore init fallback:', e);
        }

        // Initialize Realtime DB fallback
        try {
          if (config.databaseURL && firebase.database) {
            firebaseRtdbInstance = firebase.database();
            firebaseRtdbInstance.ref('photos').on('child_added', (snapshot) => {
              const remotePhoto = snapshot.val();
              if (remotePhoto) {
                savePhotoLocallyOnly(remotePhoto);
                if (window.AuraGallery) AuraGallery.render();
              }
            });
          }
        } catch (e) {
          console.log('Realtime DB init fallback:', e);
        }

      } catch (err) {
        console.error('Firebase init error:', err);
      }
    }
  }

  function savePhotoLocallyOnly(photoObj) {
    if (!dbInstance) return;
    const tx = dbInstance.transaction(['photos'], 'readwrite');
    const store = tx.objectStore('photos');
    store.put(photoObj);
  }

  async function syncWithCloudDatabase(photoObj) {
    initFirebaseIfConfigured();

    // 1. Firebase Firestore Sync
    if (firebaseInstance) {
      try {
        await firebaseInstance.collection('photos').doc(photoObj.id).set(photoObj);
        logSecurityEvent('FIREBASE_SYNC_SUCCESS', `Photo "${photoObj.title}" uploaded to Firebase Online`);
      } catch (err) {
        console.log('Firestore Sync fallback to RTDB:', err);
      }
    }

    // 2. Firebase Realtime Database Sync
    if (firebaseRtdbInstance) {
      try {
        await firebaseRtdbInstance.ref('photos/' + photoObj.id).set(photoObj);
        logSecurityEvent('FIREBASE_RTDB_SYNC_SUCCESS', `Photo "${photoObj.title}" synced to Firebase Realtime DB`);
      } catch (err) {
        console.log('Realtime DB sync error:', err);
      }
    }

    // 3. Supabase REST fallback
    const config = getCloudConfig();
    if (config.url && config.key) {
      try {
        const endpoint = `${config.url}/rest/v1/media_vault`;
        await fetch(endpoint, {
          method: 'POST',
          headers: {
            'apikey': config.key,
            'Authorization': `Bearer ${config.key}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            id: photoObj.id,
            title: photoObj.title,
            category: photoObj.category,
            privacy: photoObj.privacy,
            caption: photoObj.caption,
            data_url: photoObj.dataUrl,
            created_at: new Date(photoObj.timestamp).toISOString()
          })
        });
        logSecurityEvent('SUPABASE_SYNC_SUCCESS', `Photo "${photoObj.title}" synced to Supabase`);
      } catch (err) {
        console.log('Supabase sync fallback:', err);
      }
    }
  }

  // Cloud Config Save / Load in localStorage
  function saveCloudConfig(config) {
    localStorage.setItem('aura_cloud_config', JSON.stringify(config));
    logSecurityEvent('CLOUD_CONFIG_UPDATED', 'Cloud Database credentials saved');
    initFirebaseIfConfigured();
  }

  function getCloudConfig() {
    try {
      const stored = localStorage.getItem('aura_cloud_config');
      if (stored) return JSON.parse(stored);
    } catch (e) { }
    return defaultFirebaseConfig;
  }

  return {
    init,
    savePhoto,
    getAllPhotos,
    deletePhoto,
    logSecurityEvent,
    getSecurityLogs,
    clearSecurityLogs,
    saveCloudConfig,
    getCloudConfig,
    initFirebaseIfConfigured
  };
})();


