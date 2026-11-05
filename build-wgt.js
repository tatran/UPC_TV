/**
 * Samsung Tizen TV .wgt Packager
 * Compiles and signs the UPC TV application into:
 * 1. UPC_TV.wgt (Signed Tizen Web Application package)
 * 2. userwidget/UPC_TV.wgt (For Samsung TV USB developer mode installation)
 * 3. userwidget.zip (Ready to extract to USB drive root)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
let archiver = null;
try {
  archiver = require('archiver');
} catch (e) {
  // Archiver optional, fallback to PowerShell Compress-Archive
}

const OUTPUT_WGT = path.join(__dirname, 'UPC_TV.wgt');
const BUILD_DIR = path.join(__dirname, 'build');
const STAGE_DIR = path.join(BUILD_DIR, 'package_stage');
const USERWIDGET_DIR = path.join(__dirname, 'userwidget');
const USERWIDGET_ZIP = path.join(__dirname, 'userwidget.zip');
const TIZEN_BAT = 'C:\\tizen-studio\\tools\\ide\\bin\\tizen.bat';

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function createPackage() {
  console.log('====================================================');
  console.log('   Packaging UPC TV for Samsung Smart TV (Tizen)    ');
  console.log('====================================================');

  if (!fs.existsSync(USERWIDGET_DIR)) {
    fs.mkdirSync(USERWIDGET_DIR, { recursive: true });
  }
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  // 1. Prepare clean staging directory
  if (fs.existsSync(STAGE_DIR)) {
    fs.rmSync(STAGE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  const filesToInclude = ['config.xml', 'index.html', 'icon.png'];
  const dirsToInclude = ['css', 'js', 'lib', 'subtitles'];

  for (const f of filesToInclude) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(STAGE_DIR, f));
      console.log(` + ${f}`);
    }
  }

  for (const d of dirsToInclude) {
    const src = path.join(__dirname, d);
    if (fs.existsSync(src)) {
      copyRecursiveSync(src, path.join(STAGE_DIR, d));
      console.log(` + ${d}/`);
    }
  }

  // 2. Package and sign with Tizen CLI if available
  let packagedSuccessfully = false;
  if (fs.existsSync(TIZEN_BAT)) {
    try {
      console.log('\n[INFO] Signing package with Tizen profile UpcTvProfile...');
      execSync(`"${TIZEN_BAT}" package -t wgt -s UpcTvProfile -o "${BUILD_DIR}" -- "${STAGE_DIR}"`, {
        stdio: 'inherit'
      });
      const generatedWgt = path.join(BUILD_DIR, 'UPC TV.wgt');
      if (fs.existsSync(generatedWgt)) {
        fs.copyFileSync(generatedWgt, OUTPUT_WGT);
        packagedSuccessfully = true;
      }
    } catch (e) {
      console.warn('[WARN] Tizen CLI signing warning:', e.message);
    }
  }

  // Fallback to pure zip if Tizen CLI not installed or failed
  if (!packagedSuccessfully) {
    if (archiver) {
      console.log('[INFO] Using standard archiver...');
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(OUTPUT_WGT);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.directory(STAGE_DIR, false);
        archive.finalize();
      });
    } else {
      console.log('[INFO] Packaging WGT with PowerShell Compress-Archive...');
      const tempZip = path.join(BUILD_DIR, 'temp_wgt.zip');
      if (fs.existsSync(tempZip)) fs.rmSync(tempZip);
      execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${STAGE_DIR}\\*' -DestinationPath '${tempZip}' -Force"`, { stdio: 'inherit' });
      fs.copyFileSync(tempZip, OUTPUT_WGT);
    }
  }

  const stat = fs.statSync(OUTPUT_WGT);
  const sizeMb = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`\n[SUCCESS] Created ${OUTPUT_WGT} (${sizeMb} MB)`);

  // Copy to userwidget directory for USB installation
  const targetInUserwidget = path.join(USERWIDGET_DIR, 'UPC_TV.wgt');
  fs.copyFileSync(OUTPUT_WGT, targetInUserwidget);
  console.log(`[SUCCESS] Copied to ${targetInUserwidget}`);

  // Create userwidget.zip ready to extract to USB root
  await createUsbZip();
}

function createUsbZip() {
  if (archiver) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(USERWIDGET_ZIP);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        console.log(`[SUCCESS] Created ${USERWIDGET_ZIP} (Ready to extract to USB drive)`);
        resolve();
      });

      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(USERWIDGET_DIR, 'userwidget');
      archive.finalize();
    });
  } else {
    console.log('[INFO] Creating userwidget.zip with PowerShell Compress-Archive...');
    execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${USERWIDGET_DIR}' -DestinationPath '${USERWIDGET_ZIP}' -Force"`, { stdio: 'inherit' });
    console.log(`[SUCCESS] Created ${USERWIDGET_ZIP} (Ready to extract to USB drive)`);
    return Promise.resolve();
  }
}

createPackage()
  .then(() => {
    console.log('\nPackage build completed successfully!');
    console.log('You can now install UPC_TV.wgt onto your Samsung Smart TV.');
  })
  .catch((err) => {
    console.error('Packaging failed:', err);
    process.exit(1);
  });

