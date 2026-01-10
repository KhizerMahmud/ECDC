-- Budget Management System Schema
-- This schema handles 84 budgets, 66 employees, time tracking, expenses, and allocations

-- Shared links table (for read-only sharing)
create table if not exists public.shared_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null, -- Unique token for the shared link
  created_by uuid references auth.users(id) on delete cascade, -- Owner/admin who created the link
  expires_at timestamptz, -- Optional expiration date (null = no expiration)
  is_active boolean default true, -- Allow disabling links without deleting
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for fast token lookup
create index if not exists idx_shared_links_token on public.shared_links(token) where is_active = true;

-- Enable RLS
alter table public.shared_links enable row level security;

-- Policy: Anyone can read active shared links (to verify token)
create policy "Anyone can read active shared links"
  on public.shared_links
  for select
  using (is_active = true);

-- Policy: Only authenticated users can create shared links
create policy "Authenticated users can create shared links"
  on public.shared_links
  for insert
  with check (auth.role() = 'authenticated');

-- Policy: Only the creator can update/delete their shared links
create policy "Users can update their own shared links"
  on public.shared_links
  for update
  using (auth.uid() = created_by);

create policy "Users can delete their own shared links"
  on public.shared_links
  for delete
  using (auth.uid() = created_by);

-- Profiles table (for admin authentication)
-- This table should match your main application schema
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  first_name text,
  last_name text,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

-- Locations table (VA and MD)
create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- 'VA' or 'MD'
  name text not null,
  created_at timestamptz default now()
);

-- Insert default locations
insert into public.locations (code, name)
values
  ('VA', 'Virginia'),
  ('MD', 'Maryland')
on conflict (code) do nothing;

