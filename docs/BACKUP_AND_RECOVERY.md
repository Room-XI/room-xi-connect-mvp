# Room XI Connect - Backup and Disaster Recovery Procedures

## Overview

Room XI Connect uses Neon PostgreSQL as its database backend. Neon provides built-in backup and recovery features that ensure data safety and business continuity.

## Neon's Built-in Protection

### Automatic Backups

Neon automatically handles backups through its branch-based architecture:

1. **Point-in-Time Recovery (PITR)**: Neon maintains a continuous log of all database changes
2. **Retention Period**: 7 days of history on the Free tier, 30 days on paid plans
3. **No Configuration Required**: Backups happen automatically with no user intervention

### Database Branches

Neon's branching feature provides:
- **Instant snapshots**: Create a branch at any point in time
- **Zero-copy cloning**: Branches don't duplicate data until changes are made
- **Safe testing**: Test migrations or changes on a branch before applying to production

## Recovery Procedures

### Scenario 1: Accidental Data Deletion

If data is accidentally deleted:

1. **Immediate Response** (within retention period):
   ```bash
   # Create a recovery branch from a point before the deletion
   # Go to Neon Console > Your Project > Branches
   # Click "Create Branch"
   # Select a timestamp before the deletion occurred
   ```

2. **Extract the data**:
   - Connect to the recovery branch
   - Export the needed data
   - Import into the main branch

3. **Using Replit's Checkpoint System**:
   - Room XI Connect also has automatic checkpoints
   - Go to the Checkpoint tab in Replit
   - Select a checkpoint before the issue
   - Click "Restore" to rollback both code and database

### Scenario 2: Schema Migration Failure

If a database migration causes issues:

1. **Don't panic** - Neon can restore to pre-migration state

2. **Create a branch from before the migration**:
   - Note the timestamp when migration was run
   - Create a branch from 1 minute before that time

3. **Verify the branch works**:
   ```bash
   # Test the recovery branch
   DATABASE_URL="recovery_branch_url" npm run test
   ```

4. **Swap branches if needed** (contact Neon support for production swaps)

### Scenario 3: Complete Database Recovery

For catastrophic failures:

1. **Contact Neon Support**: support@neon.tech
2. **Provide**: Project ID, approximate time of last known good state
3. **Neon can restore** from their internal backups

## Manual Backup Procedures

While Neon handles automatic backups, you may want manual exports:

### Export Database Dump

```bash
# Using pg_dump (requires PostgreSQL client installed)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Export Critical Tables as CSV

```bash
# Export users (excluding passwords)
psql $DATABASE_URL -c "COPY (SELECT id, email, created_at FROM users) TO STDOUT WITH CSV HEADER" > users_backup.csv

# Export profiles
psql $DATABASE_URL -c "COPY profiles TO STDOUT WITH CSV HEADER" > profiles_backup.csv

# Export check-ins
psql $DATABASE_URL -c "COPY checkins TO STDOUT WITH CSV HEADER" > checkins_backup.csv
```

### Scheduled Backups

For production, consider scheduling regular exports:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * cd /app && pg_dump $DATABASE_URL | gzip > /backups/daily_$(date +\%Y\%m\%d).sql.gz
```

## Data Retention Policy

### User Data
- **Active accounts**: Retained indefinitely while account is active
- **Deleted accounts**: Removed within 30 days of deletion request
- **Consent events**: Retained for 7 years (legal requirement)

### System Data
- **Logs**: 30 days rolling retention
- **Analytics**: Aggregated data retained indefinitely, raw data for 90 days
- **Session data**: 24 hours after expiry

## Disaster Recovery Contacts

| Role | Contact | When to Contact |
|------|---------|-----------------|
| Neon Support | support@neon.tech | Database issues |
| Replit Support | support@replit.com | Platform issues |
| Room XI Tech Lead | [internal] | All incidents |

## Testing Recovery Procedures

### Monthly Recovery Drill

1. Create a test branch from production
2. Verify data integrity on the branch
3. Practice restoring a table from the branch
4. Document any issues encountered

### Recovery Time Objectives (RTO)

| Scenario | Target RTO |
|----------|------------|
| Single table restore | < 1 hour |
| Point-in-time recovery | < 2 hours |
| Full database restore | < 4 hours |

## Security Considerations

- **Never share** DATABASE_URL or connection strings
- **Encrypt** manual backups before storing
- **Limit access** to production database to essential personnel
- **Audit** database access monthly

## Related Documentation

- [Neon Branching Documentation](https://neon.tech/docs/introduction/branching)
- [Neon Point-in-Time Recovery](https://neon.tech/docs/introduction/point-in-time-restore)
- [Room XI Security Implementation](./SECURITY_IMPLEMENTATION.md)
