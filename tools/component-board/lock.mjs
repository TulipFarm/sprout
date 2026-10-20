import { DatabaseSync } from 'node:sqlite';
import { setTimeout as sleep } from 'node:timers/promises';

export async function withLock(file, action, { wait = true } = {}) {
  const database = new DatabaseSync(file);
  database.exec('PRAGMA busy_timeout = 0');
  let acquired = false;
  try {
    for (;;) {
      try {
        database.exec('BEGIN IMMEDIATE');
        acquired = true;
        break;
      } catch (error) {
        if (![5, 6].includes(error.errcode)) throw error;
        if (!wait) throw new Error('Another board server is already running.');
        await sleep(300);
      }
    }
    return await action();
  } finally {
    if (acquired) database.exec('ROLLBACK');
    database.close();
  }
}
