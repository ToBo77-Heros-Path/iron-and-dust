import fs from 'node:fs';
import path from 'node:path';

const rootDir = '/home/antigravity/red-sector';
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');
const artifactDir = '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/7e383483-60f8-40a5-9582-a26378009a79';

// 1. Copy dist to docs
fs.rmSync(docsDir, { recursive: true, force: true });
fs.cpSync(distDir, docsDir, { recursive: true });
fs.writeFileSync(path.join(docsDir, '.nojekyll'), '');
console.log('Copied dist to docs successfully with .nojekyll.');

// 2. Generate standalone single-file HTML
const indexHtml = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

// Find CSS file
const cssFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.css'));
const jsFiles = fs.readdirSync(path.join(distDir, 'assets')).filter(f => f.endsWith('.js'));

if (cssFiles.length === 0 || jsFiles.length === 0) {
  throw new Error('Missing css or js file in dist/assets');
}

let cssContent = fs.readFileSync(path.join(distDir, 'assets', cssFiles[0]), 'utf8');
let jsContent = fs.readFileSync(path.join(distDir, 'assets', jsFiles[0]), 'utf8');

// Convert mentat images to Base64 data URLs
const mentatDir = path.join(distDir, 'assets', 'mentats');
const portraits = ['vanguard_valen.jpg', 'directorate_voronin.jpg', 'nexus_kira.jpg'];
for (const p of portraits) {
  const pPath = path.join(mentatDir, p);
  if (fs.existsSync(pPath)) {
    const b64 = fs.readFileSync(pPath).toString('base64');
    const dataUri = `data:image/jpeg;base64,${b64}`;
    jsContent = jsContent.replaceAll(`assets/mentats/${p}`, dataUri);
  }
}

// Assemble standalone HTML
let standaloneHtml = indexHtml;
// Replace CSS link with inline style
standaloneHtml = standaloneHtml.replace(/<link rel="stylesheet"[^>]+>/, `<style>\n${cssContent}\n</style>`);
// Replace script module with inline script
standaloneHtml = standaloneHtml.replace(/<script type="module"[^>]+><\/script>/, `<script type="module">\n${jsContent}\n</script>`);

const standaloneDistPath = path.join(distDir, 'red_sector_standalone.html');
fs.writeFileSync(standaloneDistPath, standaloneHtml, 'utf8');
console.log(`Wrote standalone HTML to ${standaloneDistPath} (${Math.round(standaloneHtml.length / 1024)} KB)`);

const artifactPath = path.join(artifactDir, 'red_sector_dune_protocol.html');
fs.writeFileSync(artifactPath, standaloneHtml, 'utf8');
console.log(`Wrote artifact to ${artifactPath}`);
