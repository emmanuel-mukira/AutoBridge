# Row-Level Security (RLS) Implementation Guide

## Overview
This guide documents the strategy for implementing PostgreSQL Row-Level Security (RLS) when setting up the shared database for multi-tenant CRM access.

---

## Why RLS?

### **Security Benefits**
- ✅ **Database-level isolation** - Even if application logic fails, data is protected
- ✅ **Multi-tenancy** - Users only see their company's data
- ✅ **Role-based access** - Sales reps see only their customers, admins see all
- ✅ **Audit compliance** - Enforced at database level, not just application
- ✅ **Defense in depth** - Additional security layer beyond application logic

### **Use Cases in CRM**
1. **Company Isolation**: Users from Company A cannot see Company B's data
2. **Sales Rep Restrictions**: Sales reps only see their assigned customers
3. **Admin Override**: Admins can see all data within their company
4. **Cross-Backend Security**: Works for both Express.js and Spring Boot backends

---

## Current Architecture (Without RLS)

```typescript
// Application-level filtering (current approach)
const customers = await prisma.customer.findMany({
  where: {
    companyId: req.user.companyId, // Application enforces this
    deletedAt: null
  }
});
```

**Risks**:
- ❌ If developer forgets `companyId` filter → data leak
- ❌ SQL injection could bypass filters
- ❌ Direct database access bypasses application logic
- ❌ Difficult to audit all queries

---

## RLS Architecture (Future Implementation)

```typescript
// Set session context
await prisma.$executeRaw`
  SET LOCAL app.current_user_id = ${userId};
  SET LOCAL app.current_company_id = ${companyId};
  SET LOCAL app.user_role = ${role};
`;

// Query without explicit filter - RLS enforces it
const customers = await prisma.customer.findMany({
  where: { deletedAt: null }
  // companyId filter enforced by RLS policy automatically
});
```

**Benefits**:
- ✅ Database enforces isolation even if code forgets filter
- ✅ Works across all backends (Express, Spring Boot)
- ✅ Centralized security policy
- ✅ Easier to audit and test

---

## Implementation Strategy

### **Phase 1: Preparation (Do Now)**

**1. Add RLS-Ready Indexes**

Already done in migration! These indexes support RLS policies:
```sql
-- Supports company isolation policy
CREATE INDEX customers_company_id_company_name_idx 
ON crm.customers(company_id, company_name);

-- Supports sales rep restriction policy
CREATE INDEX customers_sales_rep_id_created_at_idx 
ON crm.customers(sales_rep_id, created_at);
```

**2. Document Current Access Patterns**

Create a matrix of who can access what:

| Role | Customers | Leads | Quotations | Interactions | Users |
|------|-----------|-------|------------|--------------|-------|
| **Admin** | All in company | All in company | All in company | All in company | All in company |
| **Sales Rep** | Own + unassigned | Own + unassigned | Own | Own | Read own profile |
| **Manager** | All in company | All in company | All in company | All in company | All in company |

**3. Test Current Queries**

Document all query patterns that will need RLS policies:
- Customer list by company
- Customer list by sales rep
- Lead list by status
- Interaction history
- Quotation access

---

### **Phase 2: Enable RLS (Before Production)**

**1. Enable RLS on Tables**

```sql
-- Enable RLS on all CRM tables
ALTER TABLE crm.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.call_planner ENABLE ROW LEVEL SECURITY;

-- Enable RLS on auth tables (selective)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth.audit_logs ENABLE ROW LEVEL SECURITY;
```

**2. Create RLS Policies**

**Company Isolation Policy** (applies to all users):
```sql
-- Customers: Users only see their company's data
CREATE POLICY company_isolation_customers ON crm.customers
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::int);

-- Leads: Users only see their company's leads
CREATE POLICY company_isolation_leads ON crm.leads
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::int);

-- Quotations: Users only see their company's quotations
CREATE POLICY company_isolation_quotations ON crm.quotations
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::int);

-- Interactions: Users only see their company's interactions
CREATE POLICY company_isolation_interactions ON crm.interactions
  FOR ALL
  USING (company_id = current_setting('app.current_company_id')::int);
```

