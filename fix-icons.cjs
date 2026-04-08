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
      // We currently have: import IconName from "@mui/icons-material/IconName.js";
      // We want: import { IconName } from "@mui/icons-material";
      content = content.replace(/import\s+([A-Za-z0-9_]+)\s+from\s+["']@mui\/icons-material\/([^"']+)["'];?/g, (match, p1, p2) => {
          changed = true;
          const cleanName = p2.replace(/\.js$/, '');
          if (p1 === cleanName) {
              return `import { ${cleanName} } from "@mui/icons-material";`;
          }
          return `import { ${cleanName} as ${p1} } from "@mui/icons-material";`;
      });
      
      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDir(path.join(__dirname, 'src', 'components'));
