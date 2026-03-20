/**
 * IndexedDB storage for conversion history
 */
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { HistoryEntry, HistoryEntrySummary } from '@ttgifconv/shared';

interface HistoryDB extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'ttgifconv-history';
const DB_VERSION = 1;
const STORE_NAME = 'history';

let db: IDBPDatabase<HistoryDB> | null = null;

async function getDB(): Promise<IDBPDatabase<HistoryDB>> {
  if (!db) {
    db = await openDB<HistoryDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('by-timestamp', 'timestamp');
      },
    });
  }
  return db;
}

export const historyDB = {
  /**
   * Add entry to history
   */
  async add(entry: HistoryEntry): Promise<void> {
    const database = await getDB();
    // Don't store the blob URL (transient)
    const { outputBlobUrl, ...entryWithoutUrl } = entry;
    await database.put(STORE_NAME, entryWithoutUrl);
  },

  /**
   * Get all history entries (without blobs for listing)
   */
  async getAll(): Promise<HistoryEntrySummary[]> {
    const database = await getDB();
    const entries = await database.getAll(STORE_NAME);
    // Sort by timestamp descending
    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((entry) => ({
        ...entry,
      }));
  },

  /**
   * Get single entry with blob
   */
  async get(id: string): Promise<HistoryEntry | undefined> {
    const database = await getDB();
    return database.get(STORE_NAME, id);
  },

  /**
   * Delete entry
   */
  async delete(id: string): Promise<void> {
    const database = await getDB();
    await database.delete(STORE_NAME, id);
  },

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    const database = await getDB();
    await database.clear(STORE_NAME);
  },

  /**
   * Get entry count
   */
  async count(): Promise<number> {
    const database = await getDB();
    return database.count(STORE_NAME);
  },
};
