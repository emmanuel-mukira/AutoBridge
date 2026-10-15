# Testing Call Planner - Quick Start Guide

## 🚀 Setup Steps

### 1. Run Migration
```bash
cd crm-system/backend
npx prisma migrate dev --name add_call_planner
```

This creates:
- CallPlan table
- Updates User table with auth fields
- Creates UserSession and AuditLog tables

### 2. Run Seed
```bash
npm run seed
```

This creates:
- **4 users** (1 admin, 3 sales reps)
- **6 customers** (5 assigned, 1 unassigned)
- **5 call plans** (various statuses)

### 3. Start Backend
```bash
npm run dev
```

Server runs on `http://localhost:3000`

---

## 🔐 Test Accounts

| Email | Password | Role | Has Plans |
|-------|----------|------|-----------|
| admin@example.com | Admin#123 | Admin | No |
| john@example.com | Sales#123 | Sales Rep | 2 plans |
| jane@example.com | Sales#123 | Sales Rep | 2 plans |
| mike@example.com | Sales#123 | Sales Rep | 1 plan |

---

## 🧪 Test Scenarios

### Scenario 1: Sales Rep Sees Only Their Plans
**Login as:** john@example.com

**Test:**
```bash
GET /api/call-plans
Authorization: Bearer <john's token>
```

**Expected:** Only John's 2 call plans returned

---

### Scenario 2: Admin Sees All Plans
**Login as:** admin@example.com

**Test:**
```bash
GET /api/call-plans
Authorization: Bearer <admin token>
```

**Expected:** All 5 call plans from all reps

---

### Scenario 3: Create Call Plan (Auto-Assign)
**Login as:** jane@example.com

**Test:**
```bash
POST /api/call-plans
Content-Type: application/json

{
  "salesRepId": 2,
  "customerId": 3,
  "weekBeginning": "2026-01-13T00:00:00Z",
  "dayOfWeek": "Monday",
  "plannedDate": "2026-01-13T09:00:00Z",
  "purpose": "Prospective",
  "locationType": "Customer_Office",
  "exactLocation": "Green Energy HQ, Kisumu",
  "productLine": "Generator",
  "proposedGenerator": "Cummins 150kVA"
}
```

**Expected:** 
- ✅ 201 Created
- Plan assigned to Jane (salesRepId: 2)

---

### Scenario 4: Sales Rep Cannot Create for Others
**Login as:** john@example.com

**Test:**
```bash
POST /api/call-plans
{
  "salesRepId": 3,  // Mike's ID
  "customerId": 5,
  ...
}
```

**Expected:** 
- ❌ 403 Forbidden
- Error: "Cannot create plans for other users"

---

### Scenario 5: Update Call Plan
**Login as:** john@example.com

**Test:**
```bash
PATCH /api/call-plans/1
{
  "exactLocation": "Acme New Location, Westlands",
  "proposedGenerator": "CAT 120kVA"
}
```

**Expected:** 
- ✅ 200 OK
- Plan updated with new values

---

### Scenario 6: Sales Rep Cannot Update Others' Plans
**Login as:** john@example.com

**Test:**
```bash
PATCH /api/call-plans/3  // Jane's plan
{
  "exactLocation": "New location"
}
```

**Expected:** 
- ❌ 403 Forbidden
- Error: "Access denied"

---

### Scenario 7: Mark Plan as Completed
**Login as:** john@example.com

**Test:**
```bash
PATCH /api/call-plans/1/complete
{
  "isCompleted": true
}
```

**Expected:** 
- ✅ 200 OK
- Plan marked as completed

---

### Scenario 8: Delete Call Plan
**Login as:** john@example.com

**Test:**
```bash
DELETE /api/call-plans/2
```

**Expected:** 
- ✅ 200 OK
- Message: "Call plan deleted successfully"

---

### Scenario 9: Admin Can Access Any Plan
**Login as:** admin@example.com

**Test:**
```bash
GET /api/call-plans/3  // Jane's plan
```

**Expected:** 
- ✅ 200 OK
- Returns Jane's plan details

---

### Scenario 10: Filter by Date Range
**Login as:** jane@example.com

**Test:**
```bash
GET /api/call-plans?startDate=2026-01-13T00:00:00Z&endDate=2026-01-20T00:00:00Z
```

**Expected:** 
- ✅ 200 OK
- Only Jane's plans within date range

---

### Scenario 11: Filter by Completion Status
**Login as:** john@example.com

**Test:**
```bash
GET /api/call-plans?isCompleted=false
```

**Expected:** 
- ✅ 200 OK
- Only John's incomplete plans

---

## 📊 Seeded Data Summary

### Users
- **Admin User** (ID: 1) - admin@example.com
- **John Doe** (ID: 2) - john@example.com, SR001
- **Jane Smith** (ID: 3) - jane@example.com, SR002
- **Mike Johnson** (ID: 4) - mike@example.com, SR003

### Customers (All Visible to All Reps)
1. **Acme Corporation** (Nairobi) → Assigned to John
2. **TechStart Ltd** (Mombasa) → Assigned to John
3. **Green Energy Co** (Kisumu) → Assigned to Jane
4. **BuildRight Construction** (Nakuru) → Assigned to Jane
5. **Hospital Plus** (Eldoret) → Assigned to Mike
6. **DataCorp Kenya** (Nairobi) → Unassigned

### Call Plans
1. John → Acme (Monday, Prospective, Pending)
2. John → TechStart (Wednesday, Selling, **Completed**)
3. Jane → Green Energy (Next Tuesday, Coverage, Pending)
4. Jane → BuildRight (Next Thursday, Collection, Pending)
5. Mike → Hospital Plus (Friday, Complaint, Pending)

---

## 🐛 Common Issues

### Migration Fails
**Error:** "Cannot execute step"
**Fix:** Check that `sessionToken` and `lastRefreshed` are nullable in schema

### Seed Fails
**Error:** "Property 'customer' does not exist"
**Fix:** Run migration first to generate Prisma Client

### 403 Forbidden on All Requests
**Fix:** Check that you're sending valid JWT token in Authorization header

### Cannot Login
**Fix:** Verify user exists and status is "ACTIVE" in database

---

## 🔍 Debugging Tips

### Check Database
```bash
npx prisma studio
```

### View Logs
```bash
# Backend logs show in terminal where `npm run dev` is running
```

### Reset Database (if needed)
```bash
npx prisma migrate reset  # ⚠️ Deletes all data!
npm run seed              # Re-seed
```

---

## ✅ Success Criteria

- [x] Sales reps see only their own call plans
- [x] Admin sees all call plans
- [x] Sales reps can create plans (auto-assigned)
- [x] Sales reps cannot create plans for others
- [x] Sales reps can update their own plans
- [x] Sales reps cannot update others' plans
- [x] Plans can be marked as completed
- [x] Plans can be deleted (with permission check)
- [x] Filtering by date range works
- [x] Filtering by completion status works

---

## 📝 Next Steps

After testing Call Planner:
1. Apply same pattern to **Customer** service (all see all, admin assigns)
2. Build **Leads** service
3. Build **Quotations** service
4. Build **Interactions** service

Each follows the same **Schema → Service → Controller → Routes** pattern!
