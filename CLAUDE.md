# 💰 Simple Cash Book App

A clean and simple cash book web application for tracking cash in and cash out transactions.

## 📋 Overview

This is a straightforward cash management application that allows users to:
- Record cash in transactions (money received)
- Record cash out transactions (money paid)
- View transaction history
- Track current balance
- Upload receipts

## 🏗️ Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage (for receipts)

## 📊 Database Schema

### `cashbook_transactions` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Creation timestamp |
| transaction_date | DATE | Date of transaction |
| amount | NUMERIC | Transaction amount |
| type | TEXT | 'cash_in' or 'cash_out' |
| category | TEXT | Transaction category |
| party_name | TEXT | Name of person/company |
| description | TEXT | Optional notes |
| receipt_url | TEXT | Optional receipt image URL |

### `cashbook_categories` Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Category name |
| type | TEXT | 'cash_in', 'cash_out', or 'both' |

## 🔧 Environment Variables

Create a `.env.local` file with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cash-book
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
   - Create a new Supabase project
   - Run the database migrations from `supabase/migrations/`
   - Create a storage bucket named `cashbook_receipts` and make it public
   - Copy your Supabase credentials to `.env.local`

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## 📱 Features

### Dashboard
- Current balance display (cash in - cash out)
- Quick action buttons for cash in/out
- Recent transactions list
- Summary cards showing total cash in and cash out

### Add Transaction
- Simple form with:
  - Transaction type (Cash In/Cash Out)
  - Date picker
  - Amount input
  - Party name (from/to)
  - Category selection
  - Description (optional)
  - Receipt upload (optional)

### Transaction List
- View all transactions
- Filter by type, category, date range
- Search functionality
- Edit/delete transactions

## 📱 Progressive Web App (PWA) Features

This app is a full Progressive Web App with offline support and native app-like features.

### PWA Capabilities

#### ✅ Installable
- Install on mobile and desktop devices
- Add to home screen with custom icon
- Native app shell with splash screen
- Standalone display mode (no browser UI)

#### 🔄 Offline Support
- Full offline functionality with service worker
- Automatic caching of static assets and pages
- Network-first strategy for API calls
- Graceful fallback when offline

#### 💾 Offline Transaction Queue
- Transactions saved locally when offline
- Automatic background sync when connection restored
- Visual indicator showing sync status
- Manual sync option available

#### 🎯 App Shortcuts
Quick access shortcuts on home screen:
- Add Cash In transaction
- Add Cash Out transaction

### PWA Setup

#### 1. Generate Icons
```bash
# Option 1: Automated (recommended)
npm install --save-dev sharp
node scripts/generate-icons.js

# Option 2: Manual
# See public/ICONS_README.md for instructions
```

#### 2. Build and Deploy
```bash
npm run build
npm start
```

#### 3. Test PWA Features

**Desktop (Chrome/Edge):**
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar
3. Follow installation prompts

**Mobile (iOS):**
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

**Mobile (Android):**
1. Open the app in Chrome
2. Tap the menu (⋮)
3. Select "Install app" or "Add to Home Screen"

### PWA Architecture

#### Service Worker (`service-worker.js`)
- Background sync for offline transactions
- Custom caching strategies
- Automatic updates
- Push notification support (ready)

#### Offline Queue System (`lib/offline-queue.ts`)
- IndexedDB-based storage
- Transaction queuing when offline
- Automatic sync on reconnection
- Background sync API integration

#### Offline Indicator (`components/offline-indicator.tsx`)
- Real-time connection status
- Unsynced transaction count
- Manual sync button
- Visual feedback during sync

#### Caching Strategies
- **CacheFirst:** Static assets, fonts, images
- **StaleWhileRevalidate:** CSS, JS, Next.js data
- **NetworkFirst:** API calls, dynamic pages
- **Fallback:** Offline page when network fails

### PWA Configuration Files

- `public/manifest.json` - App manifest with metadata
- `service-worker.js` - Custom service worker
- `next.config.js` - next-pwa configuration
- `app/offline/page.tsx` - Offline fallback page

### Using Offline Features in Your App

```typescript
import { useOfflineQueue } from '@/lib/hooks/use-offline-queue';

function YourComponent() {
  const {
    unsyncedCount,    // Number of pending transactions
    isSyncing,        // Sync in progress
    isOnline,         // Connection status
    addToQueue,       // Add transaction to queue
    syncAll,          // Manually trigger sync
  } = useOfflineQueue();

  // Add transaction when offline
  const handleOfflineSubmit = async (data) => {
    if (!isOnline) {
      await addToQueue(data);
      // Transaction saved locally and will sync automatically
    }
  };

  return (
    <div>
      {!isOnline && <p>Offline mode</p>}
      {unsyncedCount > 0 && (
        <button onClick={syncAll}>
          Sync {unsyncedCount} pending transactions
        </button>
      )}
    </div>
  );
}
```

