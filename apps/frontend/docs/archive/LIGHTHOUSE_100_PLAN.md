# Lighthouse 100% Score Optimization Plan

## Current Scores

### Desktop (http://localhost:4173/dashboard)
- **Performance**: 81/100 ✅ (Target: 90+)
- **Accessibility**: 79/100 ⚠️ (Target: 100)
- **Best Practices**: 96/100 ✅ (Target: 100)
- **SEO**: 91/100 ✅ (Target: 100)

### Mobile (http://localhost:4173/dashboard)
- **Performance**: 71/100 ⚠️ (Target: 90+)
- **Accessibility**: 79/100 ⚠️ (Target: 100)
- **Best Practices**: 100/100 ✅
- **SEO**: 91/100 ✅ (Target: 100)

---

## Critical Issues to Fix

### 1. Performance Issues

#### A. Cumulative Layout Shift (CLS: 0.261) 🔴 CRITICAL
**Impact**: Desktop -10 points, Mobile -25 points

**Root Cause**: Grid layout shifts when content loads
```
Element causing shift:
<div class="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  TOTAL LEADS 1 WON LEADS 1 CONVERSION RATE 100% TOTAL CUSTOMERS 42
</div>
```

**Solution**:
1. Add explicit height to stat cards container
2. Use CSS `aspect-ratio` for consistent sizing
3. Add skeleton loaders with fixed dimensions
4. Prevent font loading from causing shifts

**Files to modify**:
- `src/pages/dashboard/Overview.tsx`
- Add skeleton component for stats cards

#### B. Render-Blocking CSS (80-300ms delay) 🟡
**Impact**: Delays FCP and LCP

**Current**: CSS blocks initial render
```
/assets/css/index-P1axOk_N.css - 17.9 KiB - 80-300ms duration
```

**Solution**:
1. Inline critical CSS in `<head>`
2. Load non-critical CSS asynchronously
3. Use `media="print" onload="this.media='all'"` pattern

**Implementation**:
- Create Vite plugin to extract critical CSS
- Inline critical styles in `index.html`

#### C. Unused JavaScript (268-306 KiB) 🟡
**Impact**: Slower parsing and execution

**Largest offenders**:
- `chunk-DgNPZgVz.js`: 199 KiB (107 KiB unused) - Lucide icons
- `chunk-B2ufOxu0.js`: 89 KiB (82 KiB unused) - Radix UI
- `chunk-ReWjW5K0.js`: 41 KiB (31 KiB unused)

**Solution**:
1. Use tree-shakeable icon imports
2. Lazy load heavy Radix components
3. Split large chunks further

#### D. Font Preconnect Issue 🟡
**Missing**: `crossorigin` on fonts.gstatic.com preconnect
**Impact**: 240-340ms LCP delay

**Fix**:
```html
<!-- Current (incorrect) -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Should be -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
```

---

### 2. Accessibility Issues (79/100)

#### A. Buttons Without Accessible Names 🔴
**Failing Elements**:
- Pagination buttons (prev/next)
- Icon-only buttons
- Dropdown triggers

**Solution**:
```tsx
// Before
<button><ChevronLeft /></button>

// After
<button aria-label="Previous page"><ChevronLeft /></button>
```

**Files to fix**:
- `src/components/shared/TablePagination.tsx`
- `src/pages/dashboard/Overview.tsx`
- All icon-only buttons

#### B. Select Elements Without Labels 🔴
**Failing Element**:
```html
<select class="h-8 sm:h-9 rounded-md...">
  <option>5</option>
  <option>10</option>
  <option>20</option>
  <option>50</option>
</select>
```

**Solution**:
```tsx
<label htmlFor="page-size" className="sr-only">Items per page</label>
<select id="page-size" aria-label="Items per page">
  <option>5</option>
  ...
</select>
```

#### C. Form Fields Without id/name 🔴
**Issue**: Form inputs missing proper attributes

**Solution**: Add `id` and `name` to all form inputs
```tsx
<input 
  id="email" 
  name="email" 
  type="email"
  aria-label="Email address"
/>
```

