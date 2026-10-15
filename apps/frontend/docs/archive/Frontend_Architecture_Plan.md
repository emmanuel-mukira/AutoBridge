# Frontend Architecture & Implementation Plan

## 1. Technology Stack & Standards

- **Core Framework:** React 19 (Latest)
- **Build Tool:** Vite
- **Language:** TypeScript 5.8+ (Strict Mode)
- **State Management:**
  - **Server State:** TanStack Query v5 (Caching, Polling, Optimistic Updates, Deduping)
  - **Client State:** Zustand (Global UI state, Auth Session)
- **Routing:** React Router v7
- **Styling:** TailwindCSS v4 + `clsx` + `tailwind-merge`
- **UI Components:** Shadcn/UI (Radix Primitives) + Lucide Icons
- **Forms:** React Hook Form + Zod (Schema Validation)
- **Networking:** Axios (with Interceptors & Connection Pooling logic)
- **Feedback:** Sonner (Toasts)

---

## 2. Directory Structure (Feature-Based)

We use a **Feature-First** architecture. Code that belongs together stays together. This improves maintainability and scalability.

```text
src/
├── app/                    # App-wide providers & configuration
│   ├── providers.tsx       # QueryClient, AuthProvider, ThemeProvider
│   ├── router.tsx          # Route definitions (Protected/Guest guards)
│   └── store.ts            # Global Zustand store (useStore)
├── assets/                 # Static assets (images, fonts)
├── components/             # Shared Design System
│   ├── ui/                 # Atomic components (Button, Input, Dialog - Shadcn)
│   ├── layout/             # DashboardLayout, Navbar, Sidebar
│   └── shared/             # Reusable patterns (DataTable, ConfirmDialog, AsyncBoundary)
├── features/               # DOMAIN LOGIC (The Core)
│   ├── auth/               # Login, Signup, Invite, Password Reset
│   │   ├── components/     # LoginForm, SignupForm
│   │   ├── hooks/          # useLogin, useSignup (Mutations)
│   │   └── schemas.ts      # Zod validation schemas
│   ├── admin/              # User Management, Roles, Audit Logs
│   ├── customers/          # Customer CRUD, Detailed Views
│   ├── leads/              # Lead Pipelines, Status Changes
│   ├── quotations/         # Quote Builder, Versioning
│   ├── interactions/       # Call Logs, Meetings
│   └── call-planner/       # Calendar & Task Management
├── hooks/                  # Global Utilities (useDebounce, useOnClickOutside)
├── lib/                    # Core Infrastructure
│   ├── axios.ts            # Network client with retry logic
│   ├── query-client.ts     # TanStack Query configuration
│   └── utils.ts            # Helper functions (cn, formatters)
├── pages/                  # Route Entry Points (Minimal logic, just orchestration)
│   ├── Dashboard.tsx
│   ├── Login.tsx
│   ├── admin/
│   │   ├── UserManagement.tsx
│   │   └── AuditLogs.tsx
│   ├── customers/
│   │   ├── CustomerList.tsx
│   │   └── CustomerDetail.tsx
│   └── ...
└── types/                  # Global Shared Types (DTOs, Enums)
```

---

## 3. State Management Strategy

### **Server State (TanStack Query)**
Used for **ALL** data fetching. No `useEffect` data fetching in components.

**Key Features:**
- **Caching:** Data is cached for 5 minutes by default (`staleTime`).
- **Deduping:** Identical requests are merged into one.
- **Optimistic Updates:** UI updates immediately before server confirms.

```typescript
// ✅ Good: Using Custom Query Hook
export const useCustomers = () => {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data } = await api.get<Customer[]>('/customers');
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
```

### **Client State (Zustand)**
Used for global UI state that persists across pages.

```typescript
// ✅ Good: Zustand Store
interface UIStore {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  user: User | null;
  isAuthenticated: boolean;
}
```

---

## 4. Security & Performance Best Practices

### **1. Connection Pooling & Networking**
We implement "Connection Pooling" via **Axios Interceptors** and **TanStack Query Retries**.
- **Request Deduplication:** TanStack Query automatically deduplicates identical requests.
- **Retry Logic:** Failed requests (5xx, Network Error) retry 3 times with exponential backoff.
- **Token Refresh:** Axios interceptor handles 401s silently, queues pending requests, refreshes token, and replays requests.
- **CSRF Protection:** All mutating requests (POST, PUT, DELETE, PATCH) must include CSRF token.

