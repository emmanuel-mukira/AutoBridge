# CRM Business Logic & Workflow

## Overview
This document clarifies the business logic and relationships between CRM entities.

---

## 1. CUSTOMER → LEAD → QUOTATION → INTERACTION FLOW

### **The Real-World Sales Funnel**

```
┌─────────────────────────────────────────────────────────────┐
│                        CUSTOMER                             │
│                    (Company/Organization)                   │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ General Interactions │  │   Lead Created       │
    │   (No Lead Yet)      │  │ (Specific Opportunity)│
    └──────────────────────┘  └──────────────────────┘
            │                           │
            │                           ▼
            │                  ┌──────────────────────┐
            │                  │ Lead-Specific        │
            │                  │ Interactions         │
            │                  └──────────────────────┘
            │                           │
            │                           ▼
            │                  ┌──────────────────────┐
            │                  │   Quotation          │
            │                  │   Created            │
            │                  └──────────────────────┘
            │                           │
            │                           ▼
            │                  ┌──────────────────────┐
            │                  │ Quotation-Specific   │
            │                  │ Interactions         │
            │                  └──────────────────────┘
            │                           │
            └───────────────────────────┘
                            │
                            ▼
                  ┌──────────────────────┐
                  │   Lead Status:       │
                  │   WON / LOST         │
                  └──────────────────────┘
```

---

## 2. ENTITY RELATIONSHIPS EXPLAINED

### **Customer (Required for Everything)**
- **What**: Company or organization
- **Created When**: First contact with potential client
- **Examples**: "Acme Corporation", "Safaricom Ltd", "Kenya Power"
- **Relationship**: One customer can have:
  - Multiple leads (different opportunities)
  - Multiple contacts (different people)
  - Multiple interactions (both general and lead-specific)

### **Customer Contact (Required for Interactions)**
- **What**: Individual person at the customer company
- **Created When**: You identify who you're talking to
- **Examples**: "John Manager (Operations)", "Jane Smith (Finance)"
- **Relationship**: 
  - Belongs to one customer
  - Can be involved in multiple interactions
  - Can be primary contact (one per customer)

### **Lead (Optional - Created When Opportunity Identified)**
- **What**: Specific sales opportunity or project
- **Created When**: 
  - Customer expresses concrete need
  - Sales rep identifies potential sale
  - Specific requirement is defined
- **Examples**: 
  - "Factory Backup Power - 500kVA Generator"
  - "Office UPS System"
  - "Annual Maintenance Contract"
- **Relationship**:
  - Belongs to one customer
  - Can have multiple quotations (different versions/options)
  - Can have multiple interactions (meetings, site visits, follow-ups)
  - Has status: DRAFT → OPEN → WON/LOST

### **Interaction (Always Linked to Customer + Contact)**
- **What**: Any communication or meeting with customer
- **Created When**: Every time you interact with customer
- **Types**: CALL, EMAIL, MEETING, SITE_VISIT, FOLLOW_UP
- **Can Be**:
  - **General** (No Lead): Relationship building, courtesy calls, networking
  - **Lead-Specific**: Discussions about specific opportunity
  - **Quotation-Specific**: Follow-ups on sent quotations
- **Relationship**:
  - Always has customer (required)
  - Always has contact (required)
  - Optionally linked to lead
  - Optionally linked to quotation

### **Quotation (Always Linked to Lead)**
- **What**: Formal price proposal for specific opportunity
- **Created When**: Customer requests pricing for identified need
- **Relationship**:
  - Always linked to lead (required)
  - Always linked to customer (via lead)
  - Can have multiple versions (v1, v2, v3)
  - Can have interactions (follow-ups, negotiations)

---

## 3. WHEN INTERACTIONS ARE NOT LINKED TO LEADS

### **Scenario 1: Relationship Building Phase**
```
Sales Rep Activity: "Cold call to introduce company"
→ Customer: Acme Corp
→ Contact: John Manager
→ Lead: NULL
→ Type: CALL
→ Notes: "Introduced our generator solutions, no immediate need"
```

### **Scenario 2: Discovery Phase**
```
Sales Rep Activity: "Networking event, met potential client"
→ Customer: New Corp (just created)
→ Contact: Jane Director (just created)
→ Lead: NULL
→ Type: MEETING
→ Notes: "Met at trade show, discussed business, will follow up"
```

### **Scenario 3: Post-Sale Customer Service**
```
Sales Rep Activity: "Check-in call with existing customer"
→ Customer: Acme Corp
→ Contact: John Manager
→ Lead: NULL (previous lead is WON/LOST)
→ Type: CALL
→ Notes: "Checked on generator performance, all good, no new needs"
```

### **Scenario 4: Multi-Lead Customer**
```
Customer: Acme Corp
→ Lead 1: "Factory Backup" (WON)
→ Lead 2: "Office UPS" (OPEN)
→ Lead 3: "Maintenance Contract" (DRAFT)

Sales Rep Activity: "Monthly relationship call"
→ Lead: NULL (general check-in, not about specific lead)
→ Notes: "Discussed overall satisfaction, no specific project discussed"
```

