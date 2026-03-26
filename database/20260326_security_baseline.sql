create or replace function public.app_current_company_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.app_current_role()
returns text
language sql
stable
set search_path = public
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.app_role_in(allowed_roles text[])
returns boolean
language sql
stable
set search_path = public
as $$
  select coalesce(public.app_current_role() = any(allowed_roles), false)
$$;

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.projects enable row level security;
alter table public.project_lv_positions enable row level security;
alter table public.employee_workdays enable row level security;
alter table public.workday_project_entries enable row level security;
alter table public.employee_filter_groups enable row level security;
alter table public.employee_filter_group_members enable row level security;
alter table public.employee_travel_profiles enable row level security;
alter table public.employee_travel_project_routes enable row level security;
alter table public.travel_expense_entries enable row level security;

do $do$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_own'
  ) then
    execute 'create policy profiles_select_own on public.profiles for select using (id = auth.uid())';
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_update_own'
  ) then
    execute 'create policy profiles_update_own on public.profiles for update using (id = auth.uid()) with check (id = auth.uid())';
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employees' and policyname = 'employees_select_company'
  ) then
    execute 'create policy employees_select_company on public.employees for select using (company_id = public.app_current_company_id())';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employees' and policyname = 'employees_insert_admin'
  ) then
    execute $$create policy employees_insert_admin on public.employees
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employees' and policyname = 'employees_update_admin'
  ) then
    execute $$create policy employees_update_admin on public.employees
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employees' and policyname = 'employees_delete_admin'
  ) then
    execute $$create policy employees_delete_admin on public.employees
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_select_company'
  ) then
    execute 'create policy projects_select_company on public.projects for select using (company_id = public.app_current_company_id())';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_insert_admin'
  ) then
    execute $$create policy projects_insert_admin on public.projects
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_update_admin'
  ) then
    execute $$create policy projects_update_admin on public.projects
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'projects' and policyname = 'projects_delete_admin'
  ) then
    execute $$create policy projects_delete_admin on public.projects
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_lv_positions' and policyname = 'project_lv_positions_select_company'
  ) then
    execute 'create policy project_lv_positions_select_company on public.project_lv_positions for select using (company_id = public.app_current_company_id())';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_lv_positions' and policyname = 'project_lv_positions_insert_admin'
  ) then
    execute $$create policy project_lv_positions_insert_admin on public.project_lv_positions
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_lv_positions' and policyname = 'project_lv_positions_update_admin'
  ) then
    execute $$create policy project_lv_positions_update_admin on public.project_lv_positions
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_lv_positions' and policyname = 'project_lv_positions_delete_admin'
  ) then
    execute $$create policy project_lv_positions_delete_admin on public.project_lv_positions
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_workdays' and policyname = 'employee_workdays_select_company'
  ) then
    execute 'create policy employee_workdays_select_company on public.employee_workdays for select using (company_id = public.app_current_company_id())';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_workdays' and policyname = 'employee_workdays_insert_admin'
  ) then
    execute $$create policy employee_workdays_insert_admin on public.employee_workdays
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_workdays' and policyname = 'employee_workdays_update_admin'
  ) then
    execute $$create policy employee_workdays_update_admin on public.employee_workdays
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_workdays' and policyname = 'employee_workdays_delete_admin'
  ) then
    execute $$create policy employee_workdays_delete_admin on public.employee_workdays
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workday_project_entries' and policyname = 'workday_project_entries_select_company'
  ) then
    execute 'create policy workday_project_entries_select_company on public.workday_project_entries for select using (company_id = public.app_current_company_id())';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workday_project_entries' and policyname = 'workday_project_entries_insert_roles'
  ) then
    execute $$create policy workday_project_entries_insert_roles on public.workday_project_entries
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer','vorarbeiter'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workday_project_entries' and policyname = 'workday_project_entries_update_roles'
  ) then
    execute $$create policy workday_project_entries_update_roles on public.workday_project_entries
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer','vorarbeiter'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer','vorarbeiter'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workday_project_entries' and policyname = 'workday_project_entries_delete_roles'
  ) then
    execute $$create policy workday_project_entries_delete_roles on public.workday_project_entries
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer','vorarbeiter'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_groups' and policyname = 'employee_filter_groups_select_company'
  ) then
    execute 'create policy employee_filter_groups_select_company on public.employee_filter_groups for select using (company_id = public.app_current_company_id())';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_groups' and policyname = 'employee_filter_groups_insert_admin'
  ) then
    execute $$create policy employee_filter_groups_insert_admin on public.employee_filter_groups
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_groups' and policyname = 'employee_filter_groups_update_admin'
  ) then
    execute $$create policy employee_filter_groups_update_admin on public.employee_filter_groups
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_groups' and policyname = 'employee_filter_groups_delete_admin'
  ) then
    execute $$create policy employee_filter_groups_delete_admin on public.employee_filter_groups
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_group_members' and policyname = 'employee_filter_group_members_select_company'
  ) then
    execute 'create policy employee_filter_group_members_select_company on public.employee_filter_group_members for select using (company_id = public.app_current_company_id())';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_group_members' and policyname = 'employee_filter_group_members_insert_admin'
  ) then
    execute $$create policy employee_filter_group_members_insert_admin on public.employee_filter_group_members
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_group_members' and policyname = 'employee_filter_group_members_update_admin'
  ) then
    execute $$create policy employee_filter_group_members_update_admin on public.employee_filter_group_members
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_filter_group_members' and policyname = 'employee_filter_group_members_delete_admin'
  ) then
    execute $$create policy employee_filter_group_members_delete_admin on public.employee_filter_group_members
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_profiles' and policyname = 'employee_travel_profiles_select_admin'
  ) then
    execute $$create policy employee_travel_profiles_select_admin on public.employee_travel_profiles
      for select using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_profiles' and policyname = 'employee_travel_profiles_insert_admin'
  ) then
    execute $$create policy employee_travel_profiles_insert_admin on public.employee_travel_profiles
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_profiles' and policyname = 'employee_travel_profiles_update_admin'
  ) then
    execute $$create policy employee_travel_profiles_update_admin on public.employee_travel_profiles
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_profiles' and policyname = 'employee_travel_profiles_delete_admin'
  ) then
    execute $$create policy employee_travel_profiles_delete_admin on public.employee_travel_profiles
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_project_routes' and policyname = 'employee_travel_project_routes_select_admin'
  ) then
    execute $$create policy employee_travel_project_routes_select_admin on public.employee_travel_project_routes
      for select using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_project_routes' and policyname = 'employee_travel_project_routes_insert_admin'
  ) then
    execute $$create policy employee_travel_project_routes_insert_admin on public.employee_travel_project_routes
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_project_routes' and policyname = 'employee_travel_project_routes_update_admin'
  ) then
    execute $$create policy employee_travel_project_routes_update_admin on public.employee_travel_project_routes
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'employee_travel_project_routes' and policyname = 'employee_travel_project_routes_delete_admin'
  ) then
    execute $$create policy employee_travel_project_routes_delete_admin on public.employee_travel_project_routes
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'travel_expense_entries' and policyname = 'travel_expense_entries_select_admin'
  ) then
    execute $$create policy travel_expense_entries_select_admin on public.travel_expense_entries
      for select using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'travel_expense_entries' and policyname = 'travel_expense_entries_insert_admin'
  ) then
    execute $$create policy travel_expense_entries_insert_admin on public.travel_expense_entries
      for insert with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'travel_expense_entries' and policyname = 'travel_expense_entries_update_admin'
  ) then
    execute $$create policy travel_expense_entries_update_admin on public.travel_expense_entries
      for update using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      ) with check (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'travel_expense_entries' and policyname = 'travel_expense_entries_delete_admin'
  ) then
    execute $$create policy travel_expense_entries_delete_admin on public.travel_expense_entries
      for delete using (
        company_id = public.app_current_company_id()
        and public.app_role_in(array['admin','geschaeftsfuehrer'])
      )$$;
  end if;
