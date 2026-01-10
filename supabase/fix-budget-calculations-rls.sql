-- Fix RLS issue with budget_calculations table
-- The update_budget_calculations function needs SECURITY DEFINER to insert/update budget_calculations
-- when triggered by expense/time entry changes

-- Drop and recreate the function with SECURITY DEFINER
drop function if exists update_budget_calculations(uuid, date);

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

  -- Calculate fringe (36.1% of wages)
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
$$ language plpgsql security definer set search_path = public;