### **Scenario 5: Lead Discovery During Interaction**
```
Step 1: General interaction
→ Interaction: "Courtesy visit"
→ Lead: NULL
→ Notes: "Visited customer, they mentioned planning expansion"

Step 2: Create lead after discovering opportunity
→ Lead: "Factory Expansion - 500kVA" (created after interaction)

Step 3: Lead-specific interactions
→ Interaction: "Site visit for expansion project"
→ Lead: Factory Expansion
→ Notes: "Measured electrical requirements"
```

---

## 4. TYPICAL SALES WORKFLOW

### **Phase 1: Prospecting (No Lead Yet)**
```
1. Identify potential customer
2. Create Customer record
3. Research and find contacts
4. Create Contact records
5. Make initial contact
6. Log Interaction (Lead: NULL)
   → Type: CALL/EMAIL
   → Notes: "Initial outreach, introduced company"
```

### **Phase 2: Discovery (Lead Emerges)**
```
7. Customer expresses interest/need
8. Create Lead record
   → Status: DRAFT (qualifying opportunity)
9. Schedule needs assessment
10. Log Interaction (Lead: Specific Lead)
    → Type: MEETING
    → Notes: "Discussed requirements, need 500kVA generator"
```

### **Phase 3: Qualification (Lead Active)**
```
11. Update Lead status to OPEN
12. Conduct site visit
13. Log Interaction (Lead: Specific Lead)
    → Type: SITE_VISIT
    → Notes: "Measured site, confirmed requirements"
14. Prepare quotation
```

### **Phase 4: Proposal (Quotation Created)**
```
15. Create Quotation (linked to Lead)
    → Version 1, Status: DRAFT
16. Review quotation internally
17. Send quotation to customer
18. Update Quotation status to SENT
19. Log Interaction (Lead + Quotation)
    → Type: EMAIL
    → Notes: "Sent quotation Q2026-0001 v1"
```

### **Phase 5: Negotiation (Follow-ups)**
```
20. Customer requests changes
21. Create Quotation v2 (revised pricing)
22. Log Interaction (Lead + Quotation v2)
    → Type: MEETING
    → Notes: "Discussed revised pricing, customer considering"
23. Follow-up calls
24. Log Interactions (Lead + Quotation)
    → Type: FOLLOW_UP
```

### **Phase 6: Closing**
```
25. Customer accepts quotation
26. Update Lead status to WON
27. Log Interaction (Lead + Quotation)
    → Type: MEETING
    → Notes: "Customer signed contract, deal closed"
```

### **Phase 7: Post-Sale (No Active Lead)**
```
28. Delivery and installation (separate process)
29. Periodic check-ins
30. Log Interactions (Lead: NULL)
    → Type: CALL
    → Notes: "Customer satisfaction check, no new needs"
```

---

## 5. DUPLICATE VALIDATION RULES (REVISED)

### **Customer Duplicates**
**Rule**: No duplicate company names per company (case-insensitive)
**Reason**: Prevents accidental duplicate customer records
**Impact**: ✅ No business process impact
**Example**: "Acme Corp" = "ACME CORP" = blocked

### **Contact Duplicates**
**Rule**: No duplicate email/phone per customer
**Reason**: Same person shouldn't have multiple contact records
**Impact**: ✅ No business process impact
**Example**: john@acme.com already exists for Acme Corp = blocked

### **Lead Duplicates (RELAXED)**
**Rule**: No duplicate generator recommendations within 24 hours
**Reason**: Prevents accidental double-clicks, allows legitimate multiple leads
**Impact**: ✅ Minimal - allows multiple locations, reconsidered opportunities
**Example**: 
- ✅ "Cat 500kVA" created today + "Cat 500kVA" created tomorrow = allowed
- ❌ "Cat 500kVA" created 10:00 AM + "Cat 500kVA" created 10:05 AM = blocked

**Why 24 Hours?**
- Prevents accidental duplicates (double-click, browser refresh)
- Allows multiple locations (created on different days)
- Allows reconsidered opportunities (customer comes back later)
- Allows different projects with same equipment

### **Interaction Duplicates (RELAXED)**
**Rule**: No identical interactions (same type + customer + contact) within 1 minute
**Reason**: Prevents accidental double-clicks only
**Impact**: ✅ Minimal - allows quick follow-ups, multiple contacts
**Example**:
- ✅ CALL at 10:00 AM + CALL at 10:02 AM = allowed (different conversations)
- ✅ CALL with John at 10:00 AM + CALL with Jane at 10:00 AM = allowed (different contacts)
- ❌ CALL with John at 10:00:00 AM + CALL with John at 10:00:30 AM = blocked (likely duplicate)

**Why 1 Minute + Type?**
- Prevents accidental double-clicks (form submission errors)
- Allows quick follow-ups (customer called back)
- Allows multiple interactions in same meeting (different types or contacts)
- Allows rapid-fire interactions (different types: CALL → EMAIL → FOLLOW_UP)

