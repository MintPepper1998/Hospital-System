const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    const inputPath = path.join(__dirname, '../public/shree-kamal-logo.png');
    const out192 = path.join(__dirname, '../public/icon-192x192.png');
    const out512 = path.join(__dirname, '../public/icon-512x512.png');

    if (!fs.existsSync(inputPath)) {
      console.error('Source logo not found at', inputPath);
      process.exit(1);
    }

    console.log('Generating 192x192 icon...');
    await sharp(inputPath)
      .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toFile(out192);

    console.log('Generating 512x512 icon...');
    await sharp(inputPath)
      .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .toFile(out512);

    console.log('Successfully generated PWA icons.');
  } catch (err) {
    console.error('Failed to generate icons using sharp:', err);
    console.log('Falling back to simple file copy...');
    // Fallback: just copy the original file. Browsers handle oversized icons gracefully.
    const inputPath = path.join(__dirname, '../public/shree-kamal-logo.png');
    const out192 = path.join(__dirname, '../public/icon-192x192.png');
    const out512 = path.join(__dirname, '../public/icon-512x512.png');
    fs.copyFileSync(inputPath, out192);
    fs.copyFileSync(inputPath, out512);
    console.log('Successfully copied fallback PWA icons.');
  }
}

generateIcons();
