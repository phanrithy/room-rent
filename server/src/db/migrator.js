import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run pending database migrations
 * @param {import('better-sqlite3').Database} [database]
 */
export function runMigrations(database = null) {
  const db = database || getDb();

  // Ensure schema_version table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedVersions = new Set(
    db.prepare('SELECT version FROM schema_version').all().map((r) => r.version)
  );

  const migrationsDir = path.resolve(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)_/);
    if (!versionMatch) continue;
    const version = parseInt(versionMatch[1], 10);

    if (appliedVersions.has(version)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Run migration inside transaction
    const executeMigration = db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
    });

    executeMigration();
    console.log(`[Migrator] Applied migration: ${file} (v${version})`);
  }
}

// Allow CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    runMigrations();
    console.log('[Migrator] All migrations up to date.');
    process.exit(0);
  } catch (err) {
    console.error('[Migrator] Migration failed:', err);
    process.exit(1);
  }
}
