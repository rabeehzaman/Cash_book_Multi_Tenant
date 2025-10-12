# PWA Icons Setup

## Current Status
The manifest.json references multiple icon sizes that need to be generated.

## Required Icons
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png
- icon-maskable-192x192.png (for Android adaptive icons)
- icon-maskable-512x512.png (for Android adaptive icons)

## How to Generate Icons

### Option 1: Automated (Recommended)
```bash
# Install sharp image processing library
npm install --save-dev sharp

# Generate all icons
node scripts/generate-icons.js
```

### Option 2: Online Tool
1. Visit https://realfavicongenerator.net/
2. Upload `public/icon.svg`
3. Configure PWA settings
4. Download and extract icons to `public/` folder

### Option 3: Manual Design
1. Open `public/icon.svg` in design software (Figma, Sketch, etc.)
2. Customize the design as needed
3. Export as PNG at all required sizes
4. Place files in `public/` folder

## Customization
Edit `public/icon.svg` to customize your app icon:
- Change colors (currently uses #10b981 - green theme)
- Modify the currency symbol (currently ₹ Rupee)
- Adjust the design elements

## Maskable Icons
Maskable icons are used on Android for adaptive icons. They include padding (safe area) to ensure the icon looks good when cropped into different shapes (circle, rounded square, etc.).

## Testing
After generating icons:
1. Run `npm run build`
2. Test PWA installation on different devices
3. Check icon appearance in various contexts (home screen, app switcher, splash screen)
