const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      const regex = /import\s+([A-Za-z0-9_]+)\s+from\s+["']@mui\/icons-material\/([^"']+)["'];?/g;
      
      const newContent = content.replace(regex, (match, p1, p2) => {
        // e.g. import CloseIcon from "@mui/icons-material/Close.js"
        const cleanName = p2.replace(/\.js$/, '');
        changed = true;
        return `import { ${cleanName} as ${p1} } from "@mui/icons-material";`;
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, newContent);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'components'));