### **2. React 19 Hooks Usage**
- **`useActionState`**: For handling form submissions and pending states without manual `useState`.
- **`useOptimistic`**: For immediate UI updates before the server responds (e.g., changing Lead Status).
- **`use`**: For reading promises or context (replacing some `useEffect` patterns).

### **3. High Security**
- **HttpOnly Cookies:** Auth tokens are never accessible to JS.
- **Route Guards:** `ProtectedRoute` and `GuestRoute` components prevent unauthorized access.
- **Input Sanitization:** React escapes content by default; Zod validates all inputs.

---

## 5. Route Mapping (Backend -> Frontend)

| Feature | Backend Route | Frontend Page Component | Query Key |
| :--- | :--- | :--- | :--- |
| **Auth** | `/auth/login` | `pages/Login.tsx` | `['auth', 'user']` |
| **Dashboard** | `/stats` (Future) | `pages/Dashboard.tsx` | `['stats']` |
| **Admin Users** | `/users/admin/users` | `pages/admin/UserManagement.tsx` | `['users']` |
| **Audit Logs** | `/audit-logs` | `pages/admin/AuditLogs.tsx` | `['audit-logs']` |
| **Customers** | `/customers` | `pages/customers/CustomerList.tsx` | `['customers']` |
| **Leads** | `/leads` | `pages/leads/LeadList.tsx` | `['leads']` |
| **Quotations** | `/quotations` | `pages/quotations/QuoteList.tsx` | `['quotations']` |
| **Interactions** | `/interactions` | `pages/interactions/InteractionLog.tsx` | `['interactions']` |
| **Call Planner** | `/call-planner` | `pages/CallPlanner.tsx` | `['call-plans']` |

---

## 6. Form Handling & Validation Strategy

We use **React Hook Form** + **Zod**.

### **Pattern:**
1. Define Schema: `const schema = z.object({...})`
2. Define Type: `type FormValues = z.infer<typeof schema>`
3. Use Hook: `const form = useForm<FormValues>({ resolver: zodResolver(schema) })`
4. UI Component: `Form` wrapper from Shadcn.

```tsx
// Example: Safe Form Submission
const onSubmit = (data: FormValues) => {
  mutation.mutate(data, {
    onSuccess: () => {
      toast.success("Record created successfully");
      form.reset();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
};
```

---

## 7. UX Strategy: Hybrid Relationship Creation

### **Problem:**
Creating a new Interaction requires selecting a Customer, Contact, and Lead. If they don't exist, the flow breaks.

### **Solution: "Inline Creation"**
- **Contact Selection:**
  - Dropdown fetches contacts for selected Customer.
  - Includes **"+ Add New Contact"** option.
  - Opens a **Dialog Modal** on top of the form.
  - On save, the new contact is auto-selected in the dropdown.
  
- **Lead Selection:**
  - Radio group for existing leads.
  - **"+ Create New Lead"** button opens a quick-entry drawer.
  - **"No Lead"** option for general interactions.

### **Lazy Loading & Code Splitting**
- All top-level page components in `app/router.tsx` are lazy loaded using `React.lazy` and `Suspense`.
- Large dependencies (like rich text editors or charts) are loaded only when needed.

---

## 8. Implementation Checklist

### Phase 1: Foundation (Current)
- [x] Project Setup (Vite, TS, Tailwind)
- [x] Basic Auth Flow (Login, Invite)
- [x] Admin User Management (Basic)
- [ ] **Action:** Refactor `useUserManagement` to use TanStack Query.
- [ ] **Action:** Set up `Axios` interceptors for robust "Connection Pooling".

### Phase 2: Core Features
- [ ] **Customers:** List, Create, Details View.
- [ ] **Contacts:** Sub-resource of Customers, Inline Creation Modal.
- [ ] **Leads:** Pipeline View (Kanban or List), Status Mutations.

### Phase 3: Advanced Features
- [ ] **Interactions:** The central logging hub.
- [ ] **Quotations:** Version handling, PDF generation (future).
- [ ] **Call Planner:** Calendar integration.

---

## 9. Rules of Engagement (Code Quality)

1.  **Strict Typing:** Interfaces for all API responses. No `any`.
2.  **Modular Hooks:** Logic goes in `hooks/`, UI goes in `components/`.
3.  **Error Boundaries:** Wrap major feature areas in Error Boundaries to prevent white screens.
4.  **Loading States:** Use `Suspense` or explicit `isLoading` skeletons (Shadcn Skeleton).
5.  **Comments:** Document complex logic, especially around Auth and Data Transformation.
