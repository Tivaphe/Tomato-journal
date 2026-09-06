/* ES module boundary for binary media. The journal state only keeps photo metadata. */
const DB_NAME = "tomato-journal-media-v1";
const STORE_NAME = "photos";
const VERSION = 1;
let databasePromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("indexeddb-request-failed"));
  });
}

function open() {
  if (!window.indexedDB) return Promise.reject(new Error("indexeddb-unavailable"));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error || new Error("indexeddb-open-failed"));
  }).catch((error) => {
    databasePromise = undefined;
    throw error;
  });
  return databasePromise;
}

async function put(id, blob) {
  const database = await open();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).put({ id, blob, updatedAt: new Date().toISOString() });
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(blob);
    transaction.onerror = () => reject(transaction.error || new Error("indexeddb-write-failed"));
    transaction.onabort = () => reject(transaction.error || new Error("indexeddb-write-aborted"));
  });
}

async function get(id) {
  const database = await open();
  const transaction = database.transaction(STORE_NAME, "readonly");
  const record = await requestResult(transaction.objectStore(STORE_NAME).get(id));
  return record?.blob || null;
}

async function remove(id) {
  const database = await open();
  const transaction = database.transaction(STORE_NAME, "readwrite");
  transaction.objectStore(STORE_NAME).delete(id);
  return new Promise((resolve, reject) => {
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error || new Error("indexeddb-delete-failed"));
    transaction.onabort = () => reject(transaction.error || new Error("indexeddb-delete-aborted"));
  });
}

window.TomatoPhotoStore = Object.freeze({ open, put, get, remove });
export { open, put, get, remove };
