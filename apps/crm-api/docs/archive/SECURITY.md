# Security Implementation

**Status**: Production Ready ✅  
**Last Updated**: January 7, 2026

---

## Authentication & Authorization

### JWT Strategy
**Files**: `src/config/cookieConfig.ts`, `src/utils/jwt.ts`

**Access Token**
- Lifetime: 15 minutes
- Storage: HttpOnly cookie
- Scope: All API routes
- Contains: `{ sub: userId, roleId }`

**Refresh Token**
- Lifetime: 7 days
- Storage: HttpOnly cookie (scoped to `/api/auth/refresh`)
- Stored in: `user_sessions` table
- Single-use rotation for enhanced security

### Cookie Security
**File**: `src/config/cookieConfig.ts`

```typescript
export const accessTokenCookieOptions: CookieOptions = {
  httpOnly: true,       // Prevents XSS (JavaScript cannot access)
  secure: isProd,       // HTTPS only in production
  sameSite: "strict",   // Prevents CSRF (no cross-site requests)
  path: "/",
  maxAge: 15 * 60 * 1000,
};
```

**Protection Against**:
- ✅ **XSS** - `httpOnly: true` blocks JavaScript access
- ✅ **CSRF** - `sameSite: strict` blocks cross-site requests
- ✅ **MITM** - `secure: true` + HSTS forces HTTPS

---

## CSRF Protection (Modern Approach)

### Removed: Deprecated `csurf` Library
**Why**: Deprecated, has vulnerabilities, incompatible with modern SPA architecture

### Implemented: SameSite Cookies
**File**: `src/app.ts`

```typescript
// No CSRF tokens needed - browser handles it
app.use(cors({ 
  origin: FRONTEND_ORIGIN, 
  credentials: true 
}));
```

**How it works**:
- `SameSite=Strict` tells browser: "Only send cookies if request originates from same domain"
- Malicious sites cannot trigger requests with user's cookies
- No tokens to manage, no state to track

---

## Security Headers (Helmet)

### HSTS (HTTP Strict Transport Security)
**File**: `src/app.ts`

```typescript
app.use(helmet({
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true,
  }
}));
```

**Protection**: Forces HTTPS for 1 year, prevents downgrade attacks

### CSP (Content Security Policy)
```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],      // No inline scripts
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
}
```

**Protection**: Prevents XSS by restricting script sources

### Frameguard
```typescript
frameguard: { action: "deny" }
```

**Protection**: Prevents clickjacking attacks

---

## Rate Limiting

### Configuration
**File**: `src/middleware/rateLimit.ts`

```typescript
// Global API rate limiting
const apiLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                    // 100 requests per window
});

// Stricter for auth endpoints
const authLimiter = rateLimit({ 
  windowMs: 15 * 60 * 1000, 
  max: 10                     // 10 login attempts per 15 min
});
```

**Protection**: Prevents brute force attacks, DDoS mitigation

---

## Input Validation

### Zod Schemas
**Files**: `src/schemas/*.schemas.ts`

```typescript
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const CreateCustomerSchema = z.object({
  companyName: z.string().min(1).max(255),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});
```

**Protection**: Prevents injection attacks, validates all input

### SQL Injection Prevention
**Prisma ORM** - All queries use parameterized statements

```typescript
// ✅ Safe - Prisma parameterizes automatically
await prisma.user.findUnique({ 
  where: { email: userInput } 
});

// ❌ Never do this
await prisma.$executeRawUnsafe(`SELECT * FROM users WHERE email = '${userInput}'`);
```

---

## Multi-Tenant Isolation

### Application-Level Filtering
**File**: `src/middleware/auth.ts`

```typescript
// Every authenticated request includes companyId
req.user = {
  id: user.id,
  roleId: user.roleId,
  companyId: user.companyId  // Tenant isolation
};
```

**All queries filter by companyId**:
```typescript
const customers = await prisma.customer.findMany({
  where: { 
    companyId: req.user.companyId  // Automatic tenant isolation
  }
});
```

### Future: Row-Level Security (RLS)
See `docs/RLS.md` for PostgreSQL RLS implementation plan (database-level isolation)

---

## Audit Logging

### Comprehensive Tracking
**File**: `src/services/auditLogService.ts`

**Logged Actions**:
- LOGIN_SUCCESS / LOGIN_FAILED
- LOGOUT
- INVITE_SENT / INVITE_ACCEPTED
- USER_CREATED / USER_UPDATED / USER_DELETED
- ROLE_CHANGED / STATUS_CHANGED
- All CRUD operations on customers, leads, quotations

**Audit Log Fields**:
```typescript
{
  companyId: number,
  userId: number,
  action: string,
  description: string,
  ipAddress: string,
  userAgent: string,
  createdAt: DateTime
}
```

**Indexed for fast queries**: `(companyId, createdAt)`, `(userId, action)`, `(action, createdAt)`

---

## Password Security

### Hashing
**Library**: bcryptjs (10 rounds)

```typescript
import bcrypt from 'bcryptjs';

// Hash password
const passwordHash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, user.passwordHash);
```

### Password Requirements
- Minimum 6 characters (enforced by Zod)
- No maximum (bcrypt handles long passwords)
- Stored as hash only (never plaintext)

### Session Management
- Refresh tokens stored in `user_sessions` table
- Old sessions invalidated when sending new invite
- Logout deletes session from database

---

## Security Checklist

### ✅ Implemented
- [x] JWT authentication with refresh tokens
- [x] HttpOnly + Secure + SameSite cookies
- [x] HSTS (1 year)
- [x] CSP (strict policy)
- [x] Rate limiting (100 req/15min global, 10 req/15min auth)
- [x] Input validation (Zod)
- [x] SQL injection prevention (Prisma)
- [x] Password hashing (bcrypt, 10 rounds)
- [x] Audit logging (comprehensive)
- [x] Multi-tenant isolation (application-level)
- [x] CORS configuration
- [x] Error handling (no sensitive data leaks)

### ⚠️ Future Enhancements
- [ ] Row-Level Security (PostgreSQL RLS)
- [ ] 2FA/MFA support
- [ ] Password complexity requirements
- [ ] Account lockout after failed attempts
- [ ] Security headers monitoring
- [ ] Penetration testing

---

## Security Testing

### CSRF Protection Test
```bash
# This should FAIL (cross-site request blocked by SameSite)
curl -X POST http://localhost:3000/api/customers \
  -H "Origin: https://malicious-site.com" \
  -H "Cookie: access_token=..." \
  -d '{"companyName":"Evil Corp"}'
```

### XSS Protection Test
```javascript
// This should return undefined (HttpOnly blocks JS access)
console.log(document.cookie);
```

### Rate Limiting Test
```bash
# Make 11 login attempts in 1 minute - 11th should be blocked
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done
```

---

## Incident Response

### Security Event Monitoring
Check audit logs for suspicious activity:

```sql
-- Failed login attempts
SELECT * FROM auth.audit_logs 
WHERE action = 'LOGIN_FAILED' 
ORDER BY created_at DESC 
LIMIT 100;

-- Multiple role changes
SELECT user_id, COUNT(*) 
FROM auth.audit_logs 
WHERE action = 'ROLE_CHANGED' 
GROUP BY user_id 
HAVING COUNT(*) > 5;
```

### Session Invalidation
```typescript
// Invalidate all sessions for a user
await prisma.userSession.deleteMany({
  where: { userId: suspiciousUserId }
});
```
