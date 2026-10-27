# CRM System Test Data & Endpoints

## Prerequisites
1. Run migration: `npx prisma migrate dev --schema=./prisma/schema.prisma`
2. Ensure backend is running: `npm run dev`
3. Login as admin to get auth token

## Authentication
```bash
# Login as admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'

# Save the token from response for subsequent requests
# Use: -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 1. CUSTOMERS

### Create Customer 1 (Nairobi Generator Co.)
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyName": "Nairobi Generator Co.",
    "countyName": "Nairobi",
    "locationAddress": "Industrial Area, Nairobi",
    "shortHistory": "Leading generator distributor in Nairobi region",
    "salesRepId": 2
  }'
```

### Create Customer 2 (Mombasa Power Solutions)
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyName": "Mombasa Power Solutions",
    "countyName": "Mombasa",
    "locationAddress": "Port Area, Mombasa",
    "shortHistory": "Coastal region power equipment supplier"
  }'
```

### Create Customer 3 (Kisumu Industrial Supplies)
```bash
curl -X POST http://localhost:3000/api/customers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "companyName": "Kisumu Industrial Supplies",
    "countyName": "Kisumu",
    "locationAddress": "Kisumu CBD",
    "shortHistory": "Western Kenya industrial equipment provider"
  }'
```

### List All Customers
```bash
curl -X GET "http://localhost:3000/api/customers?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```
{
  "email" : "john@example.com",
  "password":"Sales#123"
}
### Get Customer by ID
```bash
curl -X GET http://localhost:3000/api/customers/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Customer
```bash
curl -X PATCH http://localhost:3000/api/customers/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "shortHistory": "Updated: Leading generator distributor with 10+ years experience"
  }'
```

### Assign Customer to Sales Rep (Admin only)
```bash
curl -X PATCH http://localhost:3000/api/customers/1/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "salesRepId": 2
  }'
```

---

## 2. LEADS

### Create Lead 1 (DRAFT status)
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "generatorRecommended": "Caterpillar 500kVA",
    "status": "DRAFT"
  }'
```

### Create Lead 2 (OPEN status)
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 2,
    "generatorRecommended": "Perkins 250kVA",
    "status": "OPEN"
  }'
```

### Create Lead 3 (For testing status changes)
```bash
curl -X POST http://localhost:3000/api/leads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 3,
    "generatorRecommended": "Cummins 750kVA",
    "status": "DRAFT"
  }'
```

### List All Leads
```bash
curl -X GET "http://localhost:3000/api/leads?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter Leads by Status
```bash
curl -X GET "http://localhost:3000/api/leads?status=DRAFT" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Lead Status (DRAFT → OPEN)
```bash
curl -X PATCH http://localhost:3000/api/leads/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "OPEN"
  }'
```

### Update Lead Status (OPEN → WON) - Check audit log
```bash
curl -X PATCH http://localhost:3000/api/leads/3 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "WON"
  }'
```

---

## 3. QUOTATIONS

### Create Quotation 1 (DRAFT, linked to Lead 1)
```bash
curl -X POST http://localhost:3000/api/quotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "leadId": 1,
    "totalPrice": 5500000,
    "discount": 5,
    "notes": "Includes installation and 1-year warranty",
    "status": "DRAFT"
  }'
```

### Create Quotation 2 (SENT, linked to Lead 2)
```bash
curl -X POST http://localhost:3000/api/quotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 2,
    "leadId": 2,
    "totalPrice": 3200000,
    "discount": 3,
    "notes": "Standard package with 6-month warranty",
    "status": "SENT"
  }'
```

### Create Quotation 3 (No lead link)
```bash
curl -X POST http://localhost:3000/api/quotations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 3,
    "totalPrice": 8500000,
    "discount": 10,
    "notes": "Premium package with 2-year warranty and maintenance",
    "status": "DRAFT"
  }'
```

### List All Quotations
```bash
curl -X GET "http://localhost:3000/api/quotations?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter Quotations by Status
```bash
curl -X GET "http://localhost:3000/api/quotations?status=DRAFT" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Quotation Status (DRAFT → SENT)
```bash
curl -X PATCH http://localhost:3000/api/quotations/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "status": "SENT"
  }'
```

### Create New Version of Quotation (supersedes old)
```bash
curl -X POST http://localhost:3000/api/quotations/1/version \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "totalPrice": 5200000,
    "discount": 8,
    "notes": "Revised pricing with extended warranty"
  }'
```

### Get Version History
```bash
# Replace Q2026-0001 with actual quote number from response
curl -X GET http://localhost:3000/api/quotations/history/Q2026-0001 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3.5. CUSTOMER CONTACTS