#### D. Invalid ARIA Attributes 🟡
**Failing Element**:
```html
<button role="tab" aria-selected="true" data-state="active">
  Month
</button>
```

**Issue**: Invalid ARIA attribute values

**Solution**: Ensure all ARIA attributes have valid values per spec

#### E. Contrast Issues 🟡
**Failing Elements**:
- Avatar initials (text-[9px] on bg-primary/5)
- Tab buttons in active state
- Card backgrounds

**Solution**:
1. Increase contrast ratio to 4.5:1 minimum
2. Use darker text colors
3. Adjust background opacity

**Files to fix**:
- `src/components/ui/avatar.tsx`
- `src/components/ui/tabs.tsx`
- `src/pages/dashboard/Overview.tsx`

#### F. Heading Hierarchy 🟡
**Issue**: `<h3>` used without `<h2>`

**Current**:
```tsx
<h1>Dashboard</h1>
<h3>February 2026</h3>  // ❌ Skips h2
```

**Solution**:
```tsx
<h1>Dashboard</h1>
<h2 className="sr-only">Overview</h2>
<h3>February 2026</h3>  // ✅ Correct hierarchy
```

---

### 3. SEO Issues (91/100)

#### A. Invalid robots.txt 🔴
**Issue**: Lighthouse is reading `index.html` as `robots.txt`

**Solution**: Create proper `robots.txt` in `public/` folder
```txt
User-agent: *
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml
```

**File to create**: `public/robots.txt`

---

### 4. Best Practices Issues

#### A. Console Errors (Desktop: 96/100) 🟡
**Issue**: Avatar API failing with 504 errors
```
avatar.iran.liara.run - 504 Gateway Timeout
```

**Solution**:
1. Add error handling for avatar loading
2. Use fallback avatars
3. Consider self-hosting avatars

#### B. Missing Source Maps 🟡
**Issue**: Production bundle missing source maps

**Solution**: Enable source maps in Vite config
```ts
build: {
  sourcemap: true, // or 'hidden' for production
}
```

---

## Implementation Priority

### Phase 1: Critical Fixes (Target: 90+ scores)
1. ✅ Fix CLS (0.261 → <0.1) - **Biggest impact**
2. ✅ Add accessible names to buttons
3. ✅ Add labels to select elements
4. ✅ Fix form field id/name attributes
5. ✅ Create robots.txt
6. ✅ Fix font preconnect crossorigin

### Phase 2: High-Impact Optimizations (Target: 95+ scores)
7. ✅ Inline critical CSS
8. ✅ Fix contrast issues
9. ✅ Fix heading hierarchy
10. ✅ Fix invalid ARIA attributes
11. ✅ Add error handling for avatars

### Phase 3: Final Polish (Target: 100 scores)
12. ✅ Reduce unused JavaScript
13. ✅ Add source maps
14. ✅ Optimize icon imports
15. ✅ Further code splitting

---

## Expected Score Improvements

### After Phase 1
- **Desktop Performance**: 81 → 88
- **Mobile Performance**: 71 → 82
- **Accessibility**: 79 → 95
- **SEO**: 91 → 100

### After Phase 2
- **Desktop Performance**: 88 → 92
- **Mobile Performance**: 82 → 88
- **Accessibility**: 95 → 100
- **Best Practices**: 96 → 100

### After Phase 3
- **Desktop Performance**: 92 → 95+
- **Mobile Performance**: 88 → 92+
- **All Categories**: 95-100

---

## Detailed Implementation Steps

### Step 1: Fix CLS (Cumulative Layout Shift)

**File**: `src/pages/dashboard/Overview.tsx`

**Current Issue**: Stats grid shifts when data loads

**Solution**:
```tsx
// Add skeleton loader with fixed dimensions
const StatCardSkeleton = () => (
  <div className="rounded-lg border bg-card p-6 h-[120px]">
    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
    <div className="mt-2 h-8 w-16 bg-muted animate-pulse rounded" />
  </div>
);

// In component
{loading ? (
  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
    {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
  </div>
) : (
  <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
    {/* Actual stat cards with min-h-[120px] */}
  </div>
)}
```