### **Quotation Duplicates**
**Rule**: Database unique constraint on (quoteNumber, version)
**Reason**: Prevents duplicate quote numbers
**Impact**: ✅ No business process impact
**Example**: Q2026-0001 v1 can only exist once

---

## 6. DATA INTEGRITY RULES

### **Required Fields**
- **Customer**: companyName, countyName, locationAddress
- **Contact**: firstName, lastName, customerId
- **Lead**: customerId, generatorRecommended
- **Interaction**: customerId, contactId, salesRepId, type, notes
- **Quotation**: leadId, quoteNumber, version

### **Optional Fields**
- **Contact**: email, phone, title (but at least one contact method recommended)
- **Interaction**: leadId, quotationId (can be NULL for general interactions)
- **Lead**: salesRepId (defaults to customer's sales rep)

### **Cascading Rules**
- **Delete Customer**: Should soft-delete (set deletedAt)
- **Delete Lead**: Should check for quotations first
- **Delete Contact**: Should check if used in interactions
- **Delete Interaction**: Safe to hard delete (audit logged)
- **Delete Quotation**: Should check if referenced in interactions

---

## 7. STATUS TRANSITIONS

### **Lead Status Flow**
```
DRAFT → OPEN → WON
  ↓       ↓      
 LOST ← LOST    
```

**Rules**:
- DRAFT: Initial qualification, not yet pursuing
- OPEN: Actively pursuing opportunity
- WON: Deal closed successfully
- LOST: Opportunity lost (can specify reason)
- Cannot reopen WON/LOST leads (create new lead instead)

### **Quotation Status Flow**
```
DRAFT → SENT → ACCEPTED
  ↓       ↓        
EXPIRED ← REJECTED
```

**Rules**:
- DRAFT: Internal review, not sent to customer
- SENT: Delivered to customer, awaiting response
- ACCEPTED: Customer accepted, proceed to contract
- REJECTED: Customer declined
- EXPIRED: Customer didn't respond in time

---

## 8. BEST PRACTICES

### **For Sales Reps**
1. **Always create customer first** before any other records
2. **Create contacts immediately** when you identify who you're talking to
3. **Log every interaction** (even quick calls) for complete history
4. **Create lead only when opportunity is identified** (not for every customer)
5. **Link interactions to leads** when discussing specific opportunities
6. **Update lead status regularly** to reflect current state
7. **Use interaction types correctly** (CALL vs MEETING vs SITE_VISIT)

### **For Admins**
1. **Review duplicate validation errors** - may indicate data quality issues
2. **Monitor orphaned records** (interactions without leads when they should have them)
3. **Check lead conversion rates** (DRAFT → OPEN → WON)
4. **Audit interaction frequency** per customer (relationship health)
5. **Review quotation acceptance rates** (pricing effectiveness)

---

## 9. COMMON MISTAKES TO AVOID

### **Mistake 1: Creating Lead Too Early**
❌ Wrong: Create lead immediately when creating customer
✅ Right: Create lead only when specific opportunity is identified

### **Mistake 2: Not Logging General Interactions**
❌ Wrong: Only log interactions when discussing specific lead
✅ Right: Log all interactions (calls, emails, meetings) even if no lead

### **Mistake 3: Linking Every Interaction to Lead**
❌ Wrong: Force every interaction to have a lead
✅ Right: Only link interactions that discuss specific opportunity

### **Mistake 4: Creating Multiple Leads for Same Opportunity**
❌ Wrong: Create new lead every time customer mentions same need
✅ Right: Update existing lead status and log new interactions

### **Mistake 5: Not Creating Contacts**
❌ Wrong: Log interactions without specifying who you spoke to
✅ Right: Always create contact record first, then log interaction

---

## 10. REPORTING & ANALYTICS

### **Key Metrics**
- **Customer Acquisition**: New customers per month
- **Lead Conversion Rate**: OPEN → WON percentage
- **Interaction Frequency**: Average interactions per customer
- **Quotation Acceptance Rate**: SENT → ACCEPTED percentage
- **Sales Cycle Length**: Days from lead creation to WON
- **Contact Coverage**: Customers with multiple contacts (better relationships)

### **Red Flags**
- Customers with no interactions in 90+ days (relationship at risk)
- Leads stuck in DRAFT for 30+ days (not being pursued)
- Quotations stuck in SENT for 14+ days (need follow-up)
- Interactions without contacts (data quality issue)
- Multiple leads with same generator for same customer (possible duplicate)

---

## Summary

**Key Takeaways**:
1. ✅ Interactions can exist without leads (relationship building)
2. ✅ Leads are created only when specific opportunity identified
3. ✅ Duplicate validation is relaxed to allow legitimate business scenarios
4. ✅ Every interaction must have customer + contact (required)
5. ✅ Lead/Quotation links are optional based on context