**Sales Rep Restriction Policy** (additional restriction for non-admins):
```sql
-- Sales reps only see their own customers (unless admin)
CREATE POLICY sales_rep_customers ON crm.customers
  FOR ALL
  USING (
    current_setting('app.user_role') = 'admin'
    OR sales_rep_id = current_setting('app.current_user_id')::int
    OR sales_rep_id IS NULL  -- Unassigned customers visible to all
  );

-- Sales reps only see their own leads
CREATE POLICY sales_rep_leads ON crm.leads
  FOR ALL
  USING (
    current_setting('app.user_role') = 'admin'
    OR sales_rep_id = current_setting('app.current_user_id')::int
  );

-- Sales reps only see their own interactions
CREATE POLICY sales_rep_interactions ON crm.interactions
  FOR ALL
  USING (
    current_setting('app.user_role') = 'admin'
    OR sales_rep_id = current_setting('app.current_user_id')::int
  );
```

**User Access Policy**:
```sql
-- Users can see other users in their company
CREATE POLICY company_users ON auth.users
  FOR SELECT
  USING (company_id = current_setting('app.current_company_id')::int);

-- Users can only update their own profile
CREATE POLICY user_self_update ON auth.users
  FOR UPDATE
  USING (id = current_setting('app.current_user_id')::int);
```

**3. Force RLS (No Bypass)**

```sql
-- Force RLS even for table owner (extra security)
ALTER TABLE crm.customers FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.leads FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.quotations FORCE ROW LEVEL SECURITY;
ALTER TABLE crm.interactions FORCE ROW LEVEL SECURITY;
```

---

### **Phase 3: Application Integration**

**Express.js Middleware**:

```typescript
// src/middleware/setRLSContext.ts
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../client.js';

export async function setRLSContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const user = req.user; // From requireAuth middleware
  
  if (!user) {
    return next();
  }
  
  try {
    // Set session variables for RLS
    await prisma.$executeRaw`
      SET LOCAL app.current_user_id = ${user.id};
      SET LOCAL app.current_company_id = ${user.companyId};
      SET LOCAL app.user_role = ${user.role.name};
    `;
    
    next();
  } catch (error) {
    console.error('Failed to set RLS context:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Apply to all authenticated routes
app.use(requireAuth());
app.use(setRLSContext);
```

**Spring Boot Integration**:

```java
// RLSInterceptor.java
@Component
public class RLSInterceptor extends EmptyInterceptor {
    
    @Override
    public String onPrepareStatement(String sql) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null && auth.getPrincipal() instanceof UserDetails) {
            User user = (User) auth.getPrincipal();
            
            String rlsContext = String.format(
                "SET LOCAL app.current_user_id = %d; " +
                "SET LOCAL app.current_company_id = %d; " +
                "SET LOCAL app.user_role = '%s'; ",
                user.getId(),
                user.getCompanyId(),
                user.getRole()
            );
            
            return rlsContext + sql;
        }
        
        return sql;
    }
}
```

---

### **Phase 4: Testing RLS**

**1. Test Company Isolation**

```sql
-- Test as Company 1 user
SET app.current_user_id = 1;
SET app.current_company_id = 1;
SET app.user_role = 'sales_rep';

SELECT * FROM crm.customers;
-- Should only return Company 1 customers

-- Try to access Company 2 data
SELECT * FROM crm.customers WHERE company_id = 2;
-- Should return 0 rows (RLS blocks it)
```

**2. Test Sales Rep Restrictions**

```sql
-- Test as Sales Rep (ID 5)
SET app.current_user_id = 5;
SET app.current_company_id = 1;
SET app.user_role = 'sales_rep';

SELECT * FROM crm.customers;
-- Should only return customers assigned to sales_rep_id = 5

-- Test as Admin
SET app.current_user_id = 1;
SET app.current_company_id = 1;
SET app.user_role = 'admin';

SELECT * FROM crm.customers;
-- Should return ALL customers in company 1
```

**3. Test Insert/Update/Delete**

```sql
-- Sales rep tries to insert customer for another company
SET app.current_user_id = 5;
SET app.current_company_id = 1;
SET app.user_role = 'sales_rep';

INSERT INTO crm.customers (company_id, company_name, ...)
VALUES (2, 'Hacker Company', ...);
-- Should fail (RLS blocks cross-company insert)
```

