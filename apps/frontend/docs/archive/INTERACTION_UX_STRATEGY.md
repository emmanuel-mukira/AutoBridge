# Interaction UX Strategy - Handling Null Relationships

## Problem Statement
When creating interactions, sales reps may not have:
- Created a lead yet
- Created a quotation yet  
- Created a customer contact yet

**Question**: How should the frontend handle assigning these relationships after the fact?

---

## Recommended UX Strategy

### **Option 1: Smart Form with Inline Creation (RECOMMENDED)**

This provides the best UX by allowing sales reps to create everything in one flow.

#### **Interaction Form Flow**

```
┌─────────────────────────────────────┐
│  Create Interaction                 │
├─────────────────────────────────────┤
│                                     │
│  Customer: [Dropdown - Required]    │
│                                     │
│  Contact Person:                    │
│  ┌─────────────────────────────┐   │
│  │ ○ John Manager (Ops)        │   │
│  │ ○ Jane Smith (Procurement)  │   │
│  │ ─────────────────────────── │   │
│  │ + Add New Contact           │   │
│  └─────────────────────────────┘   │
│                                     │
│  Lead: [Optional]                   │
│  ┌─────────────────────────────┐   │
│  │ ○ Generator 500kVA (OPEN)   │   │
│  │ ○ Backup Power (DRAFT)      │   │
│  │ ─────────────────────────── │   │
│  │ + Create New Lead           │   │
│  │ ○ No Lead (General)         │   │
│  └─────────────────────────────┘   │
│                                     │
│  Quotation: [Optional]              │
│  ┌─────────────────────────────┐   │
│  │ ○ Q2026-0001 v2 (SENT)      │   │
│  │ ○ Q2026-0003 v1 (DRAFT)     │   │
│  │ ─────────────────────────── │   │
│  │ ○ No Quotation Yet          │   │
│  └─────────────────────────────┘   │
│                                     │
│  Type: [MEETING ▼]                  │
│  Date: [2026-01-07 10:00]           │
│  Notes: [Text area...]              │
│                                     │
│  [Cancel]  [Save Interaction]       │
└─────────────────────────────────────┘
```

#### **Implementation Details**

**1. Contact Person Dropdown**
```typescript
function ContactSelector({ customerId, value, onChange }) {
  const { data: contacts } = useContacts(customerId);
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <Select value={value} onChange={onChange}>
        {contacts?.map(c => (
          <option key={c.id} value={c.id}>
            {c.firstName} {c.lastName} ({c.title})
          </option>
        ))}
        <option value="new">+ Add New Contact</option>
      </Select>
      
      {showModal && (
        <ContactModal
          customerId={customerId}
          onSave={(contact) => {
            // Contact created inline during interaction
            onChange(null, contact);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
```

**2. Lead Selector**
```typescript
function LeadSelector({ customerId, value, onChange }) {
  const { data: leads } = useLeads({ customerId, status: ["DRAFT", "OPEN"] });
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <RadioGroup value={value} onChange={onChange}>
        {leads?.map(l => (
          <Radio key={l.id} value={l.id}>
            {l.generatorRecommended} ({l.status})
          </Radio>
        ))}
        <Divider />
        <Radio value="new" onClick={() => setShowModal(true)}>
          + Create New Lead
        </Radio>
        <Radio value={null}>
          No Lead (General Interaction)
        </Radio>
      </RadioGroup>
      
      {showModal && (
        <LeadModal
          customerId={customerId}
          onSave={(leadId) => {
            onChange(leadId);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}
```

**3. Quotation Selector**
```typescript
function QuotationSelector({ customerId, leadId, value, onChange }) {
  const { data: quotations } = useQuotations({ 
    customerId, 
    leadId, // Filter by lead if selected
    status: ["DRAFT", "SENT"] 
  });
  
  return (
    <RadioGroup value={value} onChange={onChange}>
      {quotations?.map(q => (
        <Radio key={q.id} value={q.id}>
          {q.quoteNumber} v{q.version} ({q.status}) - KES {q.totalPrice}
        </Radio>
      ))}
      <Divider />
      <Radio value={null}>
        No Quotation Yet
      </Radio>
    </RadioGroup>
  );
}
```

---

### **Option 2: Post-Creation Assignment (Alternative)**

If interaction is created with null relationships, provide easy way to assign later.

#### **Interaction Detail View with Assignment**

```
┌─────────────────────────────────────┐
│  Interaction #4                     │
│  Meeting on Jan 7, 2026 10:00 AM    │
├─────────────────────────────────────┤
│                                     │
│  Customer: Acme Corporation         │
│                                     │
│  Contact: [Not Assigned]            │
│  [Assign Contact ▼]                 │
│                                     │
│  Lead: [Not Assigned]               │
│  [Assign to Lead ▼]                 │
│                                     │
│  Quotation: [Not Assigned]          │
│  [Link Quotation ▼]                 │
│                                     │
│  Notes: Initial meeting...          │
│                                     │
│  [Edit] [Delete]                    │
└─────────────────────────────────────┘
```

#### **Implementation**
```typescript
function InteractionAssignment({ interaction, onUpdate }) {
  const assignContact = async (contactId) => {
    await api.patch(`/api/interactions/${interaction.id}`, { contactId });
    onUpdate();
  };
  
  const assignLead = async (leadId) => {
    await api.patch(`/api/interactions/${interaction.id}`, { leadId });
    onUpdate();
  };
  
  return (
    <div>
      {!interaction.contactId && (
        <ContactDropdown
          customerId={interaction.customerId}
          onSelect={assignContact}
          placeholder="Assign Contact"
        />
      )}
      
      {!interaction.leadId && (
        <LeadDropdown
          customerId={interaction.customerId}
          onSelect={assignLead}
          placeholder="Assign to Lead"
        />
      )}
    </div>
  );
}
```