**Additional CSS**:
```css
/* Prevent font-loading shifts */
.stat-card {
  min-height: 120px;
  contain: layout; /* CSS containment */
}
```

### Step 2: Add Accessible Button Names

**File**: `src/components/shared/TablePagination.tsx`

```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => onPageChange(page - 1)}
  disabled={page === 1}
  aria-label="Go to previous page"
>
  <ChevronLeft className="h-4 w-4" />
</Button>

<Button
  variant="outline"
  size="sm"
  onClick={() => onPageChange(page + 1)}
  disabled={page >= totalPages}
  aria-label="Go to next page"
>
  <ChevronRight className="h-4 w-4" />
</Button>
```

### Step 3: Add Labels to Select Elements

**File**: `src/components/shared/TablePagination.tsx`

```tsx
<div className="flex items-center gap-2">
  <label htmlFor="page-size-select" className="sr-only">
    Items per page
  </label>
  <select
    id="page-size-select"
    name="pageSize"
    value={pageSize}
    onChange={(e) => onPageSizeChange(Number(e.target.value))}
    className="h-8 sm:h-9 rounded-md border..."
    aria-label="Select number of items per page"
  >
    <option value={5}>5</option>
    <option value={10}>10</option>
    <option value={20}>20</option>
    <option value={50}>50</option>
  </select>
</div>
```

### Step 4: Create robots.txt

**File**: `public/robots.txt`

```txt
# Allow all crawlers
User-agent: *
Allow: /

# Disallow admin routes
Disallow: /dashboard/
Disallow: /api/

# Sitemap location (update with your domain)
Sitemap: https://yourdomain.com/sitemap.xml
```

### Step 5: Fix Font Preconnect

**File**: `index.html`

```html
<!-- Before -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- After -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
```

### Step 6: Inline Critical CSS

**File**: `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  plugins: [
    createHtmlPlugin({
      minify: true,
      inject: {
        data: {
          injectCriticalCSS: `
            <style>
              /* Critical above-the-fold styles */
              body { margin: 0; font-family: Inter, sans-serif; }
              #root { min-height: 100vh; }
              .stat-card { min-height: 120px; }
            </style>
          `
        }
      }
    })
  ]
});
```

### Step 7: Fix Contrast Issues

**File**: `src/components/ui/avatar.tsx`

```tsx
// Before
<span className="text-[9px] bg-primary/5 text-primary">

// After (higher contrast)
<span className="text-[10px] bg-primary/10 text-primary-foreground font-semibold">
```

### Step 8: Fix Heading Hierarchy

**File**: `src/pages/dashboard/Overview.tsx`

```tsx
<div>
  <h1 className="text-2xl font-bold">Dashboard</h1>
  <h2 className="sr-only">Overview Statistics</h2>
  <h3 className="text-sm font-semibold">February 2026</h3>
</div>
```

---

## Testing Checklist

After each phase, run Lighthouse on both desktop and mobile:

### Desktop Test
```bash
# Open http://localhost:4173/dashboard
# Run Lighthouse in Chrome DevTools
# Target: Performance 90+, All others 95+
```

### Mobile Test
```bash
# Open http://localhost:4173/dashboard
# Run Lighthouse with Mobile emulation
# Target: Performance 85+, All others 95+
```

### Verification
- [ ] CLS < 0.1
- [ ] FCP < 1.8s (mobile), < 1.0s (desktop)
- [ ] LCP < 2.5s (mobile), < 1.5s (desktop)
- [ ] TBT < 200ms
- [ ] All buttons have accessible names
- [ ] All form elements have labels
- [ ] No contrast issues
- [ ] Proper heading hierarchy
- [ ] Valid robots.txt
- [ ] No console errors

---

## Maintenance

### Regular Checks
1. **Weekly**: Run Lighthouse on staging
2. **Per Release**: Verify all scores > 90
3. **Monthly**: Review and update optimization strategies

### Red Flags
- CLS increases above 0.1
- Performance score drops below 85
- New accessibility issues introduced
- Bundle size increases by >10%

---

## Resources

- [Web.dev CLS Guide](https://web.dev/cls/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Lighthouse Scoring](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
