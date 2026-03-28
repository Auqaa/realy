import { openDB } from 'idb';

const DB_NAME = 'RyazanQuestDB';
const DB_VERSION = 1;

export const getDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('scans')) {
        db.createObjectStore('scans', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('points')) {
        db.createObjectStore('points', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('routes')) {
        db.createObjectStore('routes', { keyPath: '_id' });
      }
    }
  });
};

export const savePointsOffline = async (points) => {
  const db = await getDB();
  const tx = db.transaction('points', 'readwrite');
  for (const point of points) {
    await tx.store.put(point);
  }
  await tx.done;
};

export const getPointsOffline = async () => {
  const db = await getDB();
  return await db.getAll('points');
};

export const saveRoutesOffline = async (routes) => {
  const db = await getDB();
  const tx = db.transaction('routes', 'readwrite');
  for (const route of routes) {
    await tx.store.put(route);
  }
  await tx.done;
};

export const getRoutesOffline = async () => {
  const db = await getDB();
  return await db.getAll('routes');
};

export const addScanToQueue = async (qrValue) => {
  const db = await getDB();
  await db.add('scans', { qrValue, timestamp: Date.now() });
};

export const getScanQueue = async () => {
  const db = await getDB();
  return await db.getAll('scans');
};

export const removeScanFromQueue = async (id) => {
  const db = await getDB();
  await db.delete('scans', id);
};
