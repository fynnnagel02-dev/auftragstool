-- Production-safe performance indexes for the current query patterns.
-- These statements are non-breaking and can be applied independently.

create index if not exists idx_profiles_role_company
  on public.profiles (id, role, company_id);

create index if not exists idx_employees_company_number
  on public.employees (company_id, employee_number);

create index if not exists idx_employees_company_active_number
  on public.employees (company_id, is_active, employee_number);

create index if not exists idx_projects_company_number
  on public.projects (company_id, project_number);

create index if not exists idx_projects_company_status_number
  on public.projects (company_id, status, project_number);

create index if not exists idx_employee_workdays_company_date
  on public.employee_workdays (company_id, work_date);

create index if not exists idx_employee_workdays_company_employee_date
  on public.employee_workdays (company_id, employee_id, work_date);

create index if not exists idx_workday_project_entries_company_workday
  on public.workday_project_entries (company_id, workday_id);

create index if not exists idx_workday_project_entries_company_project
  on public.workday_project_entries (company_id, project_id);

create index if not exists idx_project_lv_positions_company_project_order
  on public.project_lv_positions (company_id, project_id, order_position);

create index if not exists idx_travel_expense_entries_company_employee_date
  on public.travel_expense_entries (company_id, employee_id, entry_date);

create index if not exists idx_travel_expense_entries_company_project_date
  on public.travel_expense_entries (company_id, project_id, entry_date);

create index if not exists idx_employee_travel_profiles_company_employee
  on public.employee_travel_profiles (company_id, employee_id);

create index if not exists idx_employee_travel_project_routes_company_employee
  on public.employee_travel_project_routes (company_id, employee_id);

create index if not exists idx_employee_travel_project_routes_company_employee_project
  on public.employee_travel_project_routes (company_id, employee_id, project_id);

create index if not exists idx_employee_filter_groups_company_name
  on public.employee_filter_groups (company_id, name);

create index if not exists idx_employee_filter_group_members_company_group
  on public.employee_filter_group_members (company_id, group_id);

create index if not exists idx_employee_filter_group_members_company_employee
  on public.employee_filter_group_members (company_id, employee_id);