---

## Migration Path

### **Current State (No RLS)**
```typescript
// Explicit filtering required everywhere
const customers = await prisma.customer.findMany({
  where: {
    companyId: req.user.companyId,  // Must remember this!
    salesRepId: req.user.id,        // Must remember this!
    deletedAt: null
  }
});
```

### **Transition State (RLS + Explicit Filters)**
```typescript
// Set RLS context
await setRLSContext(req.user);

// Keep explicit filters during transition
const customers = await prisma.customer.findMany({
  where: {
    companyId: req.user.companyId,  // Redundant but safe
    salesRepId: req.user.id,        // Redundant but safe
    deletedAt: null
  }
});
// RLS enforces isolation even if filters are removed
```

### **Final State (RLS Only)**
```typescript
// Set RLS context
await setRLSContext(req.user);

// Simplified queries - RLS enforces isolation
const customers = await prisma.customer.findMany({
  where: { deletedAt: null }
  // companyId and salesRepId filters enforced by RLS
});
```

---

## Performance Considerations

### **Index Requirements**

RLS policies use WHERE clauses, so indexes are critical:

✅ **Already Added**:
- `customers(company_id, company_name)` - Supports company isolation
- `customers(sales_rep_id, created_at)` - Supports sales rep filtering
- `leads(company_id, status, created_at)` - Supports lead queries
- `users(company_id, status)` - Supports user queries

### **Performance Impact**

- **Minimal overhead** (~5-10%) with proper indexes
- **Query planner** uses indexes efficiently with RLS
- **Materialized views** can bypass RLS for reporting (if needed)

### **Monitoring**

```sql
-- Check RLS policy usage
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'crm';

-- Check query performance with RLS
EXPLAIN ANALYZE
SELECT * FROM crm.customers WHERE deleted_at IS NULL;
-- Should show "Index Scan" with RLS filter applied
```

---

## Rollback Plan

If RLS causes issues:

```sql
-- Disable RLS on specific table
ALTER TABLE crm.customers DISABLE ROW LEVEL SECURITY;

-- Drop specific policy
DROP POLICY company_isolation_customers ON crm.customers;

-- Disable RLS on all tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'crm'
  LOOP
    EXECUTE 'ALTER TABLE crm.' || r.tablename || ' DISABLE ROW LEVEL SECURITY';
  END LOOP;
END $$;
```

---

## Implementation Checklist

### **Before RLS (Current)**
- [x] Add indexes for RLS policies
- [x] Document access patterns
- [x] Test current queries
- [ ] Create RLS test plan

### **During RLS Implementation**
- [ ] Enable RLS on tables
- [ ] Create company isolation policies
- [ ] Create role-based policies
- [ ] Implement setRLSContext middleware (Express)
- [ ] Implement RLS interceptor (Spring Boot)
- [ ] Test all policies thoroughly
- [ ] Monitor performance

### **After RLS (Production)**
- [ ] Gradually remove redundant filters
- [ ] Monitor query performance
- [ ] Audit RLS policy effectiveness
- [ ] Document for team

---

## Security Best Practices

1. **Always set session variables** before queries
2. **Use FORCE ROW LEVEL SECURITY** for critical tables
3. **Test policies with different roles** before production
4. **Monitor for policy bypasses** in logs
5. **Use indexes** on policy columns
6. **Document all policies** clearly
7. **Regular security audits** of RLS policies

---

## When to Implement

**Implement RLS when**:
- ✅ Setting up shared database for multi-backend access
- ✅ Before production launch
- ✅ Adding Spring Boot backend
- ✅ Implementing multi-tenancy

**Current Status**: **Preparation phase** - indexes ready, documentation complete

**Next Steps**: Implement during shared database setup (before Spring Boot integration)

---

## Summary

RLS provides **database-level security** that works across all backends (Express.js, Spring Boot). It's a critical security layer for multi-tenant CRM systems.

**Key Benefits**:
- Defense in depth
- Works across backends
- Centralized security policy
- Audit compliance

**Implementation**: Straightforward with proper planning and testing. Indexes already in place to support RLS policies efficiently.
