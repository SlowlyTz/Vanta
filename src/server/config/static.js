import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const PUBLIC_DIR = path.resolve(__dirname, '../../public');
export const INDEX_FILE = path.join(PUBLIC_DIR, 'index.html');
