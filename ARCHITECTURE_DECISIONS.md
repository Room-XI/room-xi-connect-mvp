# Architecture Decisions

## ADR-001: Application-Level Security (Not Database RLS)

**Status**: Accepted  
**Date**: 2024-10-31  
**Context**: Room XI Connect security implementation

### Decision

We will enforce security at the **application level** (Express middleware + query filtering), NOT at the database level via Row Level Security (RLS) with session variables.

### Context

**Database**: Neon PostgreSQL (serverless)  
**Auth**: Express sessions (not Supabase auth)  
**ORM**: Drizzle ORM  
**Connection**: Connection pooling

### Problem

Initial implementation attempted to use PostgreSQL RLS with session variables (`SET LOCAL app.current_user_id`), similar to how Supabase implements security. However, this approach has fundamental issues with Neon's architecture:

1. **`SET LOCAL` requires transactions**: Using `SET LOCAL` outside a transaction block throws an error
2. **Connection pooling breaks session variables**: Even with `SET`, Neon opens a new connection per query, so the subsequent Drizzle query never sees the session variable
3. **Complexity**: Managing transactions for every request adds significant complexity

### Alternatives Considered

**Option 1**: Database-level RLS with session variables  
- ❌ Doesn't work with connection pooling
- ❌ Requires managing transactions per request
- ❌ High complexity

**Option 2**: Per-user database connections  
- ❌ Doesn't scale well
- ❌ Connection exhaustion risk
- ❌ Not how Neon is designed to be used

**Option 3**: Application-level security ✅ **CHOSEN**
- ✅ Works with connection pooling
- ✅ Simpler implementation
- ✅ Standard Express pattern
- ✅ Easier to test and debug

### Implementation

**Security Layers**:

1. **Authentication Middleware**:
   ```typescript
   router.get('/api/profile', requireAuth, async (req, res) => {
     // req.session.userId is guaranteed to exist
   });
   ```

2. **Authorization Middleware**:
   ```typescript
   router.get('/api/admin/users', requireAdmin, async (req, res) => {
     // req.session.isAdmin is true
   });
   ```

3. **Consent Gates**:
   ```typescript
   router.post('/api/checkin', requireConsent(['terms_of_use']), async (req, res) => {
     // User has granted required consents
   });
   ```

4. **Query-Level Filtering**:
   ```typescript
   // ALWAYS filter by user ID from session
   const checkins = await db.select().from(checkins)
     .where(eq(checkins.userId, req.session.userId));
   ```

5. **Audit Logging**:
   ```typescript
   await logAuditTrail(pool, {
     userId: req.session.userId,
     action: 'READ',
     tableName: 'checkins',
   });
   ```

### Defense-in-Depth

RLS policies still exist in the database (`supabase/policies.sql`) as a defense-in-depth measure:
- If we migrate to Supabase or per-user connections, RLS protects data at the database level
- If application-level checks fail, RLS provides a backup layer
- Currently NOT actively enforced due to architecture

### Consequences

**Positive**:
- ✅ Works reliably with Neon serverless
- ✅ Standard Express pattern, well-documented
- ✅ Easier to test (can mock req.session)
- ✅ Lower complexity
- ✅ Better performance (no transaction overhead)

**Negative**:
- ⚠️ Security depends on application code correctness
- ⚠️ Developers must remember to filter by userId
- ⚠️ No database-level enforcement

**Mitigations**:
- Comprehensive middleware coverage
- Code review checklist for security
- Automated tests for authorization
- ESLint rules to catch missing filters (future)

### Testing Requirements

**Integration tests must verify**:
1. Authenticated user can access their own data
2. Authenticated user CANNOT access other users' data
3. Unauthenticated user cannot access protected routes
4. Admin can access admin routes
5. Non-admin cannot access admin routes
6. Users without consent cannot access consent-gated routes

### Future Considerations

**If migrating to Supabase**:
- RLS policies already exist and are ready to use
- Change auth from Express sessions to Supabase auth
- Remove application-level filtering (RLS handles it)

**If scaling requires better separation**:
- Consider microservices with dedicated auth service
- Consider API gateway with JWT tokens
- Consider zero-trust architecture

---

## ADR-002: Neon PostgreSQL Over Supabase

**Status**: Accepted  
**Date**: 2024-10-31

### Decision

Use Neon PostgreSQL as the primary database instead of Supabase.

### Rationale

1. **Cost**: Neon free tier is more generous for development
2. **Flexibility**: Full control over database without vendor lock-in
3. **Performance**: Serverless Postgres with autoscaling
4. **Compatibility**: Standard PostgreSQL, easy to migrate

### Tradeoffs

**Gain**:
- ✅ Lower cost for pilot phase
- ✅ Standard PostgreSQL (portable)
- ✅ No vendor lock-in

**Lose**:
- ❌ No built-in auth (use Express sessions)
- ❌ No built-in storage (use local/S3)
- ❌ No built-in realtime (use WebSockets)
- ❌ No automatic RLS enforcement (use application-level)

---

## ADR-003: Express Sessions Over JWT

**Status**: Accepted  
**Date**: 2024-10-31

### Decision

Use server-side Express sessions with PostgreSQL storage (`connect-pg-simple`) instead of JWTs.

### Rationale

1. **Security**: Sessions are revocable, JWTs are not
2. **Simplicity**: Easier to implement and debug
3. **Youth safety**: Can immediately revoke access if needed
4. **Consent tracking**: Easy to update session when consents change

### Implementation

```typescript
app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
}));
```

### Tradeoffs

**Gain**:
- ✅ Immediate session revocation
- ✅ Server-side consent state
- ✅ Simpler CSRF protection

**Lose**:
- ❌ Server state (not stateless)
- ❌ Requires database for sessions
- ❌ Harder to scale horizontally (mitigated by shared session store)

---

## ADR-004: Drizzle ORM Over Prisma

**Status**: Accepted  
**Date**: 2024-10-31

### Decision

Use Drizzle ORM instead of Prisma for database operations.

### Rationale

1. **Performance**: Drizzle is lighter and faster
2. **SQL-like**: Closer to raw SQL, easier to understand
3. **Type safety**: Full TypeScript support
4. **Migrations**: Simple push-based migrations

### Tradeoffs

**Gain**:
- ✅ Better performance
- ✅ Simpler mental model
- ✅ Type-safe queries

**Lose**:
- ❌ Smaller community than Prisma
- ❌ Less documentation
- ❌ No visual schema tool

---

## Summary

The core architectural decision is **application-level security** with:
- Express middleware for authentication & authorization
- Query-level filtering by user ID
- Audit logging for compliance
- RLS policies as defense-in-depth (not actively enforced)

This architecture is simple, reliable, and works well with Neon PostgreSQL's serverless design.
