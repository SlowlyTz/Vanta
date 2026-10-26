// Where VANTA keeps its files, relative to the repository root.
import path from 'path';
import { fileURLToPath } from 'url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const DB_DIR = path.join(REPO_ROOT, 'db');
export const USER_DB_DIR = path.join(DB_DIR, 'user');
export const IMAGE_CACHE_DIR = path.join(REPO_ROOT, 'cache', 'images');
export const PUBLIC_DIR = path.join(REPO_ROOT, 'src', 'public');
export const DIST_DIR = path.join(REPO_ROOT, 'dist');
