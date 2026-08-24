import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

function updateImports(dir, depth) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'styles' && file !== 'assets' && file !== 'data' && file !== 'types') {
        updateImports(fullPath, depth + 1);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      if (file === 'main.tsx') {
        content = content.replace(/import '\.\/index\.css';/, "import './styles/global.css';");
      } else if (file === 'App.tsx') {
        content = content.replace(/import '\.\/App\.css';/, "import './styles/App.css';");
      } else {
        const prefix = depth === 1 ? '../styles/' : './styles/';
        content = content.replace(/import '\.\/(.*?\.css)';/g, `import '${prefix}$1';`);
      }
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

updateImports(srcDir, 0);
console.log('Imports updated.');
