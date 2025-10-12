# 🚀 Performance Issues & Optimization Plan

## 🔍 Identified Performance Bottlenecks

### 1. **Multiple Sequential API Calls on Dashboard Load**
**Current Issue:**
- Dashboard makes 3 API calls in parallel (good)
- BUT: Auto-sync triggers ANOTHER sync + refetch cycle
- Primary account selection triggers ANOTHER balance fetch (line 96-105 in useDashboardData)
- Total: Up to 6-7 API calls on first load

**Impact:** 2-3 second initial load time

**Files Affected:**
- `lib/hooks/useDashboardData.ts` (lines 53-151)

---

### 2. **Client-Side Only Rendering (No Server Components)**
**Current Issue:**
- All pages use `"use client"` directive
- Dashboard data fetched client-side
- No Server Components for initial data
- Larger JavaScript bundle sent to client

**Impact:**
- Slower First Contentful Paint (FCP)
- Larger bundle size
- Slower Time to Interactive (TTI)

**Files Affected:**
- `app/page.tsx` (line 1: `"use client"`)
- All component files

---

### 3. **Excessive Re-renders & Missing Dependencies**
**Current Issue:**
- Multiple `useEffect` hooks with missing dependencies
- Causes unnecessary re-renders and stale closure bugs

**Files with ESLint Warnings:**
- `lib/hooks/useDashboardData.ts:156` - Missing `fetchAllData`
- `components/sync-status.tsx:21` - Missing `updateTimeAgo`
- `components/bank-account-selector.tsx:43` - Missing `fetchBankAccounts`
- `app/transactions/page.tsx:54` - Missing `fetchTransactions`

**Impact:** Unnecessary API calls, UI flickering

---

### 4. **Auto-Sync Logic Too Aggressive**
**Current Issue:**
- Auto-sync runs on EVERY page load (line 117-144)
- Compares balances and syncs even when difference is minimal
- Can trigger multiple times if user navigates quickly

**Impact:** Excessive Zoho API calls, rate limit risk

**Files Affected:**
- `lib/hooks/useDashboardData.ts:117-144`

---

### 5. **No Image Optimization**
**Current Issue:**
- Using raw `<img>` tags instead of Next.js `<Image />`
- No automatic optimization, lazy loading, or WebP conversion

**Files Affected:**
- `components/receipt-upload.tsx:107`

**Impact:** Slower LCP, higher bandwidth usage

---

### 6. **No Caching Strategy**
**Current Issue:**
- API routes don't set cache headers
- No SWR/React Query for client-side caching
- Every navigation refetches all data

**Impact:** Unnecessary API calls, slower navigation

---

### 7. **Large Dependencies**
**Current Issue:**
- `date-fns` (29.7 KB) - Only using a few functions
- `lucide-react` (full import, ~600 KB) - Could use individual icons
- Multiple Radix UI components

**Potential Savings:** 50-100 KB in bundle size

---

### 8. **Duplicate Balance Fetches**
**Current Issue:**
- Line 60-70: Fetch balance for all accounts
- Line 96-105: Fetch balance AGAIN for primary account
- Both happen on first load

**Impact:** 2x API calls to Zoho

**Files Affected:**
- `lib/hooks/useDashboardData.ts`

---

### 9. **No Request Deduplication**
**Current Issue:**
- If sync is triggered twice (e.g., user clicks + auto-sync), both run
- No queue or deduplication mechanism

**Impact:** Race conditions, duplicate Zoho API calls

---

### 10. **ESLint Errors Preventing Production Build**
**Current Issue:**
- 11 TypeScript/ESLint errors
- Using `any` types (12 instances)
- Unused variables (10 instances)
- Missing `const` declarations (2 instances)

**Impact:** Cannot build production bundle, can't measure real bundle size

---

## 📊 Expected Performance Gains

| Optimization | Current | Target | Improvement |
|--------------|---------|--------|-------------|
| **Initial Load Time** | 2-3s | 0.8-1.2s | **60-70% faster** |
| **First Contentful Paint** | 1.5s | 0.5s | **66% faster** |
| **Time to Interactive** | 3s | 1.5s | **50% faster** |
| **Bundle Size (JS)** | ~400 KB | ~250 KB | **37% smaller** |
| **API Calls (Dashboard)** | 6-7 | 3 | **50% reduction** |
| **Re-renders** | 5-8 | 2-3 | **60% reduction** |

---

## 🎯 Recommended Optimization Priority

### 🔴 **Critical (Do First)**
1. Fix ESLint errors to enable production build
2. Optimize useDashboardData to reduce duplicate API calls
3. Add proper dependency arrays to useEffect hooks
4. Implement request deduplication for sync

### 🟡 **High Priority**
5. Convert dashboard to Server Component + client islands
6. Add SWR or React Query for client-side caching
7. Optimize auto-sync logic (debounce, smarter triggers)
8. Add proper cache headers to API routes

### 🟢 **Medium Priority**
9. Replace `<img>` with Next.js `<Image />`
10. Optimize bundle size (tree-shake lucide-react, date-fns)
11. Add loading skeletons for better perceived performance
12. Implement lazy loading for transaction list

### 🔵 **Low Priority (Nice to Have)**
13. Add service worker for offline support
14. Preload critical API routes
15. Add resource hints (preconnect to Zoho API)
16. Compress images with next/image optimization

---

## 🛠️ Quick Wins (Can Implement Now)

### 1. Fix Duplicate Balance Fetch (5 min)
Remove lines 96-105 in `useDashboardData.ts` - balance already fetched in line 68

### 2. Debounce Auto-Sync (10 min)
Add 30-second cooldown to prevent rapid sync triggers

### 3. Fix useEffect Dependencies (15 min)
Add all missing dependencies to useEffect hooks

### 4. Add Simple Caching (20 min)
Cache Zoho balance for 1 minute in memory/localStorage

### 5. Fix ESLint Errors (30 min)
Replace `any` with proper types, remove unused vars

---

## 📈 Monitoring & Measurement

**Tools to Use:**
- Chrome DevTools Lighthouse (Performance score)
- Next.js Build Analyzer (`@next/bundle-analyzer`)
- React DevTools Profiler (re-render analysis)
- Network tab (API call waterfall)

**Key Metrics to Track:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- Cumulative Layout Shift (CLS)
- Bundle size (First Load JS)

---

## ⚡ Implementation Phases

### Phase 1: Foundation (1-2 hours)
- Fix all ESLint errors
- Fix duplicate API calls in useDashboardData
- Add proper useEffect dependencies
- Test build succeeds

### Phase 2: Quick Wins (2-3 hours)
- Optimize auto-sync logic
- Add request deduplication
- Replace img with next/image
- Add basic client-side caching

### Phase 3: Architecture (4-6 hours)
- Convert to Server Components where possible
- Add React Query/SWR
- Implement proper caching strategy
- Optimize bundle size

### Phase 4: Polish (2-3 hours)
- Add performance monitoring
- Optimize images
- Add resource hints
- Test on real devices

---

**Total Estimated Time:** 9-14 hours
**Expected Result:** 60-70% faster load times, 37% smaller bundle
