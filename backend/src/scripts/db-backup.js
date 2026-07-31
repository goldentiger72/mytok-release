import db from '../config/db.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const action = process.argv[2] || 'integrity';

if (action === 'integrity') {
  console.log('[DB CHECK] Running PRAGMA integrity_check...');
  const result = db.prepare('PRAGMA integrity_check').get();
  console.log('[DB CHECK] Result:', result);
  if (result['integrity_check'] === 'ok') {
    console.log('[DB CHECK] Database integrity verified: OK');
    process.exit(0);
  } else {
    console.error('[DB CHECK] Database integrity check FAILED!');
    process.exit(1);
  }
} else if (action === 'backup') {
  const backupsDir = path.join(__dirname, '../../backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `mytok_backup_${timestamp}.db`);

  console.log(`[DB BACKUP] Creating backup at: ${backupPath}`);
  try {
    db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
    console.log('[DB BACKUP] Backup created successfully!');
    process.exit(0);
  } catch (err) {
    console.error('[DB BACKUP] Backup failed:', err.message);
    process.exit(1);
  }
} else {
  console.log('Usage: bun backend/src/scripts/db-backup.js [integrity|backup]');
}
