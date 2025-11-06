# Staging vs Prod Flags
- STAGING_MODE: verbose logs, no geo export, hide public map
- XIMI_ENABLED: on with rate limit in staging, cooldown in prod
- DP_NOISE_DEBUG: epsilon audit prints only in staging
- EXPLORE_GATE: enforced in both
- LOW_POWER_DEFAULT: on in staging tests
