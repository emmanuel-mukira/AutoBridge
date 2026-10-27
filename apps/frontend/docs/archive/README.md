# Gaston CRM - Frontend

React + TypeScript + Vite application for the Gaston CRM system.

## Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:3000`

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file in the frontend directory:

```env
VITE_API_URL=http://localhost:3000
```

**Environment Variables:**
- `VITE_API_URL` - Backend API base URL (default: `http://localhost:3000`)

### 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

### 5. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── app/              # App configuration (router, theme)
├── components/       # Reusable components (ProtectedRoute, GuestRoute)
├── contexts/         # React contexts (AuthContext, ThemeContext)
├── pages/            # Page components
│   ├── admin/        # Admin-only pages (AdminUsers, Dashboard)
│   ├── Login.tsx
│   ├── Signup.tsx
│   ├── InviteAccept.tsx
│   └── ...
├── services/         # API services (auth, adminUsers)
└── utils/            # Utilities (http client)
```

## Testing the Invite Flow End-to-End

### Prerequisites
1. Backend server running with email service configured
2. Admin user created (see backend README)

### Step-by-Step Testing

#### 1. Admin Sends Invite
1. Log in as admin at `http://localhost:5173/login`
2. Navigate to **Dashboard → Users**
3. Switch to **Applicants** tab
4. Find a PENDING user
5. Click **⋮** menu → **Send Invite**
6. Check backend console for Ethereal email preview URL

#### 2. User Receives Invite Email
1. Copy the Ethereal preview URL from backend console
2. Open URL in browser to view email
3. Click the invite link in the email (format: `http://localhost:5173/invite/accept?token=xxx`)

#### 3. User Accepts Invite
1. Invite page automatically logs out any current user
2. Email field is pre-filled and disabled
3. Enter password (minimum 6 characters)
4. Confirm password
5. Click **Activate Account**
6. User is redirected to `/login` with success message

#### 4. User Logs In
1. Enter email and new password
2. Click **Log In**
3. User is redirected to `/dashboard`

#### 5. Verify in Admin Panel
1. Log back in as admin
2. Navigate to **Dashboard → Users**
3. Check **Sales Reps** tab
4. Verify user status changed from PENDING to ACTIVE

### Common Test Scenarios

**Test 1: Token Expiration**
- Wait 24 hours after invite sent
- Try to accept invite
- Should show "Invalid or expired token" error

**Test 2: Token Reuse**
- Accept invite successfully
- Try to use same token again
- Should show "Invalid or expired token" error

**Test 3: Active User Cannot Accept Invite**
- Admin sends invite to ACTIVE user (button should be disabled)
- If user clicks old invite link
- Should show "Account is already active" message

**Test 4: Multiple Browser Tabs**
- Admin logged in Tab A
- User accepts invite in Tab B (same browser)
- Admin's Tab A should continue working (no "Forbidden" errors)

**Test 5: Password Validation**
- Try password < 6 characters → Error
- Try mismatched passwords → Error
- Try valid password → Success

## Authentication & Authorization

### Route Protection

**Protected Routes** (require authentication):
- `/dashboard/*` - Admin dashboard and all child routes

**Guest Routes** (redirect to dashboard if authenticated):
- `/login` - Login page
- `/signup` - Signup page
- `/forgot-password` - Password reset

**Public Routes**:
- `/` - Home page
- `/invite/accept` - Invite acceptance (auto-logout)

### Role-Based Access

**Admin (`roleId: 1`)**:
- Full access to dashboard
- User management
- Send invites
- Change user roles/status

**Sales Rep (`roleId: 2`)**:
- Limited dashboard access
- Cannot access admin features

## API Integration

The frontend uses Axios for all API requests with automatic cookie handling.

**Base Configuration:**
```typescript
// src/utils/http.ts
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Send cookies
});
```

**Authentication:**
- Cookies: `access_token`, `refresh_token`
- Automatic logout on 401 responses
- Token refresh handled by backend

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router 7** - Routing
- **Axios** - HTTP client
- **Lucide React** - Icons
- **TailwindCSS** - Styling

## Development Notes

### Type Safety
- All API responses have explicit TypeScript types
- No `any` types allowed (see `types-rule.md`)
- Strict type checking enabled

### Code Style
- Follow user rules in `.windsurf/memory/`
- Use Axios for all requests (see `axios-rule.md`)
- Button styles adapt to theme (see `button-style-rule.md`)

### Auto-Refresh
- User list auto-refreshes every 5 seconds
- Silent refresh (no loading indicators)
- Pauses when user is interacting with dropdowns

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
