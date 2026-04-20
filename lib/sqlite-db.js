/**
 * SQLite Database Wrapper
 * Provides async access to SQLite databases (Test, T20, LOI)
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// Cache db connections keyed by format ('test', 't20', 'loi')
const dbConnections = {};

async function getDb(format = 'test') {
  if (dbConnections[format]) {
    return dbConnections[format];
  }

  const dbMap = {
    test: path.join(process.cwd(), '..', 'data', 'cricket_test.db'),
    t20:  path.join(process.cwd(), '..', 'data', 'cricket_t20.db'),
    loi:  path.join(process.cwd(), '..', 'data', 'cricket_loi.db'),
  };

  const dbPath = dbMap[format];
  if (!dbPath) {
    throw new Error(`Unknown format: ${format}`);
  }

  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Enable foreign keys
    await db.exec('PRAGMA foreign_keys = ON');

    dbConnections[format] = db;
    return db;
  } catch (error) {
    console.error(`Failed to open ${format} database at ${dbPath}:`, error);
    throw error;
  }
}

export { getDb };
export default { getDb };
