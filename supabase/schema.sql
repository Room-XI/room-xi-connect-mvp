-- Enable extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists btree_gin;

-- Tables
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  tags text[] not null default '{}',
  free boolean not null default true,
  indoor boolean,
  outdoor boolean,
  cost_cents integer,
  location_name text,
  address text,
  lat text,
  lng text,
  organizer text,
  accessibility_notes text,
  next_start timestamptz,
  next_end timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_programs (
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, program_id)
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  "timestamp" timestamptz not null,
  dimension text not null,
  mood_level_1_6 int not null check (mood_level_1_6 between 1 and 6),
  affect_tags text[] not null default '{}',
  note text check (note is null or length(note) <= 140),
  local_tz text,
  created_at timestamptz not null default now()
);
create unique index if not exists checkins_one_per_day_idx on public.checkins (user_id, (("timestamp" at time zone 'America/Edmonton')::date));
create index if not exists checkins_user_ts_idx on public.checkins (user_id, "timestamp" desc);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weights jsonb,
  scores jsonb,
  streak_count int default 0,
  last_checkin_date date,
  is_admin boolean not null default false,
  
  -- Layer 1: Basic Info (collected at signup)
  first_name text,
  last_name text,
  preferred_name text,
  age int check (age between 13 and 25),
  date_of_birth date,
  city text,
  postal_code text,
  
  -- Layer 2: Safety Profile (collected before first in-person program)
  legal_first_name text,
  legal_last_name text,
  emergency_contact_name text,
  emergency_contact_phone text,
  emergency_contact_relationship text,
  
  -- Optional Indigenous Self-Identification (OCAP principles apply)
  indigenous_identity text check (indigenous_identity in ('first_nations', 'metis', 'inuit', 'prefer_not_to_say')),
  indigenous_community text,
  
  -- Progress Tracking (not for consent - for profile completion)
  account_complete boolean default false,
  safety_profile_complete boolean default false,
  program_profile_complete boolean default false,
  
  -- XP system (never awarded for consent actions)
  xp_points int default 0,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.xids (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  xid_hash text not null unique,
  checksum text,
  tombstoned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  xid_id uuid not null references public.xids(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  "timestamp" timestamptz not null,
  method text not null check (method in ('qr','manual')),
  site text,
  created_at timestamptz not null default now()
);
create index if not exists attendance_xid_ts_idx on public.attendance (xid_id, "timestamp" desc);

-- Guardian Verification Table
create table if not exists public.guardian_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guardian_contact_type text not null check (guardian_contact_type in ('email', 'phone')),
  guardian_contact_value text not null,
  guardian_contact_hash text not null,
  verification_token text not null,
  verification_method text check (verification_method in ('alberta_digital_id', 'email_link', 'sms_link')),
  verified_at timestamptz,
  verified_by_name text,
  verified_by_ip text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists guardian_verifications_user_idx on public.guardian_verifications (user_id);
create index if not exists guardian_verifications_token_idx on public.guardian_verifications (verification_token) where verified_at is null;

-- Consents Table (Granular, Purpose-Specific)
create table if not exists public.consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in (
    'terms_of_use',
    'privacy_notice',
    'data_collection',
    'photo_internal',
    'photo_social_media',
    'photo_website',
    'photo_fundraising',
    'photo_story',
    'analytics_opt_in',
    'ai_personalization',
    'crash_reporting',
    'marketing_email',
    'marketing_sms'
  )),
  value boolean not null,
  ip_address text,
  user_agent text,
  granted_by text check (granted_by in ('self', 'guardian', 'staff')),
  evidence_ref text,
  text_version text,
  updated_at timestamptz not null default now(),
  primary key (user_id, consent_type)
);

-- Health Information Table (HIA Compliance - Separate from General Consents)
create table if not exists public.health_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  allergies text,
  medical_conditions text,
  medications text,
  accessibility_needs text,
  dietary_restrictions text,
  parq_status text check (parq_status in ('clear', 'refer', 'not_completed')),
  parq_completed_at timestamptz,
  
  -- HIA-Specific Consent
  health_data_consent boolean not null default false,
  health_consent_granted_at timestamptz,
  health_consent_ip text,
  health_consent_user_agent text,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Consent Events Audit Trail (PIPA Compliance)
create table if not exists public.consent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor text not null check (actor in ('youth', 'guardian', 'staff', 'system')),
  event_type text not null check (event_type in ('granted', 'revoked', 'updated', 'requested', 'verified')),
  consent_key text,
  old_value boolean,
  new_value boolean,
  ip_address text,
  user_agent text,
  evidence_ref text,
  notes text,
  occurred_at timestamptz not null default now()
);
create index if not exists consent_events_user_idx on public.consent_events (user_id, occurred_at desc);