---

## Comparison: Option 1 vs Option 2

| Aspect | Option 1 (Inline) | Option 2 (Post-Assignment) |
|--------|-------------------|----------------------------|
| **UX** | ✅ Better - One flow | ⚠️ Requires extra step |
| **Speed** | ✅ Faster | ❌ Slower (2 steps) |
| **Data Quality** | ✅ Complete from start | ⚠️ May stay incomplete |
| **Complexity** | ⚠️ More complex form | ✅ Simpler form |
| **Flexibility** | ✅ Can skip if needed | ✅ Can assign later |

**Recommendation**: **Option 1** with ability to skip (Option 2 as fallback)

---

## Best Practice: Hybrid Approach

### **Create Interaction Form**
- Contact: **Required** (inline creation available)
- Lead: **Optional** (inline creation available)
- Quotation: **Optional** (no inline creation - too complex)

### **Why This Works**

**1. Contact is Required**
- Every interaction should have a contact person
- Easy to create inline (just name, title, email)
- Improves data quality

**2. Lead is Optional but Encouraged**
- Can create inline if needed
- Can select "No Lead" for general interactions
- Can assign later if forgotten

**3. Quotation is Optional**
- Usually created separately (complex process)
- Can link after quotation is created
- Not needed for early-stage interactions

---

## Implementation Checklist

### **Frontend Components**

- [ ] `ContactSelector` - Dropdown with inline creation
- [ ] `LeadSelector` - Radio group with inline creation
- [ ] `QuotationSelector` - Radio group (no inline creation)
- [ ] `ContactModal` - Quick contact creation form
- [ ] `LeadModal` - Quick lead creation form
- [ ] `InteractionForm` - Main form with all selectors
- [ ] `InteractionDetail` - View with assignment dropdowns

### **API Endpoints (Already Exist)**

- [x] `GET /api/customer-contacts?customerId=X` - Fetch contacts
- [x] `GET /api/leads?customerId=X&status=OPEN` - Fetch leads
- [x] `GET /api/quotations?customerId=X&leadId=Y` - Fetch quotations
- [x] `POST /api/interactions` - Create with inline contact
- [x] `PATCH /api/interactions/:id` - Update relationships

### **State Management**

```typescript
// Zustand store
interface InteractionFormStore {
  customerId: number | null;
  contactId: number | null;
  contactData: ContactData | null; // For inline creation
  leadId: number | null;
  quotationId: number | null;
  type: InteractionType;
  notes: string;
  interactionDate: Date;
  
  setCustomer: (id: number) => void;
  setContact: (id: number | null, data?: ContactData) => void;
  setLead: (id: number | null) => void;
  setQuotation: (id: number | null) => void;
  reset: () => void;
}
```

---

## User Flows

### **Flow 1: New Customer, First Interaction**

1. Sales rep creates customer
2. Opens "Create Interaction" form
3. Customer auto-selected (from previous page)
4. Contact dropdown is empty → Shows "+ Add New Contact"
5. Clicks "+ Add New Contact" → Modal opens
6. Fills: John Manager, Operations Manager, john@acme.com
7. Modal closes, contact selected
8. Lead dropdown is empty → Selects "+ Create New Lead"
9. Quick lead form: Caterpillar 500kVA, Status: OPEN
10. Lead created and selected
11. Quotation: Selects "No Quotation Yet"
12. Fills notes, saves interaction
13. **Result**: Customer, Contact, Lead, and Interaction all created in one flow

### **Flow 2: Existing Customer, Follow-up**

1. Sales rep opens customer detail page
2. Clicks "Log Interaction"
3. Customer pre-selected
4. Contact dropdown shows existing contacts
5. Selects "John Manager"
6. Lead dropdown shows existing leads
7. Selects "Caterpillar 500kVA (OPEN)"
8. Quotation dropdown shows quotations for that lead
9. Selects "Q2026-0001 v2 (SENT)"
10. Fills notes, saves
11. **Result**: Interaction linked to existing entities

### **Flow 3: Quick Note (No Lead/Quotation)**

1. Sales rep needs to log a quick call
2. Opens "Create Interaction" form
3. Selects customer
4. Selects existing contact
5. Lead: Selects "No Lead (General)"
6. Quotation: Skips (already null)
7. Type: CALL
8. Notes: "Left voicemail about maintenance"
9. Saves
10. **Result**: Interaction with customer + contact only

---

## Mobile Considerations

### **Simplified Mobile Flow**

On mobile, use step-by-step wizard:

```
Step 1: Select Customer
Step 2: Select/Create Contact
Step 3: Select/Create Lead (Optional)
Step 4: Select Quotation (Optional)
Step 5: Add Details (Type, Notes, Date)
Step 6: Review & Save
```

### **Quick Action Button**

```
[+] Quick Interaction
  → Opens minimal form
  → Customer + Contact + Notes only
  → Can add lead/quotation later
```

---

## Summary

**Recommended Approach**: **Hybrid with Inline Creation**

✅ **Contact**: Required, inline creation available
✅ **Lead**: Optional, inline creation available  
✅ **Quotation**: Optional, link existing only
✅ **Post-assignment**: Available as fallback

**Benefits**:
- Fast data entry
- High data quality
- Flexible workflow
- Works for all scenarios
- Mobile-friendly

**Implementation Priority**:
1. Contact selector with inline creation (HIGH)
2. Lead selector with inline creation (MEDIUM)
3. Quotation selector (MEDIUM)
4. Post-assignment dropdowns (LOW - fallback)