### Create Contact 1 for Customer 1 (Primary Contact)
```bash
curl -X POST http://localhost:3000/api/customer-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "firstName": "John",
    "lastName": "Manager",
    "email": "john.manager@acme.com",
    "phone": "+254700000001",
    "title": "Operations Manager",
    "isPrimary": true
  }'
```

### Create Contact 2 for Customer 1 (Secondary Contact)
```bash
curl -X POST http://localhost:3000/api/customer-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "firstName": "Jane",
    "lastName": "Smith",
    "email": "jane.smith@acme.com",
    "phone": "+254700000002",
    "title": "Procurement Officer",
    "isPrimary": false
  }'
```

### Create Contact 3 for Customer 2
```bash
curl -X POST http://localhost:3000/api/customer-contacts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 2,
    "firstName": "Michael",
    "lastName": "Director",
    "email": "michael@techsolutions.com",
    "phone": "+254700000003",
    "title": "Technical Director",
    "isPrimary": true
  }'
```

### List Contacts for Customer 1
```bash
curl -X GET "http://localhost:3000/api/customer-contacts?customerId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Contact
```bash
curl -X PATCH http://localhost:3000/api/customer-contacts/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Senior Operations Manager",
    "phone": "+254700000010"
  }'
```

---

## 4. INTERACTIONS

### Create Interaction 1 (With Existing Contact)
```bash
# Use contactId from previously created contact
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "contactId": 1,
    "leadId": 1,
    "quotationId": 6,
    "type": "MEETING",
    "notes": "Initial meeting to discuss generator requirements. Customer interested in Caterpillar 500kVA. Discussed pricing and delivery timeline.",
    "interactionDate": "2026-01-06T10:00:00Z"
  }'
```

### Create Interaction 2 (With Inline Contact Creation)
```bash
# Creates a new contact during interaction creation
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "contact": {
      "firstName": "Sarah",
      "lastName": "Williams",
      "email": "sarah.williams@acme.com",
      "phone": "+254700000004",
      "title": "Finance Manager",
      "isPrimary": false
    },
    "leadId": 1,
    "quotationId": 6,
    "type": "CALL",
    "notes": "Discussed payment terms and financing options with Finance Manager.",
    "interactionDate": "2026-01-07T09:00:00Z"
  }'
```

### Create Interaction 3 (Site Visit with New Contact)
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 2,
    "contact": {
      "firstName": "David",
      "lastName": "Engineer",
      "email": "david@techsolutions.com",
      "phone": "+254700000005",
      "title": "Chief Engineer",
      "isPrimary": false
    },
    "leadId": 2,
    "type": "SITE_VISIT",
    "notes": "Conducted site survey with Chief Engineer. Measured installation space and assessed power requirements.",
    "interactionDate": "2026-01-07T14:00:00Z"
  }'
```

### Create Interaction 4 (Follow-up with Existing Contact)
```bash
# Reuse contact from Interaction 1
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "contactId": 1,
    "leadId": 1,
    "quotationId": 6,
    "type": "FOLLOW_UP",
    "notes": "Follow-up call with John Manager. Confirmed interest and scheduled technical presentation.",
    "interactionDate": "2026-01-08T11:00:00Z"
  }'
```

### Create Interaction 5 (Email without Contact)
```bash
# Optional: interaction without specific contact person
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 3,
    "leadId": 3,
    "type": "EMAIL",
    "notes": "Sent general inquiry email to info@customer.com. Awaiting response.",
    "interactionDate": "2026-01-08T15:00:00Z"
  }'
```

### Create Interaction 2 (Linked to Lead only)
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 2,
    "leadId": 2,
    "notes": "Follow-up call. Customer requested site visit for power assessment. Scheduled for next week.",
    "interactionDate": "2026-01-05T14:30:00Z"
  }'
```

### Create Interaction 3 (General customer interaction)
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 3,
    "notes": "Customer called about spare parts availability. Provided catalog and pricing information.",
    "interactionDate": "2026-01-04T11:15:00Z"
  }'
```

### Create Interaction 4 (Linked to Quotation)
```bash
curl -X POST http://localhost:3000/api/interactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "quotationId": 1,
    "notes": "Sent quotation Q2026-0001 via email. Customer acknowledged receipt and will review with management.",
    "interactionDate": "2026-01-06T15:00:00Z"
  }'
```

### List All Interactions
```bash
curl -X GET "http://localhost:3000/api/interactions?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter Interactions by Lead
```bash
curl -X GET "http://localhost:3000/api/interactions?leadId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Filter Interactions by Quotation
```bash
curl -X GET "http://localhost:3000/api/interactions?quotationId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Interactions by Customer
```bash
curl -X GET http://localhost:3000/api/interactions/customer/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Interaction
```bash
curl -X PATCH http://localhost:3000/api/interactions/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "notes": "Updated: Initial meeting to discuss generator requirements. Customer very interested in Caterpillar 500kVA. Discussed pricing, delivery timeline, and payment terms. Next step: site visit."
  }'
```

