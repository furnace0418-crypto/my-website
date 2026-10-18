(() => {
  const VERSION = "20261018-3";
  const FILE_NAME = `taoyuan-desktop-assets-${VERSION}.zip`;
  const URL_PATH = `assets/desktop-assets-${VERSION}.zip`;
  const SHA256 = "4cc17e4688f6232791d680b56fe7d86ad7f22ed73da7c2d91e098972010d73c5";
  const DB_NAME = "taoyuan-local-assets";
  const STORE_NAME = "files";
  // This game password is intentionally available to the browser for automatic loading.
  const PACK_PASSWORD = "0927";
  const ZIP_LIBRARY_URL = new URL('assets/vendor/zip-2.24.0.min.js', document.currentScript.src).href;
  let zipLibrary;
  function loadZipLibrary() {
    if (window.zip) return Promise.resolve(window.zip);
    if (!zipLibrary) zipLibrary = new Promise((resolve, reject) => {
      const script = document.createElement('script');script.src = ZIP_LIBRARY_URL;
      script.onload = () => window.zip ? resolve(window.zip) : reject(new Error('ZIP reader unavailable'));
      script.onerror = () => { zipLibrary = null; script.remove(); reject(new Error('ZIP reader could not load')); };
      document.head.appendChild(script);
    });
    return zipLibrary;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function storedFile() {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).get("desktop-pack");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  }

  async function rememberPack(value) {
    const db = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put({ version: VERSION, ...value }, "desktop-pack");
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } finally {
      db.close();
    }
  }

  const rememberFile = handle => rememberPack({ handle });
  const rememberBlob = blob => rememberPack({ blob });

  async function unpackStoredZip(buffer) {
    const zip = await loadZipLibrary(), decoder = new TextDecoder();
    const entries = new Map();
    const reader = new zip.ZipReader(new zip.Uint8ArrayReader(new Uint8Array(buffer)), {password:PACK_PASSWORD,useWebWorkers:false});
    try {
      const files = await reader.getEntries();
      if (files.length > 1000) throw new Error('Too many asset entries');
      let total = 0;
      for (const entry of files) {
        if (entry.directory) continue;
        if (!entry.encrypted || entry.filename.includes('..') || entry.filename.startsWith('/') || entries.has(entry.filename)) throw new Error('Invalid asset entry');
        total += entry.uncompressedSize;
        if (total > 128 * 1024 * 1024) throw new Error('Asset pack is too large');
        entries.set(entry.filename, await entry.getData(new zip.Uint8ArrayWriter(), {checkSignature:true}));
      }
    } finally { await reader.close(); }
    if (!entries.has("assets/desktop-resource-manifest.json")) throw new Error("Asset manifest missing");
    const manifest = JSON.parse(decoder.decode(entries.get("assets/desktop-resource-manifest.json")));
    const items = manifest.items;
    if (manifest.version !== VERSION || !Array.isArray(items) || !items.length || new Set(items.map(item => item.path)).size !== items.length || items.some(item => !/^assets\/(?!.*\.\.)/.test(item.path) || !entries.has(item.path) || entries.get(item.path).length !== item.bytes || typeof item.mime !== 'string')) {
      throw new Error("Asset pack is incomplete");
    }
    return { items, entries };
  }

  async function readStored(saved) {
    const file = saved.handle ? await saved.handle.getFile() : saved.blob;
    if (!file) throw new Error("Saved asset pack is missing");
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    if (hex !== SHA256) throw new Error("Asset pack version or contents do not match");
    return unpackStoredZip(buffer);
  }

  window.DesktopAssetPack = { VERSION, FILE_NAME, URL_PATH, storedFile, rememberFile, rememberBlob, readStored };
})();

