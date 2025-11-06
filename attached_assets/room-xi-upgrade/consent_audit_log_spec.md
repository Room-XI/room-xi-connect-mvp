# Consent Audit Log Specification
Fields
- user_xid TEXT, type TEXT, action TEXT, timestamp TIMESTAMPTZ, source TEXT
Rules
- Append only, immutable, exportable as CSV for audits
