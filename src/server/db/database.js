import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_DIR = join(dirname(dirname(dirname(__dirname))), 'db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(join(DB_DIR, 'requests.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tmdb_media (
    tmdb_id INTEGER PRIMARY KEY,
    tmdb_type TEXT NOT NULL CHECK(tmdb_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    overview TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    release_date TEXT,
    first_air_date TEXT,
    media_type TEXT NOT NULL,
    score REAL DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    cached_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    tmdb_type TEXT NOT NULL CHECK(tmdb_type IN ('movie', 'tv')),
    title TEXT NOT NULL,
    media_type TEXT NOT NULL,
    poster_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'imported', 'rejected')),
    seasons JSON,
    note TEXT DEFAULT '',
    user_id INTEGER,
    username TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (tmdb_id) REFERENCES tmdb_media(tmdb_id)
  );
`);

export default db;
