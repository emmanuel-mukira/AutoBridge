# Multi-Tenant Schema Changes

## Overview
Complete refactor to support multi-tenant SaaS architecture with enhanced contact management and quotation versioning.

---

## 1. Multi-Tenant Architecture

### Company Model (Tenant)
```prisma
model Company {
  id        Int           @id
  name      String
  subdomain String?       @unique  // e.g., "gaston" → gaston.yourapp.com
  status    CompanyStatus           // ACTIVE, SUSPENDED, TRIAL
  createdAt DateTime
  updatedAt DateTime
}
```

**Subdomain Usage:**
- **NOT** the company's actual domain (e.g., gaston.co.ke)
- **IS** for SaaS URL routing: `gaston.yourapp.com`
- Enables tenant identification from URL
- Supports branded login pages per company

### Tenant-Scoped Models
All models now include `companyId` for data isolation:
- ✅ User
- ✅ Customer
- ✅ CallPlan
- ✅ Lead
- ✅ Quotation
- ✅ Interaction
- ✅ AuditLog (NEW)

---

## 2. Audit Log Multi-Tenancy

### Before:
```prisma
model AuditLog {
  userId      Int?
  action      String
  // No company scoping
}
```

### After:
```prisma
model AuditLog {
  companyId   Int?     // NEW: Tenant isolation
  userId      Int?
  action      String
  // ... rest
}
```

**Benefits:**
- Per-company audit logs
- Company-specific analytics
- Compliance and monitoring per tenant
- Data isolation for security

---

## 3. Contact Management Enhancement

### Replaced: Contact → CustomerContact

**Old Model:**
```prisma
model Contact {
  contactName  String
  title        String?
  mobileNumber String?
}
```

**New Model:**
```prisma
model CustomerContact {
  firstName    String
  lastName     String
  title        String?
  email        String?
  phone        String?
  isPrimary    Boolean  @default(false)
  createdAt    DateTime
  updatedAt    DateTime
}
```

**Features:**
- Separate first/last names
- Email and phone fields
- Primary contact flag (optional)
- Multiple contacts per customer
- Timestamps for tracking

---

## 4. Call Plan Contact Integration

### Updated CallPlan:
```prisma
model CallPlan {
  contactPersonId   Int?  // NEW: Optional contact person
  completedAt       DateTime?
  notes             String?
  // ... rest
}
```

**Workflow Support:**
1. **Contact Known:** Set `contactPersonId` when creating call plan
2. **Contact Pending:** Leave `contactPersonId` as `null`, update later
3. **Contact Changed:** Update `contactPersonId` when meeting person changes

---

## 5. Quotation Versioning

### Enhanced Quotation Model:
```prisma
model Quotation {
  quoteNumber  String
  version      Int      @default(1)      // NEW: Version tracking
  discount     Decimal?                  // NEW: Discount percentage
  notes        String?                   // NEW: Version notes
  status       String   @default("DRAFT") // NEW: Lifecycle status
  supersededBy Int?                      // NEW: Points to newer version
  
  @@unique([quoteNumber, version])      // Composite unique
}
```

**Status Values:**
- `DRAFT` - Being prepared
- `SENT` - Sent to customer
- `ACCEPTED` - Customer accepted
- `REJECTED` - Customer rejected
- `SUPERSEDED` - Replaced by newer version

**Version Workflow:**
```
Quote Q001-v1 (SENT) → Customer requests discount
  ↓
Quote Q001-v2 (SENT, discount: 10%) → Customer accepts
  ↓
Q001-v1.status = SUPERSEDED
Q001-v1.supersededBy = Q001-v2.id
Q001-v2.status = ACCEPTED
```

---

## 6. Migration Steps

```bash
# 1. Reset database (drops all data)
npx prisma migrate reset --force

# This automatically:
# - Drops database
# - Creates new schema
# - Runs migrations
# - Executes seed file
```

---

## 7. Seed Data

**Created:**
- 1 Company (Demo Company Ltd, subdomain: "demo")
- 2 Roles (admin, sales_rep)
- 4 Users (all in same company)
- 6 Customers
- 6 CustomerContacts (with realistic data)
- 5 CallPlans (1 completed, 1 with pending contact)

**Login Credentials:**
- Admin: `admin@example.com` / `Admin#123`
- Sales: `john@example.com` / `Sales#123`
- Sales: `jane@example.com` / `Sales#123`
- Sales: `mike@example.com` / `Sales#123`

---

## 8. Next Steps (After Migration)

1. ✅ Run migration: `npx prisma migrate reset --force`
2. ⏳ Update services to inject `companyId` from auth context
3. ⏳ Update Zod schemas for new fields
4. ⏳ Add middleware for automatic `companyId` filtering
5. ⏳ Update controllers for `contactPersonId` handling
6. ⏳ Test all CRUD operations with new schema

---

## 9. Breaking Changes

**Services/Controllers Need Updates:**
- All create operations must include `companyId`
- All queries must filter by `companyId`
- CallPlan create/update handles optional `contactPersonId`
- Quotation operations handle versioning logic

**Frontend Impact:**
- Contact selection dropdown (filtered by customer)
- "Add New Contact" modal for call plans
- Quotation version history display
- Per-company analytics dashboards
