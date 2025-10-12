/**
 * Icon Generation Script
 *
 * This script provides instructions for generating PWA icons.
 *
 * MANUAL GENERATION (Recommended):
 * 1. Use an online tool like https://realfavicongenerator.net/
 * 2. Upload public/icon.svg
 * 3. Configure settings for PWA
 * 4. Download and extract icons to public/ folder
 *
 * OR use an image editor to export icon.svg to PNG at these sizes:
 * - 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512
 *
 * For maskable icons (Android):
 * - Create versions with padding (safe area) at 192x192 and 512x512
 * - Name them icon-maskable-192x192.png and icon-maskable-512x512.png
 *
 * AUTOMATED GENERATION (requires sharp):
 * Run: npm install --save-dev sharp
 * Then: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('⚠️  Sharp not installed. Installing sharp...');
  console.log('Run: npm install --save-dev sharp');
  console.log('\nOr manually generate icons using the instructions above.');
  process.exit(1);
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

const svgPath = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n');

  // Generate regular icons
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }

  // Generate maskable icons (with padding for safe area)
  for (const size of maskableSizes) {
    const paddedSize = Math.round(size * 0.8); // 80% of original for safe area
    const padding = Math.round((size - paddedSize) / 2);

    const outputPath = path.join(outputDir, `icon-maskable-${size}x${size}.png`);
    await sharp(svgPath)
      .resize(paddedSize, paddedSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 16, g: 185, b: 129, alpha: 1 } // #10b981
      })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-maskable-${size}x${size}.png`);
  }

  console.log('\n✨ All icons generated successfully!');
}

generateIcons().catch(error => {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
});