### PWA Best Practices

✅ **Implemented:**
- Offline support with service worker
- App manifest with icons
- Theme colors and display mode
- Caching strategies for performance
- Background sync for reliability
- Responsive design for all devices

🔧 **Recommended:**
- Regular service worker updates
- Cache version management
- Monitor IndexedDB storage limits
- Test on various devices and networks
- Run Lighthouse audits regularly

### PWA Troubleshooting

#### Service worker not registering
```bash
# Clear browser cache and rebuild
npm run build
# Check browser console for errors
```

#### Offline transactions not syncing
1. Check browser console for sync errors
2. Verify network connectivity
3. Check IndexedDB in DevTools (Application tab)
4. Manually trigger sync from offline indicator

#### App not installable
1. Ensure HTTPS is enabled (required for PWA)
2. Verify manifest.json is accessible
3. Check all required icons are present
4. Run Lighthouse PWA audit

#### Icons not showing
```bash
# Regenerate icons
node scripts/generate-icons.js
# Check public/ folder for icon files
```

## 🗂️ Project Structure

```
/app
  /api
    /transactions      # Transaction CRUD operations
    /upload            # Receipt upload handler
  /add                 # Add transaction page
  /transactions        # Transaction list page
  page.tsx             # Dashboard

/components
  /ui                  # shadcn/ui components
  balance-card.tsx     # Balance display component
  transaction-card.tsx # Transaction card component
  transaction-form.tsx # Transaction form component
  receipt-upload.tsx   # Receipt upload component

/lib
  /supabase           # Supabase client configuration
  /hooks              # Custom React hooks
    use-offline-queue.ts  # Offline queue management hook
  offline-queue.ts    # IndexedDB offline storage
  utils.ts            # Utility functions

/components
  offline-indicator.tsx  # Connection status indicator

/public
  manifest.json       # PWA manifest
  icon.svg            # Source icon file
  icon-*.png          # Generated PWA icons

/scripts
  generate-icons.js   # Icon generation script

/supabase
  /migrations         # Database migration files

service-worker.js     # Custom service worker
```

## 🔄 API Routes

### `POST /api/transactions`
Create a new transaction.

**Request:**
- Content-Type: multipart/form-data
- Fields: type, transaction_date, amount, party_name, category, description, receipt (file)

**Response:**
```json
{
  "success": true,
  "transaction": { ... }
}
```

### `GET /api/transactions`
Get transactions with optional filters.

**Query Parameters:**
- type: 'cash_in' | 'cash_out' | 'all'
- category: string
- start_date: string (YYYY-MM-DD)
- end_date: string (YYYY-MM-DD)
- limit: number

**Response:**
```json
{
  "success": true,
  "transactions": [...],
  "balance": {
    "total_cash_in": 10000,
    "total_cash_out": 5000,
    "net_balance": 5000
  }
}
```

### `GET /api/transactions/[id]`
Get a single transaction by ID.

### `PUT /api/transactions/[id]`
Update a transaction.

### `DELETE /api/transactions/[id]`
Delete a transaction.

## 🎨 Design

The app uses a clean, modern design with:
- Responsive layout (mobile-first)
- Green for cash in, red for cash out
- Card-based UI components
- Smooth transitions and hover effects
- Number formatting without currency symbols

## 📝 Default Categories

- Sales
- Services
- Other Income
- Expenses
- Salary
- Rent
- Utilities
- General

## 🔐 Security

- Environment variables for sensitive data
- Supabase Row Level Security (RLS) policies
- Service role key only used in server-side API routes
- Public access to anon key only

## 🚀 Deployment

### Vercel Deployment

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Supabase Setup

1. Apply all migrations from `supabase/migrations/`
2. Create storage bucket `cashbook_receipts`
3. Configure RLS policies as needed

## 📈 Future Enhancements

Potential features to add:
- Multi-currency support
- Export to CSV/PDF
- Transaction categories management
- Dark mode
- Push notifications for sync status
- Recurring transactions
- Budget tracking
- Charts and analytics
- Biometric authentication
- Receipt OCR (automatic data extraction)

## 🐛 Troubleshooting

### Receipt upload fails
- Check if `cashbook_receipts` bucket exists in Supabase Storage
- Verify bucket is set to public access
- Check file size limits

### Balance not updating
- Refresh the page
- Check if transaction was created successfully
- Verify database connection

### PWA not working
- Ensure app is served over HTTPS
- Check service worker registration in DevTools
- Clear cache and rebuild: `npm run build`
- Verify manifest.json is accessible

### Offline sync issues
- Check network connection
- Open browser DevTools → Application → IndexedDB
- Verify `cashbook-offline` database exists
- Try manual sync from offline indicator

## 📄 License

MIT

## 👨‍💻 Development

Built with Next.js 15 and Supabase for a modern, fast, and reliable cash book application.
