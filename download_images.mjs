import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const images = {
  'spiderman.jpg': 'https://m.media-amazon.com/images/M/MV5BZWMyYzFjYTYtNTRjYi00OGExLWE2YzgtOGRmYjAxZTU3NzBiXkEyXkFqcGc@._V1_FMjpg_UX1280_.jpg',
  'dune.jpg': 'https://m.media-amazon.com/images/M/MV5BN2E0ZTg5OTgtNzZhMy00ZmZmLTk0NzAtMjc1NDllYThlOWQyXkEyXkFqcGc@._V1_FMjpg_UX1280_.jpg',
  'kungfupanda.jpg': 'https://m.media-amazon.com/images/M/MV5BZGY3NTc3ZTktMmNlYy00ODljLWIxM2UtNjc3ZTVlMTQyODFjXkEyXkFqcGc@._V1_FMjpg_UX1280_.jpg',
  'deadpool.jpg': 'https://m.media-amazon.com/images/M/MV5BYzA2ZDczMWQtOTY3OC00ZWE3LTgxMjctM2FlY2EzYjc3NWQ4XkEyXkFqcGc@._V1_FMjpg_UX1280_.jpg'
};

const dir = path.join(__dirname, 'public', 'backdrops');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  for (const [filename, url] of Object.entries(images)) {
    const dest = path.join(dir, filename);
    console.log(`Downloading ${filename}...`);
    try {
      await download(url, dest);
      console.log(`Downloaded ${filename}`);
    } catch (e) {
      console.error(`Failed to download ${filename}:`, e);
    }
  }
}

main();