-- Funders/Donors table
create table if not exists public.funders (
  id uuid primary key default gen_random_uuid(),
  code text unique not null, -- 'ONA', 'MORA', 'DV', 'VFHY', 'PC', 'MG', 'R&P', 'NOFO', 'AFHS', 'VOCA', 'TVAP'
  name text not null, -- Full name/description
  description text, -- Additional details
  color_code text, -- Color code for UI (hex color e.g., #3B82F6)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insert default funders
-- Based on Excel file: MORA, ONA, MG, R&P, AFHS, VFHY, DV, NOFO, VOCA, TVAP
insert into public.funders (code, name, description)
values
  ('ONA', 'ONA', 'ONA Funder'),
  ('MORA', 'MORA', 'Maryland Office for Refugees and Asylees'),
  ('DV', 'DV', 'Domestic Violence'),
  ('VFHY', 'VFHY', 'Virginia Foundation for Healthy Youth'),
  ('PC', 'PC', 'PC Funder (9 programs with location 30 and 33)'),
  ('MG', 'Matching Grant', 'Matching Grant Funder'),
  ('R&P', 'R&P', 'R&P Funder'),
  ('NOFO', 'NOFO', 'RACE to Rebuilding Trust and Community'),
  ('AFHS', 'AFHS', 'AFHS Funder'),
  ('VOCA', 'VOCA', 'VOCA Funder'),
  ('TVAP', 'TVAP', 'TVAP Funder')
on conflict (code) do nothing;

-- Budgets table (84 budgets/contracts)
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  budget_number text unique not null, -- e.g., '5206-30' (VA), '5206-33' (MD)
  name text,
  location_id uuid references public.locations(id),
  funder_id uuid references public.funders(id), -- Link to funder/donor
  fiscal_year_start date not null, -- Oct 1
  fiscal_year_end date not null, -- Sept 30
  total_budget numeric(15, 2) default 0,
  gl_code text, -- General Ledger code for the program/budget
  notes text, -- Notes about the budget/contract
  color_code text, -- Color code for UI (hex color or Tailwind class)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Note: Contract code validation is handled in the application layer
-- VA contracts should end in -30, MD contracts should end in -33

-- Budget line items categories
create table if not exists public.budget_line_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets(id) on delete cascade,
  category text not null, -- 'WAGES', 'TELEPHONE', 'LOCAL TRAVEL', etc.
  budgeted_amount numeric(15, 2) default 0,
  multiplier numeric(10, 2) default 1, -- For expense categories
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (budget_id, category)
);

-- Employees table (66 people)
create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  location_id uuid references public.locations(id), -- Nullable: null means employee is in both MD and VA
  annual_salary numeric(15, 4) default 0, -- Stored value from Excel (4 decimal places for precision). NOTE: Do NOT calculate from hourly_rate * 2080. Always use the exact stored salary value for totals. Display should show 2 decimal places.
  hourly_rate numeric(10, 4), -- Calculated FROM annual_salary (annual_salary / 2080). This is a derived value, not a source of truth.
  status text default 'active' check (status in ('active', 'inactive', 'laid_off', 'tbh')),
  title text, -- Job title/position
  date_of_hire date, -- Date the employee was hired
  tbh_budget_id uuid references public.budgets(id), -- Which budget needs this TBH employee
  tbh_notes text, -- Notes about the TBH position
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Employee allocations across budgets
-- This tracks how much of each employee's time/budget is allocated to each budget
create table if not exists public.employee_allocations (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  budget_id uuid references public.budgets(id) on delete cascade,
  allocation_percentage numeric(5, 2) default 0, -- Percentage of employee's time
  allocated_amount numeric(15, 2) default 0, -- Dollar amount allocated
  fiscal_year_start date not null,
  fiscal_year_end date not null,
  notes text, -- Notes about the allocation
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (employee_id, budget_id, fiscal_year_start)
);

-- Time entries (hours worked per pay period - biweekly)
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  budget_id uuid references public.budgets(id) on delete cascade,
  pay_period_start date not null,
  pay_period_end date not null,
  hours_worked numeric(10, 2) default 0,
  wage_amount numeric(15, 2) default 0, -- Calculated: hours * hourly_rate
  manual_adjustment numeric(15, 2) default 0, -- Manual adjustments (positive or negative)
  bonus numeric(15, 2) default 0, -- Bonuses
  notes text, -- Notes about the time entry
  is_biweekly boolean default true, -- Mark as biweekly pay period
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Monthly expenses by category
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets(id) on delete cascade,
  category text not null, -- Must match budget_line_items category
  expense_month date not null, -- First day of the month
  amount numeric(15, 2) default 0,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Budget calculations cache (for performance)
create table if not exists public.budget_calculations (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets(id) on delete cascade,
  calculation_month date not null,
  total_wages numeric(15, 2) default 0,
  fringe_amount numeric(15, 2) default 0, -- 36.1% of wages
  total_wages_with_fringe numeric(15, 2) default 0,
  indirect_amount numeric(15, 2) default 0, -- 26.2% of total budget
  total_expenses numeric(15, 2) default 0,
  remaining_budget numeric(15, 2) default 0,
  calculated_at timestamptz default now(),
  unique (budget_id, calculation_month)
);

-- Employee utilization tracking
create table if not exists public.employee_utilization (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.employees(id) on delete cascade,
  calculation_month date not null,
  total_allocated_amount numeric(15, 2) default 0, -- Sum of all allocations
  total_earned_amount numeric(15, 2) default 0, -- From time entries
  utilization_percentage numeric(5, 2) default 0,
  deficit_amount numeric(15, 2) default 0, -- Negative if under-utilized
  surplus_amount numeric(15, 2) default 0, -- Positive if over-utilized
  calculated_at timestamptz default now(),
  unique (employee_id, calculation_month)
);

-- Indexes for performance
create index if not exists idx_budgets_location on public.budgets(location_id);
create index if not exists idx_budgets_funder on public.budgets(funder_id);
create index if not exists idx_budgets_fiscal_year on public.budgets(fiscal_year_start, fiscal_year_end);
create index if not exists idx_employees_location on public.employees(location_id);
create index if not exists idx_employee_allocations_employee on public.employee_allocations(employee_id);
create index if not exists idx_employee_allocations_budget on public.employee_allocations(budget_id);
create index if not exists idx_time_entries_employee on public.time_entries(employee_id);
create index if not exists idx_time_entries_budget on public.time_entries(budget_id);
create index if not exists idx_time_entries_period on public.time_entries(pay_period_start, pay_period_end);
create index if not exists idx_expenses_budget on public.expenses(budget_id);
create index if not exists idx_expenses_month on public.expenses(expense_month);
create index if not exists idx_expenses_category on public.expenses(category);

-- Program budget line items table
-- This tracks line items (categories) for each program with monthly budgets and balances
create table if not exists public.program_budget_line_items (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid references public.budgets(id) on delete cascade,
  category text not null, -- Line item category (travel, supplies, staff development, etc.)
  budget_month date not null, -- First day of the month
  budgeted_amount numeric(15, 2) default 0, -- Budgeted amount for this month
  spent_amount numeric(15, 2) default 0, -- Amount spent this month (calculated from expenses)
  balance numeric(15, 2) generated always as (budgeted_amount - spent_amount) stored, -- Balance for this month
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (budget_id, category, budget_month)
);

create index if not exists idx_program_budget_line_items_budget on public.program_budget_line_items(budget_id);
create index if not exists idx_program_budget_line_items_month on public.program_budget_line_items(budget_month);
create index if not exists idx_program_budget_line_items_category on public.program_budget_line_items(category);

comment on table public.program_budget_line_items is 'Monthly budget line items for programs with budgeted amounts, spent amounts, and balances';

-- Function to update spent_amount from expenses table
-- This function is called by trigger when expenses are inserted/updated/deleted
create or replace function update_program_line_item_spent()
returns trigger as $$
declare
  v_budget_id uuid;
  v_category text;
  v_expense_month date;
begin
  -- Handle both INSERT/UPDATE (NEW) and DELETE (OLD)
  if tg_op = 'DELETE' then
    v_budget_id := old.budget_id;
    v_category := old.category;
    v_expense_month := old.expense_month;
  else
    v_budget_id := new.budget_id;
    v_category := new.category;
    v_expense_month := new.expense_month;
  end if;

  -- Update spent_amount for matching budget_id, category, and month
  update public.program_budget_line_items
  set spent_amount = (
    select coalesce(sum(amount), 0)
    from public.expenses
    where budget_id = v_budget_id
      and category = v_category
      and date_trunc('month', expense_month) = date_trunc('month', v_expense_month)
  ),
  updated_at = now()
  where budget_id = v_budget_id
    and category = v_category
    and date_trunc('month', budget_month) = date_trunc('month', v_expense_month);
  
  if tg_op = 'DELETE' then
    return old;
  else
    return new;
  end if;
end;
$$ language plpgsql;

-- Trigger to automatically update spent_amount when expenses are added/updated/deleted
drop trigger if exists trigger_update_program_line_item_spent on public.expenses;
create trigger trigger_update_program_line_item_spent
  after insert or update or delete on public.expenses
  for each row
  execute function update_program_line_item_spent();

-- Function to calculate hourly rate from annual salary
-- NOTE: This is a one-way calculation (salary -> rate). 
-- Salaries should NEVER be calculated from hourly_rate * 2080 due to rounding errors.
-- Always use the stored annual_salary value as the source of truth.
create or replace function calculate_hourly_rate(annual_salary numeric)
returns numeric as $$
begin
  -- Assuming 2080 hours per year (40 hours/week * 52 weeks)
  -- This calculates rate FROM salary (one-way, not reversible due to rounding)
  return round((annual_salary / 2080)::numeric, 4);
end;
$$ language plpgsql immutable;

-- Function to calculate fringe (36.1% of wages)
create or replace function calculate_fringe(wages numeric)
returns numeric as $$
begin
  return round((wages * 0.361)::numeric, 2);
end;
$$ language plpgsql immutable;

-- Function to calculate indirect (26.2% of total budget)
create or replace function calculate_indirect(total_budget numeric)
returns numeric as $$
begin
  return round((total_budget * 0.262)::numeric, 2);
end;
$$ language plpgsql immutable;

-- Function to update budget calculations for a month
create or replace function update_budget_calculations(
  p_budget_id uuid,
  p_month date
)
returns void as $$
declare
  v_total_wages numeric(15, 2);
  v_fringe numeric(15, 2);
  v_total_wages_fringe numeric(15, 2);
  v_total_expenses numeric(15, 2);
  v_budget_total numeric(15, 2);
  v_indirect numeric(15, 2);
  v_remaining numeric(15, 2);
begin
  -- Calculate total wages for the month (including manual adjustments and bonuses)
  select coalesce(sum(wage_amount + manual_adjustment + bonus), 0)
  into v_total_wages
  from public.time_entries
  where budget_id = p_budget_id
    and date_trunc('month', pay_period_start) = date_trunc('month', p_month);

  -- Calculate fringe
  v_fringe := calculate_fringe(v_total_wages);
  v_total_wages_fringe := v_total_wages + v_fringe;

  -- Calculate total expenses for the month
  select coalesce(sum(amount), 0)
  into v_total_expenses
  from public.expenses
  where budget_id = p_budget_id
    and date_trunc('month', expense_month) = date_trunc('month', p_month);

  -- Get total budget
  select total_budget
  into v_budget_total
  from public.budgets
  where id = p_budget_id;

  -- Calculate indirect
  v_indirect := calculate_indirect(v_budget_total);

  -- Calculate remaining budget
  v_remaining := v_budget_total - v_total_wages_fringe - v_total_expenses - v_indirect;

  -- Insert or update calculation
  insert into public.budget_calculations (
    budget_id,
    calculation_month,
    total_wages,
    fringe_amount,
    total_wages_with_fringe,
    indirect_amount,
    total_expenses,
    remaining_budget
  )
  values (
    p_budget_id,
    date_trunc('month', p_month),
    v_total_wages,
    v_fringe,
    v_total_wages_fringe,
    v_indirect,
    v_total_expenses,
    v_remaining
  )
  on conflict (budget_id, calculation_month)
  do update set
    total_wages = excluded.total_wages,
    fringe_amount = excluded.fringe_amount,
    total_wages_with_fringe = excluded.total_wages_with_fringe,
    indirect_amount = excluded.indirect_amount,
    total_expenses = excluded.total_expenses,
    remaining_budget = excluded.remaining_budget,
    calculated_at = now();
end;
$$ language plpgsql;

-- Function to update employee utilization
create or replace function update_employee_utilization(
  p_employee_id uuid,
  p_month date
)
returns void as $$
declare
  v_total_allocated numeric(15, 2);
  v_total_earned numeric(15, 2);
  v_utilization numeric(5, 2);
  v_deficit numeric(15, 2);
  v_surplus numeric(15, 2);
  v_annual_salary numeric(15, 2);
begin
  -- Get annual salary
  select annual_salary
  into v_annual_salary
  from public.employees
  where id = p_employee_id;

  -- Calculate total allocated amount across all budgets
  select coalesce(sum(allocated_amount), 0)
  into v_total_allocated
  from public.employee_allocations
  where employee_id = p_employee_id
    and fiscal_year_start <= p_month
    and fiscal_year_end >= p_month;

  -- Calculate total earned from time entries for the month
  select coalesce(sum(wage_amount), 0)
  into v_total_earned
  from public.time_entries
  where employee_id = p_employee_id
    and date_trunc('month', pay_period_start) = date_trunc('month', p_month);

  -- Calculate utilization percentage (based on annual salary)
  if v_annual_salary > 0 then
    v_utilization := round(((v_total_allocated / v_annual_salary) * 100)::numeric, 2);
  else
    v_utilization := 0;
  end if;

  -- Calculate deficit/surplus
  v_deficit := greatest(0, v_annual_salary - v_total_allocated);
  v_surplus := greatest(0, v_total_allocated - v_annual_salary);

  -- Insert or update utilization
  insert into public.employee_utilization (
    employee_id,
    calculation_month,
    total_allocated_amount,
    total_earned_amount,
    utilization_percentage,
    deficit_amount,
    surplus_amount
  )
  values (
    p_employee_id,
    date_trunc('month', p_month),
    v_total_allocated,
    v_total_earned,
    v_utilization,
    v_deficit,
    v_surplus
  )
  on conflict (employee_id, calculation_month)
  do update set
    total_allocated_amount = excluded.total_allocated_amount,
    total_earned_amount = excluded.total_earned_amount,
    utilization_percentage = excluded.utilization_percentage,
    deficit_amount = excluded.deficit_amount,
    surplus_amount = excluded.surplus_amount,
    calculated_at = now();
end;
$$ language plpgsql;

-- Trigger to update hourly rate when annual salary changes
-- IMPORTANT: This is a one-way calculation (salary -> rate).
-- The trigger automatically calculates hourly_rate FROM annual_salary.
-- Salaries should NEVER be reverse-calculated from hourly_rate * 2080.
create or replace function update_employee_hourly_rate()
returns trigger as $$
begin
  -- Calculate hourly_rate from annual_salary (one-way calculation)
  new.hourly_rate := calculate_hourly_rate(new.annual_salary);
  return new;
end;
$$ language plpgsql;

create trigger trigger_update_hourly_rate
  before insert or update of annual_salary on public.employees
  for each row
  execute function update_employee_hourly_rate();

-- Trigger to recalculate budget when time entry changes
create or replace function trigger_recalculate_budget()
returns trigger as $$
begin
  perform update_budget_calculations(
    coalesce(new.budget_id, old.budget_id),
    coalesce(new.pay_period_start, old.pay_period_start)
  );
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trigger_recalculate_on_time_entry
  after insert or update or delete on public.time_entries
  for each row
  execute function trigger_recalculate_budget();

-- Trigger to recalculate budget when expense changes
create or replace function trigger_recalculate_budget_expense()
returns trigger as $$
begin
  perform update_budget_calculations(
    coalesce(new.budget_id, old.budget_id),
    coalesce(new.expense_month, old.expense_month)
  );
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trigger_recalculate_on_expense
  after insert or update or delete on public.expenses
  for each row
  execute function trigger_recalculate_budget_expense();

-- Function to check if a user is an admin
-- This function checks the profiles table for admin role
create or replace function public.is_admin(check_user uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Check if profiles table exists and user is admin
  -- Returns false if table doesn't exist or user is not admin
  return exists (
    select 1
    from public.profiles ap
    where ap.id = check_user
      and ap.role = 'admin'
  );
exception
  when others then
    -- If table doesn't exist or any error, return false
    return false;
end;
$$;

-- Enable RLS (Row Level Security)
alter table public.locations enable row level security;
alter table public.funders enable row level security;
alter table public.budgets enable row level security;
alter table public.budget_line_items enable row level security;
alter table public.employees enable row level security;
alter table public.employee_allocations enable row level security;
alter table public.time_entries enable row level security;
alter table public.expenses enable row level security;
alter table public.budget_calculations enable row level security;
alter table public.employee_utilization enable row level security;

-- RLS Policies - Only admins can access budget data
create policy "Admins can view all budget data"
  on public.locations for select
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage funders"
  on public.funders for all
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage all budget data"
  on public.budgets for all
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage budget line items"
  on public.budget_line_items for all
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage employees"
  on public.employees for all
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage employee allocations"
  on public.employee_allocations for all
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage time entries"
  on public.time_entries for all
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage expenses"
  on public.expenses for all
  using (public.is_admin((select auth.uid())));

create policy "Admins can view calculations"
  on public.budget_calculations for select
  using (public.is_admin((select auth.uid())));

create policy "Admins can view utilization"
  on public.employee_utilization for select
  using (public.is_admin((select auth.uid())));

create policy "Admins can manage program budget line items"
  on public.program_budget_line_items for all
  using (public.is_admin((select auth.uid())));

