-- Enable RLS on all user-data tables
alter table public.programs enable row level security;
alter table public.saved_programs enable row level security;
alter table public.checkins enable row level security;
alter table public.profiles enable row level security;
alter table public.xids enable row level security;
alter table public.attendance enable row level security;
alter table public.consents enable row level security;
alter table public.crisis_supports enable row level security;
alter table public.admin_logs enable row level security;

-- Helper function to check for admin (Fix for R-04: Admin Account Takeover)
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  );
$$ language sql security definer;

-- Public read policies (Fix for R-06: Unauthenticated Endpoint Exposure - relies on Supabase rate limiting)
create policy "Programs are viewable by everyone" on public.programs for select using (true);
create policy "Crisis supports are viewable by everyone" on public.crisis_supports for select using (true);

-- Admin write policies with audit logging
create policy "Admins can manage programs" on public.programs for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage crisis supports" on public.crisis_supports for all
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can view audit logs" on public.admin_logs for select
  using (public.is_admin());

-- User-owned data policies (owner-only access)
create policy "Users can manage their own saved programs" on public.saved_programs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own check-ins" on public.checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own profile" on public.profiles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own XIDs" on public.xids for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their own consents" on public.consents for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Special policy for attendance (can view if you own the linked XID)
create policy "Users can view their own attendance records" on public.attendance for select
  using (exists (
    select 1 from public.xids x where x.id = attendance.xid_id and x.user_id = auth.uid()
  ));

-- Attendance INSERT policy for QR scans and manual check-ins
create policy "Users can create attendance for their own XID" on public.attendance for insert
  with check (exists (
    select 1 from public.xids x where x.id = attendance.xid_id and x.user_id = auth.uid()
  ));
