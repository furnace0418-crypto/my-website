(() => {
  const VERSION = "20261005-2";
  const FILE_NAME = `taoyuan-desktop-assets-${VERSION}.zip`;
  const URL_PATH = `assets/desktop-assets-${VERSION}.zip`;
  const SHA256 = "5d91e3422947937665146f30f719d8dd1527257f1ca19db8b22eda53925f52e3";
  const DB_NAME = "taoyuan-local-assets";
  const STORE_NAME = "files";

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

  function unpackStoredZip(buffer) {
    const view = new DataView(buffer), decoder = new TextDecoder();
    const entries = new Map();
    let offset = 0;
    while (offset + 30 <= buffer.byteLength && view.getUint32(offset, true) === 0x04034b50) {
      const flags = view.getUint16(offset + 6, true);
      const method = view.getUint16(offset + 8, true);
      const length = view.getUint32(offset + 18, true);
      const plainLength = view.getUint32(offset + 22, true);
      const nameLength = view.getUint16(offset + 26, true);
      const extraLength = view.getUint16(offset + 28, true);
      const dataOffset = offset + 30 + nameLength + extraLength;
      if ((flags & 8) || method !== 0 || length !== plainLength || dataOffset + length > buffer.byteLength) {
        throw new Error("Unsupported or damaged asset pack");
      }
      const name = decoder.decode(new Uint8Array(buffer, offset + 30, nameLength));
      entries.set(name, new Uint8Array(buffer, dataOffset, length));
      offset = dataOffset + length;
    }
    if (!entries.has("assets/image-preload-manifest.json")) throw new Error("Asset manifest missing");
    const items = JSON.parse(decoder.decode(entries.get("assets/image-preload-manifest.json")));
    if (!Array.isArray(items) || items.length !== 94 || items.some(item => !entries.has(item.path))) {
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
