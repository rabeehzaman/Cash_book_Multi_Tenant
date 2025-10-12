# 📱 PWA Setup and Testing Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate PWA Icons
```bash
# Option A: Automated (requires sharp)
npm install --save-dev sharp
node scripts/generate-icons.js

# Option B: Manual
# Follow instructions in public/ICONS_README.md
```

### 3. Build the Application
```bash
npm run build
```

### 4. Start Production Server
```bash
npm start
```

The app will be available at http://localhost:3001

## Testing PWA Features

### Desktop Testing (Chrome/Edge)

1. **Open Chrome DevTools** (F12)
2. Go to **Application** tab
3. Check the following:
   - **Manifest**: Should show all icons and configuration
   - **Service Workers**: Should show registered worker
   - **Storage → IndexedDB**: Should have `cashbook-offline` database
   - **Cache Storage**: Should have multiple caches

4. **Test Installation**:
   - Click the install icon (⊕) in the address bar
   - Or: Chrome menu → Install Cash Book
   - App should open in standalone window

5. **Test Offline Mode**:
   - In DevTools, go to **Network** tab
   - Check "Offline" checkbox
   - Navigate the app - pages should still load
   - Try adding a transaction - should save to queue

### Mobile Testing (Android)

1. **Deploy to HTTPS** (required for PWA)
   - Deploy to Vercel, Netlify, or similar
   - Or use ngrok for local testing:
     ```bash
     npx ngrok http 3001
     ```

2. **Open in Chrome**:
   - Visit your HTTPS URL
   - Look for "Add to Home Screen" prompt
   - Or: Chrome menu (⋮) → "Install app"

3. **Test Features**:
   - Install the app
   - Open from home screen
   - Test offline mode (enable airplane mode)
   - Add transactions while offline
   - Go back online and verify sync

### Mobile Testing (iOS)

1. **Deploy to HTTPS** (required)

2. **Open in Safari**:
   - Visit your HTTPS URL
   - Tap the Share button (square with arrow)
   - Scroll down and tap "Add to Home Screen"
   - Tap "Add"

3. **Test Features**:
   - Open app from home screen
   - Test offline mode (enable airplane mode)
   - Add transactions while offline
   - Go back online and verify sync

## Lighthouse Audit

### Run Lighthouse PWA Audit

1. **Open Chrome DevTools** (F12)
2. Go to **Lighthouse** tab
3. Select:
   - ☑️ Progressive Web App
   - ☑️ Performance
   - ☑️ Best Practices
   - Device: Mobile
4. Click **Analyze page load**

### Expected Scores

- **PWA**: 100/100
  - ✅ Installable
  - ✅ PWA-optimized
  - ✅ Offline capable
  - ✅ Fast and reliable

- **Performance**: 90+/100
  - Fast loading
  - Efficient caching
  - Optimized assets

### Common Issues and Fixes

#### Issue: PWA not installable
**Check:**
- [ ] HTTPS enabled (required)
- [ ] manifest.json accessible
- [ ] Icons generated (all sizes)
- [ ] Service worker registered

**Fix:**
```bash
# Regenerate icons
node scripts/generate-icons.js

# Rebuild
npm run build
npm start

# Check manifest at: http://localhost:3001/manifest.json
```

#### Issue: Service worker not registering
**Check:**
```bash
# Browser console should show:
# "[Service Worker] Installing..."
# "[Service Worker] Activating..."

# If not, check for errors
```

**Fix:**
- Clear browser cache (Ctrl+Shift+Delete)
- Unregister old service workers (DevTools → Application → Service Workers)
- Rebuild and restart

#### Issue: Offline mode not working
**Check:**
- [ ] Service worker active
- [ ] Cache storage populated
- [ ] IndexedDB created

**Fix:**
```javascript
// Check in browser console:
caches.keys().then(console.log); // Should show caches
indexedDB.databases().then(console.log); // Should show cashbook-offline
```

#### Issue: Offline transactions not syncing
**Check:**
- [ ] Network connection restored
- [ ] IndexedDB has unsynced items
- [ ] API endpoint accessible

**Fix:**
- Open DevTools → Application → IndexedDB → cashbook-offline
- Check `offline-queue` store for items
- Manually trigger sync from offline indicator
- Check browser console for sync errors

## Testing Checklist

### Installation
- [ ] App installs on desktop (Chrome/Edge)
- [ ] App installs on Android (Chrome)
- [ ] App installs on iOS (Safari)
- [ ] App icon displays correctly
- [ ] App opens in standalone mode (no browser UI)

### Offline Functionality
- [ ] App loads when offline
- [ ] Can view cached transactions
- [ ] Can add new transactions offline
- [ ] Transactions saved to IndexedDB
- [ ] Offline indicator shows when offline

### Sync Functionality
- [ ] Auto-sync when connection restored
- [ ] Manual sync button works
- [ ] Background sync triggers (when supported)
- [ ] Sync status shown in indicator
- [ ] Toast notifications for sync status

### Caching
- [ ] Static assets cached (images, CSS, JS)
- [ ] Pages load fast (from cache)
- [ ] API responses cached appropriately
- [ ] Cache updates on new deployment

### Performance
- [ ] Fast initial load (<3s)
- [ ] Fast subsequent loads (<1s from cache)
- [ ] Smooth animations
- [ ] No layout shifts

### Shortcuts
- [ ] Home screen shortcuts visible (Android)
- [ ] "Add Cash In" shortcut works
- [ ] "Add Cash Out" shortcut works

## Development Tips

### Enable PWA in Development

By default, PWA is enabled in development mode for testing. To disable:

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  disable: process.env.NODE_ENV === 'development', // Change to true
  // ...
});
```

### Debug Service Worker

```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered:', registrations);
  registrations.forEach(reg => reg.unregister());
});
```

### View IndexedDB

1. Chrome DevTools → Application
2. Storage → IndexedDB → cashbook-offline
3. Click `offline-queue` to view queued transactions

### Clear All Caches

```javascript
// In browser console
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key));
  location.reload();
});
```

## Deployment Checklist

### Pre-deployment
- [ ] Icons generated (run `node scripts/generate-icons.js`)
- [ ] Build successful (`npm run build`)
- [ ] Service worker configured
- [ ] Environment variables set

### Post-deployment
- [ ] HTTPS enabled (required for PWA)
- [ ] manifest.json accessible
- [ ] Service worker registers
- [ ] App installable
- [ ] Lighthouse PWA score 100

### Vercel Deployment

```bash
# Deploy to Vercel
vercel

# Or use Vercel CLI
npm i -g vercel
vercel deploy --prod
```

Environment variables needed:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Web App Manifest](https://web.dev/add-manifest/)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review PWA Troubleshooting section in CLAUDE.md
3. Run Lighthouse audit for specific issues
4. Check DevTools → Application tab for detailed status
