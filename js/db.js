const DB_NAME = 'lunch-db';
const DB_VERSION = 1;
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('dishes')) {
        const store = db.createObjectStore('dishes', { keyPath: 'id', autoIncrement: true });
        store.createIndex('category', 'category');
      }
      if (!db.objectStoreNames.contains('records')) {
        db.createObjectStore('records', { keyPath: 'date' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function txStore(name, mode) {
  const db = await openDB();
  return db.transaction(name, mode).objectStore(name);
}

function wrap(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const Dishes = {
  async all() {
    const store = await txStore('dishes', 'readonly');
    return wrap(store.getAll());
  },
  async add(dish) {
    const store = await txStore('dishes', 'readwrite');
    return wrap(store.add(dish));
  },
  async remove(id) {
    const store = await txStore('dishes', 'readwrite');
    return wrap(store.delete(id));
  },
};

const Records = {
  async get(date) {
    const store = await txStore('records', 'readonly');
    return wrap(store.get(date));
  },
  async all() {
    const store = await txStore('records', 'readonly');
    return wrap(store.getAll());
  },
  async put(record) {
    const store = await txStore('records', 'readwrite');
    return wrap(store.put(record));
  },
};