---

## 5. CALL PLANS (Already implemented)

### Create Call Plan
```bash
curl -X POST http://localhost:3000/api/call-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "customerId": 1,
    "weekBeginning": "2026-01-06T00:00:00Z",
    "dayOfWeek": "Monday",
    "plannedDate": "2026-01-06T09:00:00Z",
    "purpose": "Selling",
    "locationType": "Customer_Office",
    "exactLocation": "Industrial Area Office",
    "productLine": "Generator"
  }'
```

---

## 6. VERIFY AUDIT LOGS

### Check Audit Logs (if you have admin endpoint)
```sql
-- Run in PostgreSQL
SELECT 
  al.id,
  al.action,
  al.description,
  al.created_at,
  u.first_name || ' ' || u.last_name as user_name,
  c.name as company_name
FROM auth.audit_logs al
LEFT JOIN auth.users u ON al.user_id = u.id
LEFT JOIN auth.companies c ON al.company_id = c.id
ORDER BY al.created_at DESC
LIMIT 50;
```

### Expected Audit Log Actions
You should see these actions in order:
1. `CUSTOMER_CREATED` (3 times)
2. `CUSTOMER_UPDATED` (1 time)
3. `CUSTOMER_ASSIGNED` (1 time)
4. `LEAD_CREATED` (3 times)
5. `LEAD_STATUS_CHANGED` (2 times - DRAFT→OPEN, OPEN→WON)
6. `QUOTATION_CREATED` (3 times)
7. `QUOTATION_STATUS_CHANGED` (1 time - DRAFT→SENT)
8. `QUOTATION_VERSION_CREATED` (1 time)
9. `INTERACTION_CREATED` (4 times)
10. `INTERACTION_UPDATED` (1 time)

---

## 7. TEST RELATIONSHIPS

### Get Lead with Quotations
```bash
curl -X GET http://localhost:3000/api/leads/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should show related quotations
```

### Get Quotation with Lead Info
```bash
curl -X GET http://localhost:3000/api/quotations/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should show leadId and lead details
```

### Get Interactions for a Lead
```bash
curl -X GET "http://localhost:3000/api/interactions?leadId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should show all interactions related to lead 1
```

### Get Interactions for a Quotation
```bash
curl -X GET "http://localhost:3000/api/interactions?quotationId=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should show all interactions related to quotation 1
```

---

## 8. DELETE OPERATIONS (Test Audit Logs)

### Delete Interaction
```bash
curl -X DELETE http://localhost:3000/api/interactions/3 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Check audit log for INTERACTION_DELETED
```

### Delete Draft Quotation
```bash
curl -X DELETE http://localhost:3000/api/quotations/3 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Check audit log for QUOTATION_DELETED
```

### Delete Lead
```bash
curl -X DELETE http://localhost:3000/api/leads/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
# Check audit log for LEAD_DELETED
```

---

## Testing Checklist

- [ ] All customers created successfully
- [ ] Customer assignment works (admin only)
- [ ] Leads created with DRAFT status by default
- [ ] Lead status changes tracked in audit log
- [ ] Quotations linked to leads via leadId
- [ ] Quotation versioning creates new version and supersedes old
- [ ] Interactions linked to both leads and quotations
- [ ] Filtering interactions by leadId and quotationId works
- [ ] All CRUD operations create audit log entries
- [ ] Status changes create specific audit log entries
- [ ] Audit logs capture user, company, IP, and user agent
- [ ] Role-based access control works (sales reps see only their data)

---

## Quick Test Script (Bash)

Save as `test_crm.sh`:
```bash
#!/bin/bash

# Set your token here
TOKEN="YOUR_AUTH_TOKEN"
BASE_URL="http://localhost:3000/api"

echo "Creating customers..."
curl -s -X POST $BASE_URL/customers -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"companyName":"Nairobi Generator Co.","countyName":"Nairobi","locationAddress":"Industrial Area","shortHistory":"Leading distributor"}' | jq

echo "\nCreating leads..."
curl -s -X POST $BASE_URL/leads -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"customerId":1,"generatorRecommended":"Caterpillar 500kVA","status":"DRAFT"}' | jq

echo "\nCreating quotation..."
curl -s -X POST $BASE_URL/quotations -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"customerId":1,"leadId":1,"totalPrice":5500000,"discount":5,"status":"DRAFT"}' | jq

echo "\nCreating interaction..."
curl -s -X POST $BASE_URL/interactions -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"customerId":1,"leadId":1,"quotationId":1,"notes":"Initial meeting successful"}' | jq

echo "\nTest complete! Check audit logs in database."
```

Run with: `chmod +x test_crm.sh && ./test_crm.sh`