-- Breach Notification Table (Alberta PIPA 72-hour requirement)
create table if not exists public.breach_events (
  id uuid primary key default gen_random_uuid(),
  breach_type text not null check (breach_type in ('unauthorized_access', 'data_loss', 'ransomware', 'insider_threat', 'accidental_disclosure', 'other')),
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  affected_user_count int,
  affected_user_ids uuid[],
  description text not null,
  
  -- OIPC Notification Tracking (72-hour requirement)
  oipc_notification_required boolean not null default false,
  oipc_notified_at timestamptz,
  oipc_notification_method text,
  oipc_reference_number text,
  
  -- Individual Notification Tracking
  individuals_notified_at timestamptz,
  notification_method text,
  guardians_notified_at timestamptz,
  
  -- Remediation
  remediation_steps text,
  remediation_completed_at timestamptz,
  
  discovered_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists breach_events_discovered_idx on public.breach_events (discovered_at desc);

create table if not exists public.crisis_supports (
  id uuid primary key default gen_random_uuid(),
  region text not null,
  category text not null check (category in ('call','textchat','inperson')),
  name text not null,
  phone text,
  text_code text,
  chat_url text,
  address text,
  hours text,
  notes text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- Admin Audit Log Table (Fix for R-04: Admin Account Takeover)
create table if not exists public.admin_logs (
    id bigint generated by default as identity primary key,
    user_id uuid references auth.users(id),
    action text not null,
    table_name text not null,
    record_id uuid,
    old_record jsonb,
    new_record jsonb,
    timestamp timestamptz default now()
);

-- Trigger function for admin logs
create or replace function public.log_program_changes()
returns trigger as $$
declare
  record_id uuid;
  user_id uuid;
begin
  user_id := auth.uid();
  if (TG_OP = 'INSERT') then
    record_id := NEW.id;
    insert into public.admin_logs (user_id, action, table_name, record_id, new_record)
    values (user_id, TG_OP, TG_TABLE_NAME, record_id, row_to_json(NEW));
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    record_id := NEW.id;
    insert into public.admin_logs (user_id, action, table_name, record_id, old_record, new_record)
    values (user_id, TG_OP, TG_TABLE_NAME, record_id, row_to_json(OLD), row_to_json(NEW));
    return NEW;
  elsif (TG_OP = 'DELETE') then
    record_id := OLD.id;
    insert into public.admin_logs (user_id, action, table_name, record_id, old_record)
    values (user_id, TG_OP, TG_TABLE_NAME, record_id, row_to_json(OLD));
    return OLD;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Attach trigger to programs table
create trigger programs_audit_trigger
after insert or update or delete on public.programs
for each row execute function public.log_program_changes();

-- RPC function for secure check-ins (Fix for R-02: Check-in Data Sensitivity)
create or replace function public.create_or_update_checkin(
  p_timestamp timestamptz,
  p_dimension text,
  p_mood_level_1_6 int,
  p_affect_tags text[],
  p_note text default null,
  p_local_tz text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_checkin_id uuid;
  v_date date;
  v_existing_id uuid;
begin
  -- Get authenticated user
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate inputs
  if p_mood_level_1_6 < 1 or p_mood_level_1_6 > 6 then
    raise exception 'Invalid mood level: must be between 1 and 6';
  end if;
  
  if p_dimension not in ('mood', 'energy', 'anxiety', 'focus') then
    raise exception 'Invalid dimension: must be mood, energy, anxiety, or focus';
  end if;

  if p_note is not null and length(p_note) > 140 then
    raise exception 'Note too long: maximum 140 characters';
  end if;

  -- Calculate date in Edmonton timezone for uniqueness check
  v_date := (p_timestamp at time zone 'America/Edmonton')::date;

  -- Check for existing check-in on this date
  select id into v_existing_id
  from public.checkins
  where user_id = v_user_id
    and (("timestamp" at time zone 'America/Edmonton')::date) = v_date;

  if v_existing_id is not null then
    -- Update existing check-in
    update public.checkins
    set
      "timestamp" = p_timestamp,
      dimension = p_dimension,
      mood_level_1_6 = p_mood_level_1_6,
      affect_tags = p_affect_tags,
      note = p_note,
      local_tz = p_local_tz
    where id = v_existing_id;
    
    v_checkin_id := v_existing_id;
  else
    -- Create new check-in
    insert into public.checkins (
      user_id,
      "timestamp",
      dimension,
      mood_level_1_6,
      affect_tags,
      note,
      local_tz
    ) values (
      v_user_id,
      p_timestamp,
      p_dimension,
      p_mood_level_1_6,
      p_affect_tags,
      p_note,
      p_local_tz
    ) returning id into v_checkin_id;
  end if;

  -- Update profile streak
  insert into public.profiles (user_id, last_checkin_date, streak_count)
  values (v_user_id, v_date, 1)
  on conflict (user_id) do update set
    last_checkin_date = v_date,
    streak_count = case
      when profiles.last_checkin_date = v_date - interval '1 day' then profiles.streak_count + 1
      when profiles.last_checkin_date = v_date then profiles.streak_count
      else 1
    end;

  return v_checkin_id;
end;
$$;