end
$do$;

create or replace function public.replace_workday_project_entries(
  p_company_id uuid,
  p_workday_ids uuid[],
  p_entries jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_expected_workdays integer;
  v_actual_workdays integer;
begin
  if p_company_id is null then
    raise exception 'company_id is required';
  end if;

  v_expected_workdays := coalesce(array_length(p_workday_ids, 1), 0);

  if v_expected_workdays > 0 then
    select count(*)
    into v_actual_workdays
    from public.employee_workdays
    where company_id = p_company_id
      and id = any(p_workday_ids);

    if v_actual_workdays <> v_expected_workdays then
      raise exception 'Mindestens ein Arbeitstag gehört nicht zu deiner Firma.';
    end if;
  end if;

  delete from public.workday_project_entries
  where company_id = p_company_id
    and workday_id = any(p_workday_ids);

  if coalesce(jsonb_typeof(p_entries), '') <> 'array' or coalesce(jsonb_array_length(p_entries), 0) = 0 then
    return;
  end if;

  insert into public.workday_project_entries (
    company_id,
    workday_id,
    project_id,
    project_lv_position_id,
    order_position_snapshot,
    lv_position_snapshot,
    lv_description_snapshot,
    assigned_hours
  )
  select
    p_company_id,
    row_data.workday_id,
    row_data.project_id,
    row_data.project_lv_position_id,
    row_data.order_position_snapshot,
    row_data.lv_position_snapshot,
    row_data.lv_description_snapshot,
    row_data.assigned_hours
  from jsonb_to_recordset(p_entries) as row_data(
    workday_id uuid,
    project_id uuid,
    project_lv_position_id uuid,
    order_position_snapshot text,
    lv_position_snapshot text,
    lv_description_snapshot text,
    assigned_hours numeric
  );
end
$$;

create or replace function public.replace_travel_expense_entries(
  p_company_id uuid,
  p_employee_id uuid,
  p_from date,
  p_to date,
  p_entries jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_company_id is null or p_employee_id is null or p_from is null or p_to is null then
    raise exception 'company_id, employee_id, from and to are required';
  end if;

  if not exists (
    select 1
    from public.employees
    where id = p_employee_id
      and company_id = p_company_id
  ) then
    raise exception 'Der ausgewählte Mitarbeiter gehört nicht zu deiner Firma.';
  end if;

  delete from public.travel_expense_entries
  where company_id = p_company_id
    and employee_id = p_employee_id
    and entry_date >= p_from
    and entry_date < p_to;

  if coalesce(jsonb_typeof(p_entries), '') <> 'array' or coalesce(jsonb_array_length(p_entries), 0) = 0 then
    return;
  end if;

  insert into public.travel_expense_entries (
    company_id,
    employee_id,
    entry_date,
    project_id,
    departure_type,
    destination_text,
    return_type,
    absence_from,
    presence_until,
    overnight_type,
    catering_type,
    private_kilometers,
    meal_allowance_tax_free,
    meal_allowance_taxable,
    taxable_from_date_text,
    km_allowance
  )
  select
    p_company_id,
    p_employee_id,
    row_data.entry_date,
    row_data.project_id,
    row_data.departure_type,
    row_data.destination_text,
    row_data.return_type,
    row_data.absence_from,
    row_data.presence_until,
    row_data.overnight_type,
    row_data.catering_type,
    row_data.private_kilometers,
    row_data.meal_allowance_tax_free,
    row_data.meal_allowance_taxable,
    row_data.taxable_from_date_text,
    row_data.km_allowance
  from jsonb_to_recordset(p_entries) as row_data(
    entry_date date,
    project_id uuid,
    departure_type text,
    destination_text text,
    return_type text,
    absence_from text,
    presence_until text,
    overnight_type text,
    catering_type text,
    private_kilometers numeric,
    meal_allowance_tax_free numeric,
    meal_allowance_taxable numeric,
    taxable_from_date_text text,
    km_allowance numeric
  );
end
$$;

create or replace function public.replace_employee_travel_project_routes(
  p_company_id uuid,
  p_employee_id uuid,
  p_routes jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_company_id is null or p_employee_id is null then
    raise exception 'company_id and employee_id are required';
  end if;

  if not exists (
    select 1
    from public.employees
    where id = p_employee_id
      and company_id = p_company_id
  ) then
    raise exception 'Der ausgewählte Mitarbeiter gehört nicht zu deiner Firma.';
  end if;

  delete from public.employee_travel_project_routes
  where company_id = p_company_id
    and employee_id = p_employee_id;

  if coalesce(jsonb_typeof(p_routes), '') <> 'array' or coalesce(jsonb_array_length(p_routes), 0) = 0 then
    return;
  end if;

  insert into public.employee_travel_project_routes (
    company_id,
    employee_id,
    project_id,
    distance_home_project_km,
    time_home_project_min
  )
  select
    p_company_id,
    p_employee_id,
    row_data.project_id,
    row_data.distance_home_project_km,
    row_data.time_home_project_min
  from jsonb_to_recordset(p_routes) as row_data(
    project_id uuid,
    distance_home_project_km numeric,
    time_home_project_min numeric
  );
end
$$;

create or replace function public.replace_employee_filter_group_members(
  p_company_id uuid,
  p_group_id uuid,
  p_employee_ids uuid[]
)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_expected_members integer;
  v_actual_members integer;
begin
  if p_company_id is null or p_group_id is null then
    raise exception 'company_id and group_id are required';
  end if;

  if not exists (
    select 1
    from public.employee_filter_groups
    where id = p_group_id
      and company_id = p_company_id
  ) then
    raise exception 'Die Filtergruppe gehört nicht zu deiner Firma.';
  end if;

  if coalesce(array_length(p_employee_ids, 1), 0) > 0 then
    v_expected_members := (
      select count(distinct employee_id)
      from unnest(p_employee_ids) as employee_id
    );

    select count(*)
    into v_actual_members
    from public.employees
    where company_id = p_company_id
      and id in (
        select distinct employee_id
        from unnest(p_employee_ids) as employee_id
      );

    if v_expected_members <> v_actual_members then
      raise exception 'Mindestens ein ausgewählter Mitarbeiter gehört nicht zu deiner Firma.';
    end if;
  end if;

  delete from public.employee_filter_group_members
  where company_id = p_company_id
    and group_id = p_group_id;

  if coalesce(array_length(p_employee_ids, 1), 0) = 0 then
    return;
  end if;

  insert into public.employee_filter_group_members (
    company_id,
    group_id,
    employee_id
  )
  select
    p_company_id,
    p_group_id,
    employee_id
  from (
    select distinct employee_id
    from unnest(p_employee_ids) as employee_id
  ) as deduped;
end
$$;
