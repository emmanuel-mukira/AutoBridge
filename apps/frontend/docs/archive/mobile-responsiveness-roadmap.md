# Mobile Responsiveness Implementation Roadmap

**Document Version:** 1.0  
**Last Updated:** January 2026  
**Status:** Planning Phase  
**Target Completion:** Q1 2026

---

## Executive Summary

This document outlines the comprehensive plan to transform the Gaston CRM frontend into a fully mobile-responsive application. Currently, the application is optimized for desktop use, which limits usability for sales representatives working in the field on mobile devices.

**Business Impact:**
- 📱 **60% of sales reps** use mobile devices for field work
- 📱 **Mobile-first** approach increases user adoption by 45%
- 📱 **Reduced friction** in data entry and viewing on small screens
- 📱 **Competitive advantage** - Most SMB CRMs have poor mobile UX

**Scope:**
- ✅ All 13 main pages (Dashboard, Customers, Leads, Quotations, etc.)
- ✅ 20+ dialog/modal components
- ✅ 5 filter components
- ✅ Shared components (tables, cards, badges, buttons)
- ✅ Navigation and layout

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Mobile Breakpoint Strategy](#mobile-breakpoint-strategy)
3. [Component-by-Component Plan](#component-by-component-plan)
4. [Implementation Phases](#implementation-phases)
5. [Design Patterns](#design-patterns)
6. [Testing Strategy](#testing-strategy)
7. [Success Metrics](#success-metrics)

---

## Current State Analysis

### Pages Inventory

| Page | Desktop | Mobile Issues | Priority |
|------|---------|---------------|----------|
| **Dashboard** | ✅ | ❌ Stats cards overflow, charts not responsive | High |
| **Customers** | ✅ | ❌ Table horizontal scroll, action buttons too small | Critical |
| **Leads** | ✅ | ❌ Table overflow, status badges cramped | Critical |
| **Quotations** | ✅ | ❌ Complex table, version history unreadable | High |
| **Call Planner** | ✅ | ❌ Date pickers awkward, table overflow | High |
| **Interactions** | ✅ | ❌ Table overflow, filter buttons cramped | Medium |
| **Audit Logs** | ✅ | ❌ No filters on mobile, table unreadable | High |
| **Admin Users** | ✅ | ❌ Table overflow, dropdown menus off-screen | Medium |
| **Login/Signup** | ✅ | ⚠️ Mostly works, needs polish | Low |
| **Home** | ✅ | ⚠️ Hero section needs adjustment | Low |

### Dialog Components (20+)

**Create/Edit Dialogs:**
- CreateCustomerDialog
- CreateLeadDialog
- CreateQuotationDialog
- CreateCallPlanDialog
- CreateInteractionDialog
- EditCallPlanDialog
- EditInteractionDialog
- EditQuotationDialog
- EditLeadDialog

**Detail/View Dialogs:**
- CustomerContactsDialog
- LeadDetailDialog
- QuotationDetailDialog
- CallPlanDetailDialog
- InteractionDetailDialog
- AuditLogDetailDialog
- VersionHistoryDialog

**Action Dialogs:**
- AssignSalesRepDialog
- CreateContactDialog
- AddUserDialog
- InviteUserDialog

**Common Issues:**
- ❌ Fixed widths (sm:max-w-[500px], sm:max-w-[600px])
- ❌ Forms with 2-column grids break on mobile
- ❌ Buttons too small for touch targets
- ❌ Long select dropdowns overflow screen
- ❌ Date pickers awkward on mobile

### Filter Components (5)

- CustomerFilters
- QuotationFilters
- InteractionFilters
- UserFilters
- AuditLogFilters

**Issues:**
- ❌ Horizontal layout breaks on mobile
- ❌ Too many filters visible at once
- ❌ No collapsible/drawer pattern
- ❌ Search + filters compete for space

### Shared Components

**Tables:**
- ❌ Horizontal scroll on all tables
- ❌ Too many columns visible
- ❌ Action buttons cramped
- ❌ No card view alternative

**Badges/Status:**
- ⚠️ Mostly OK but need size adjustments
- ❌ Text truncation issues

**Buttons:**
- ❌ Icon-only buttons too small (< 44px touch target)
- ❌ Text buttons overflow on small screens
- ❌ Grouped buttons stack poorly

---

## Mobile Breakpoint Strategy

### Tailwind Breakpoints (Default)

```css
sm:  640px  /* Small tablets, large phones landscape */
md:  768px  /* Tablets */
lg:  1024px /* Laptops */
xl:  1280px /* Desktops */
2xl: 1536px /* Large desktops */
```

### Our Responsive Strategy

**Mobile-First Approach:**
1. **Base styles** - Mobile (< 640px)
2. **sm:** - Tablet portrait (640px+)
3. **md:** - Tablet landscape (768px+)
4. **lg:** - Desktop (1024px+)

**Key Principles:**
- Default to mobile layout
- Progressive enhancement for larger screens
- Touch targets minimum 44x44px
- Readable text (16px minimum)
- Adequate spacing (padding/margin)

---

## Component-by-Component Plan

### 1. Tables → Responsive Cards

**Current Problem:**
```tsx
<Table>
  <TableRow>
    <TableCell>Company Name</TableCell>
    <TableCell>County</TableCell>
    <TableCell>Sales Rep</TableCell>
    <TableCell>Created</TableCell>
    <TableCell>Actions</TableCell>
  </TableRow>
</Table>
// Horizontal scroll on mobile ❌
```

**Solution: Adaptive Layout**
```tsx
{/* Desktop: Table */}
<div className="hidden md:block">
  <Table>...</Table>
</div>

{/* Mobile: Card List */}
<div className="md:hidden space-y-3">
  {customers.map(customer => (
    <Card key={customer.id} className="p-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-base">{customer.companyName}</h3>
        <DropdownMenu>...</DropdownMenu>
      </div>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>📍 {customer.countyName}</p>
        <p>👤 {customer.salesRep.name}</p>
        <p>📅 {formatDate(customer.createdAt)}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <Badge>{customer.status}</Badge>
      </div>
    </Card>
  ))}
</div>
```

**Pattern:**
- Desktop (md:+): Traditional table
- Mobile (<md): Card-based list
- Each card shows key info
- Actions in dropdown menu

---

### 2. Dialogs → Full-Screen Mobile

**Current Problem:**
```tsx
<DialogContent className="sm:max-w-[500px] max-h-[90vh]">
  {/* Fixed width breaks on mobile */}
</DialogContent>
```

**Solution: Responsive Width**
```tsx
<DialogContent className="w-full sm:max-w-[500px] max-h-[90vh] mx-2 sm:mx-auto">
  {/* Mobile: Full width with margin */}
  {/* Desktop: Fixed max-width */}
</DialogContent>
```

**For Complex Dialogs (Quotations, Call Plans):**
```tsx
<DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[600px] md:max-w-[800px] max-h-[95vh] p-0">
  <DialogHeader className="p-4 sm:p-6 border-b">
    <DialogTitle className="text-lg sm:text-xl">Create Quotation</DialogTitle>
  </DialogHeader>
  
  <form className="flex flex-col flex-1 min-h-0">
    <div className="overflow-y-auto flex-1 p-4 sm:p-6">
      {/* Scrollable content */}
    </div>
    
    <DialogFooter className="p-4 sm:p-6 border-t flex-shrink-0">
      <Button className="w-full sm:w-auto">Submit</Button>
    </DialogFooter>
  </form>
</DialogContent>
```

**Pattern:**
- Mobile: Near full-screen (calc(100vw - 1rem))
- Tablet: 600px max-width
- Desktop: 800px max-width
- Sticky header/footer
- Scrollable content area

---

### 3. Form Grids → Stack on Mobile

**Current Problem:**
```tsx
<div className="grid grid-cols-2 gap-4">
  <Input label="First Name" />
  <Input label="Last Name" />
</div>
// Inputs too narrow on mobile ❌
```

**Solution: Responsive Grid**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
  <Input label="First Name" className="text-base" />
  <Input label="Last Name" className="text-base" />
</div>
```

**Pattern:**
- Mobile: Single column (grid-cols-1)
- Tablet+: Two columns (sm:grid-cols-2)
- Larger text inputs (text-base = 16px)
- Reduced gap on mobile (gap-3 vs gap-4)

---

### 4. Filters → Drawer/Sheet on Mobile

**Current Problem:**
```tsx
<div className="flex gap-4 items-center">
  <Input placeholder="Search..." />
  <Select>...</Select>
  <Select>...</Select>
  <Button>Apply</Button>
</div>
// Cramped, horizontal scroll ❌
```

**Solution: Mobile Drawer**
```tsx
{/* Mobile: Filter Button + Sheet */}
<div className="md:hidden">
  <Button onClick={() => setFilterOpen(true)} className="w-full">
    <Filter className="h-4 w-4 mr-2" />
    Filters {activeFilters > 0 && `(${activeFilters})`}
  </Button>
  
  <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
    <SheetContent side="bottom" className="h-[80vh]">
      <SheetHeader>
        <SheetTitle>Filter Customers</SheetTitle>
      </SheetHeader>
      <div className="space-y-4 mt-4">
        <Input placeholder="Search..." />
        <Select>...</Select>
        <Select>...</Select>
      </div>
      <SheetFooter className="mt-6">
        <Button onClick={applyFilters} className="w-full">
          Apply Filters
        </Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</div>

{/* Desktop: Inline Filters */}
<div className="hidden md:flex gap-4 items-center">
  <Input placeholder="Search..." />
  <Select>...</Select>
  <Select>...</Select>
  <Button>Apply</Button>
</div>
```

**Pattern:**
- Mobile: Bottom sheet with stacked filters
- Desktop: Inline horizontal filters
- Show active filter count on mobile button
- Full-width apply button on mobile

---

### 5. Buttons → Touch-Friendly Sizing

**Current Problem:**
```tsx
<Button size="sm" className="h-6">
  <Pencil className="h-3 w-3" />
</Button>
// Too small for touch (< 44px) ❌
```

**Solution: Responsive Sizing**
```tsx
<Button 
  size="sm" 
  className="h-9 w-9 sm:h-8 sm:w-8 p-0"
  aria-label="Edit customer"
>
  <Pencil className="h-4 w-4 sm:h-3 sm:w-3" />
</Button>
```

**Size Guidelines:**
```tsx
// Icon-only buttons
className="h-10 w-10 sm:h-8 sm:w-8"  // 40px mobile, 32px desktop

// Text buttons
className="h-10 sm:h-9 px-4 sm:px-3 text-base sm:text-sm"

// Primary actions
className="h-11 sm:h-10 px-6 sm:px-4 text-base font-medium"
```

**Pattern:**
- Minimum 40px (h-10) touch target on mobile
- Can reduce to 32px (h-8) on desktop
- Larger text on mobile (text-base vs text-sm)
- More padding on mobile

---

### 6. Status Badges → Responsive Text

**Current Problem:**
```tsx
<Badge className="text-xs">
  PENDING_APPROVAL
</Badge>
// Text too small, badge too narrow ❌
```

**Solution: Responsive Badge**
```tsx
<Badge className="text-xs sm:text-[10px] px-2.5 sm:px-2 py-1 sm:py-0.5">
  {status === 'PENDING_APPROVAL' ? 'Pending' : status}
</Badge>
```

**Pattern:**
- Slightly larger on mobile (text-xs vs text-[10px])
- More padding on mobile
- Truncate long status text
- Consider icons for common statuses

---

### 7. Navigation → Mobile Menu

**Current Problem:**
```tsx
<nav className="flex gap-4">
  <Link>Dashboard</Link>
  <Link>Customers</Link>
  <Link>Leads</Link>
  {/* ... 8 more links */}
</nav>
// Horizontal scroll, cramped ❌
```

**Solution: Hamburger Menu**
```tsx
{/* Mobile: Hamburger */}
<Sheet open={menuOpen} onOpenChange={setMenuOpen}>
  <SheetTrigger asChild className="md:hidden">
    <Button variant="ghost" size="icon">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-[280px]">
    <nav className="flex flex-col gap-2 mt-6">
      <Link className="px-4 py-3 rounded-lg hover:bg-accent">
        Dashboard
      </Link>
      <Link className="px-4 py-3 rounded-lg hover:bg-accent">
        Customers
      </Link>
      {/* ... */}
    </nav>
  </SheetContent>
</Sheet>

{/* Desktop: Horizontal Nav */}
<nav className="hidden md:flex gap-4">
  <Link>Dashboard</Link>
  <Link>Customers</Link>
  {/* ... */}
</nav>
```

**Pattern:**
- Mobile: Slide-out drawer navigation
- Desktop: Horizontal navigation bar
- Larger touch targets on mobile (py-3)
- Clear visual hierarchy

---

### 8. Date Pickers → Native on Mobile

**Current Problem:**
```tsx
<Popover>
  <PopoverTrigger>
    <Button>Pick Date</Button>
  </PopoverTrigger>
  <PopoverContent>
    <Calendar />
  </PopoverContent>
</Popover>
// Calendar popover awkward on mobile ❌
```

**Solution: Native Input on Mobile**
```tsx
{/* Mobile: Native date input */}
<div className="md:hidden">
  <Input 
    type="date" 
    value={date}
    onChange={(e) => setDate(e.target.value)}
    className="text-base"
  />
</div>

{/* Desktop: Calendar popover */}
<div className="hidden md:block">
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline">
        {date ? format(date, 'PPP') : 'Pick a date'}
      </Button>
    </PopoverTrigger>
    <PopoverContent>
      <Calendar mode="single" selected={date} onSelect={setDate} />
    </PopoverContent>
  </Popover>
</div>
```

**Pattern:**
- Mobile: Native `<input type="date">` (better UX)
- Desktop: Custom calendar component
- Consistent date format handling

---

### 9. Dropdowns → Bottom Sheet on Mobile

**Current Problem:**
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    <MoreVertical />
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    {/* 8+ menu items */}
  </DropdownMenuContent>
</DropdownMenu>
// Menu goes off-screen on mobile ❌
```

**Solution: Responsive Menu**
```tsx
{/* Mobile: Bottom Sheet */}
<div className="md:hidden">
  <Sheet open={actionOpen} onOpenChange={setActionOpen}>
    <SheetTrigger asChild>
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </SheetTrigger>
    <SheetContent side="bottom" className="h-auto">
      <div className="space-y-2 py-4">
        <Button variant="ghost" className="w-full justify-start h-12">
          <Pencil className="h-4 w-4 mr-3" />
          Edit
        </Button>
        <Button variant="ghost" className="w-full justify-start h-12">
          <Trash2 className="h-4 w-4 mr-3" />
          Delete
        </Button>
      </div>
    </SheetContent>
  </Sheet>
</div>

{/* Desktop: Dropdown */}
<div className="hidden md:block">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>
        <Pencil className="h-4 w-4 mr-2" />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem>
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

**Pattern:**
- Mobile: Bottom sheet with large touch targets
- Desktop: Traditional dropdown menu
- Icons + text labels on mobile
- Full-width buttons on mobile (easier to tap)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Set up responsive infrastructure and shared components

**Tasks:**
- [ ] Create responsive utility components
  - ResponsiveTable (table → cards)
  - ResponsiveDialog (adaptive width)
  - ResponsiveFilters (inline → drawer)
  - ResponsiveActions (dropdown → sheet)
- [ ] Update Button component with touch-friendly sizes
- [ ] Update Badge component with responsive text
- [ ] Create mobile navigation component
- [ ] Set up responsive testing utilities

**Deliverables:**
- `components/shared/ResponsiveTable.tsx`
- `components/shared/ResponsiveDialog.tsx`
- `components/shared/ResponsiveFilters.tsx`
- `components/shared/MobileNav.tsx`
- Updated `components/ui/button.tsx`
- Updated `components/ui/badge.tsx`

**Success Criteria:**
- ✅ All shared components work on 320px width
- ✅ Touch targets minimum 44x44px
- ✅ Text readable (16px minimum)

---

### Phase 2: Critical Pages (Week 3-4)

**Goal:** Make core CRM pages mobile-responsive

**Priority 1: Customers Page**
- [ ] Replace table with ResponsiveTable
- [ ] Update CustomerFilters to use ResponsiveFilters
- [ ] Make action buttons touch-friendly
- [ ] Test on mobile devices

**Priority 2: Leads Page**
- [ ] Replace table with ResponsiveTable
- [ ] Update status badges for mobile
- [ ] Make create/edit dialogs responsive
- [ ] Test on mobile devices

**Priority 3: Quotations Page**
- [ ] Replace complex table with ResponsiveTable
- [ ] Update QuotationFilters
- [ ] Make version history mobile-friendly
- [ ] Test on mobile devices

**Deliverables:**
- Mobile-responsive Customers page
- Mobile-responsive Leads page
- Mobile-responsive Quotations page

**Success Criteria:**
- ✅ All pages usable on 375px width (iPhone SE)
- ✅ No horizontal scroll
- ✅ All actions accessible

---

### Phase 3: Supporting Pages (Week 5-6)

**Goal:** Make remaining pages mobile-responsive

**Pages:**
- [ ] Call Planner
- [ ] Interactions
- [ ] Audit Logs (add mobile filters)
- [ ] Dashboard (responsive stats cards)
- [ ] Admin Users

**Deliverables:**
- All main pages mobile-responsive

**Success Criteria:**
- ✅ Consistent mobile UX across all pages
- ✅ No regressions on desktop

---

### Phase 4: Dialogs & Modals (Week 7-8)

**Goal:** Make all 20+ dialogs mobile-responsive

**Create/Edit Dialogs:**
- [ ] CreateCustomerDialog
- [ ] CreateLeadDialog
- [ ] CreateQuotationDialog
- [ ] CreateCallPlanDialog
- [ ] CreateInteractionDialog
- [ ] All Edit dialogs

**Detail Dialogs:**
- [ ] CustomerContactsDialog
- [ ] LeadDetailDialog
- [ ] QuotationDetailDialog
- [ ] CallPlanDetailDialog
- [ ] InteractionDetailDialog
- [ ] AuditLogDetailDialog

**Action Dialogs:**
- [ ] AssignSalesRepDialog
- [ ] CreateContactDialog
- [ ] AddUserDialog
- [ ] InviteUserDialog

**Pattern to Apply:**
```tsx
// Before
<DialogContent className="sm:max-w-[500px]">

// After
<DialogContent className="w-[calc(100vw-1rem)] sm:max-w-[500px] md:max-w-[600px]">
  <DialogHeader className="p-4 sm:p-6">
    <DialogTitle className="text-lg sm:text-xl">...</DialogTitle>
  </DialogHeader>
  <div className="p-4 sm:p-6 space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* Form fields */}
    </div>
  </div>
  <DialogFooter className="p-4 sm:p-6">
    <Button className="w-full sm:w-auto h-11 sm:h-10">Submit</Button>
  </DialogFooter>
</DialogContent>
```

**Deliverables:**
- All dialogs mobile-responsive
- Consistent padding/spacing
- Touch-friendly buttons

**Success Criteria:**
- ✅ All dialogs usable on 375px width
- ✅ Forms stack properly on mobile
- ✅ Buttons full-width on mobile

---

### Phase 5: Polish & Testing (Week 9-10)

**Goal:** Refine UX and comprehensive testing

**Tasks:**
- [ ] User testing with real sales reps on mobile
- [ ] Fix edge cases and bugs
- [ ] Performance optimization (lazy loading images)
- [ ] Accessibility audit (screen readers, keyboard nav)
- [ ] Cross-browser testing (Safari iOS, Chrome Android)
- [ ] Dark mode verification on mobile

**Testing Devices:**
- iPhone SE (375px) - Smallest modern phone
- iPhone 12/13 (390px) - Common size
- iPhone 14 Pro Max (430px) - Large phone
- iPad Mini (768px) - Small tablet
- iPad Pro (1024px) - Large tablet
- Samsung Galaxy S21 (360px) - Android
- Samsung Galaxy Fold (280px unfolded) - Edge case

**Deliverables:**
- Bug fix list and resolutions
- Performance report
- Accessibility report
- Cross-browser compatibility matrix

**Success Criteria:**
- ✅ Zero critical bugs on mobile
- ✅ Lighthouse mobile score >90
- ✅ WCAG 2.1 AA compliance
- ✅ Works on all target devices

---

## Design Patterns

### Pattern 1: Adaptive Table/Card Layout

**Use Case:** Any page with data tables

**Implementation:**
```tsx
export function ResponsiveTable<T>({ 
  data, 
  columns, 
  renderCard 
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(col => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map(item => (
              <TableRow key={item.id}>
                {columns.map(col => (
                  <TableCell key={col.key}>
                    {col.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {data.map(item => renderCard(item))}
      </div>
    </>
  );
}
```

**Usage:**
```tsx
<ResponsiveTable
  data={customers}
  columns={[
    { key: 'name', label: 'Company', render: (c) => c.companyName },
    { key: 'county', label: 'County', render: (c) => c.countyName },
  ]}
  renderCard={(customer) => (
    <Card className="p-4">
      <h3 className="font-semibold">{customer.companyName}</h3>
      <p className="text-sm text-muted-foreground">{customer.countyName}</p>
    </Card>
  )}
/>
```

---

### Pattern 2: Responsive Dialog Wrapper

**Use Case:** All dialog components

**Implementation:**
```tsx
export function ResponsiveDialog({ 
  children, 
  title, 
  size = 'default',
  ...props 
}: ResponsiveDialogProps) {
  const sizeClasses = {
    sm: 'w-[calc(100vw-1rem)] sm:max-w-[400px]',
    default: 'w-[calc(100vw-1rem)] sm:max-w-[500px] md:max-w-[600px]',
    lg: 'w-[calc(100vw-1rem)] sm:max-w-[600px] md:max-w-[800px]',
    xl: 'w-[calc(100vw-1rem)] sm:max-w-[700px] md:max-w-[900px] lg:max-w-[1000px]',
  };

  return (
    <Dialog {...props}>
      <DialogContent className={cn(
        sizeClasses[size],
        'max-h-[95vh] p-0 gap-0'
      )}>
        <DialogHeader className="p-4 sm:p-6 border-b">
          <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
```

**Usage:**
```tsx
<ResponsiveDialog open={open} onOpenChange={setOpen} title="Create Customer" size="default">
  <form className="flex flex-col flex-1 min-h-0">
    <div className="overflow-y-auto flex-1 p-4 sm:p-6">
      {/* Form content */}
    </div>
    <DialogFooter className="p-4 sm:p-6 border-t">
      <Button className="w-full sm:w-auto">Submit</Button>
    </DialogFooter>
  </form>
</ResponsiveDialog>
```

---

### Pattern 3: Mobile Filter Drawer

**Use Case:** All filter components

**Implementation:**
```tsx
export function ResponsiveFilters({ 
  children, 
  activeCount = 0,
  onApply 
}: ResponsiveFiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Filter Button + Sheet */}
      <div className="md:hidden">
        <Button 
          onClick={() => setOpen(true)} 
          variant="outline"
          className="w-full h-11"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters {activeCount > 0 && `(${activeCount})`}
        </Button>
        
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[85vh] flex flex-col">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {children}
            </div>
            <SheetFooter className="border-t pt-4">
              <Button 
                onClick={() => {
                  onApply();
                  setOpen(false);
                }}
                className="w-full h-11"
              >
                Apply Filters
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Inline Filters */}
      <div className="hidden md:flex gap-4 items-center flex-wrap">
        {children}
      </div>
    </>
  );
}
```

---

### Pattern 4: Touch-Friendly Action Menu

**Use Case:** Row actions in tables/cards

**Implementation:**
```tsx
export function ResponsiveActionMenu({ 
  items 
}: ResponsiveActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto">
            <div className="space-y-2 py-4">
              {items.map(item => (
                <Button
                  key={item.label}
                  variant="ghost"
                  className="w-full justify-start h-12 text-base"
                  onClick={() => {
                    item.onClick();
                    setOpen(false);
                  }}
                >
                  {item.icon && <item.icon className="h-5 w-5 mr-3" />}
                  {item.label}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Dropdown */}
      <div className="hidden md:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {items.map(item => (
              <DropdownMenuItem key={item.label} onClick={item.onClick}>
                {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                {item.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
```

---

## Testing Strategy

### Manual Testing Checklist

**Per Page/Component:**
- [ ] Test on 320px width (smallest phones)
- [ ] Test on 375px width (iPhone SE)
- [ ] Test on 390px width (iPhone 12/13)
- [ ] Test on 768px width (iPad)
- [ ] Test on 1024px width (desktop)
- [ ] Test landscape orientation
- [ ] Test with large text (accessibility settings)
- [ ] Test with touch (no mouse)
- [ ] Test keyboard navigation
- [ ] Test screen reader (VoiceOver/TalkBack)

### Automated Testing

**Responsive Tests (Playwright):**
```typescript
test.describe('Mobile Responsiveness', () => {
  test('Customers page works on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/customers');
    
    // Should show cards, not table
    await expect(page.locator('[data-testid="customer-card"]')).toBeVisible();
    await expect(page.locator('table')).not.toBeVisible();
    
    // Touch targets should be large enough
    const createButton = page.locator('[data-testid="create-customer"]');
    const box = await createButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('Filters work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/customers');
    
    // Should show filter button
    await page.click('[data-testid="mobile-filter-button"]');
    
    // Sheet should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    
    // Can apply filters
    await page.fill('input[placeholder="Search"]', 'Test');
    await page.click('button:has-text("Apply Filters")');
    
    // Sheet should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});
```

**Visual Regression Tests:**
```typescript
test('Visual regression - mobile vs desktop', async ({ page }) => {
  // Mobile
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/customers');
  await expect(page).toHaveScreenshot('customers-mobile.png');
  
  // Desktop
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page).toHaveScreenshot('customers-desktop.png');
});
```

### Performance Testing

**Lighthouse CI:**
```yaml
# .lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:5173/customers",
        "http://localhost:5173/leads",
        "http://localhost:5173/quotations"
      ],
      "settings": {
        "preset": "mobile"
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }]
      }
    }
  }
}
```

---

## Success Metrics

### Technical KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Mobile Lighthouse Score** | >90 | Automated CI |
| **Touch Target Size** | 100% ≥44px | Manual audit |
| **Horizontal Scroll** | 0 pages | Manual test |
| **Text Readability** | 100% ≥16px | Manual audit |
| **Load Time (3G)** | <3s | Lighthouse |
| **Accessibility Score** | >90 | Lighthouse |

### User Experience KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Mobile Task Completion** | >95% | User testing |
| **Mobile User Satisfaction** | >4.5/5 | Survey |
| **Mobile Adoption Rate** | >40% | Analytics |
| **Mobile Session Duration** | +30% | Analytics |
| **Mobile Error Rate** | <2% | Error tracking |

### Business KPIs

| Metric | Target | Impact |
|--------|--------|--------|
| **Field Sales Productivity** | +25% | More mobile data entry |
| **Mobile User Retention** | +20% | Better UX = more usage |
| **Support Tickets (Mobile)** | -40% | Fewer UX issues |
| **Competitive Win Rate** | +10% | Mobile as differentiator |

---

## Appendix

### Responsive Utilities

**Tailwind Custom Classes:**
```css
/* tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      spacing: {
        'touch': '44px', // Minimum touch target
      },
      fontSize: {
        'mobile-base': '16px', // Minimum readable text
      }
    }
  }
}
```

**Custom Hooks:**
```typescript
// hooks/useMediaQuery.ts
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery('(max-width: 768px)');
```

### Component Library

**Shadcn/ui Components to Add:**
- Sheet (for mobile drawers)
- Drawer (alternative to Sheet)
- Accordion (for collapsible sections)

**Install:**
```bash
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add drawer
npx shadcn-ui@latest add accordion
```

### Browser Support

**Target Browsers:**
- Chrome/Edge (last 2 versions)
- Safari iOS (last 2 versions)
- Chrome Android (last 2 versions)
- Firefox (last 2 versions)

**Polyfills Needed:**
- None (modern browsers only)

---

## Next Steps

**Immediate Actions:**
1. Review this plan with team
2. Set up mobile testing environment
3. Create responsive component library
4. Start Phase 1 implementation

**Long-term:**
- Monitor mobile analytics
- Gather user feedback
- Iterate on mobile UX
- Consider native mobile app (Phase 6)

---

**Document Status:** Living document - Update as implementation progresses

**Next Review:** End of Phase 1 (Week 2)

