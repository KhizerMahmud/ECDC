-- ============================================================================
-- Setup and Initialization Scripts
-- ============================================================================
-- Run this after creating the schema to set up development environment
-- and initialize budget calculations
-- WARNING: Only use for local development! Never use in production!
-- ============================================================================
-- This script includes:
-- 1. RLS configuration for development
-- 2. Salary storage documentation and trigger updates
-- 3. Budget calculations initialization
-- ============================================================================

-- ============================================================================
-- 1. Salary Storage Documentation and Triggers
-- ============================================================================
-- Ensure salary storage documentation and trigger functions are correct
-- ============================================================================

COMMENT ON COLUMN public.employees.annual_salary IS 
  'Stored value from Excel (4 decimal places for precision). NOTE: Do NOT calculate from hourly_rate * 2080. Always use the exact stored salary value for totals. Display should show 2 decimal places.';

COMMENT ON COLUMN public.employees.hourly_rate IS 
  'Calculated FROM annual_salary (annual_salary / 2080). This is a derived value, not a source of truth.';

-- Update the function with better documentation
CREATE OR REPLACE FUNCTION calculate_hourly_rate(annual_salary numeric)
RETURNS numeric AS $$
BEGIN
  -- NOTE: This is a one-way calculation (salary -> rate). 
  -- Salaries should NEVER be calculated from hourly_rate * 2080 due to rounding errors.
  -- Always use the stored annual_salary value as the source of truth.
  -- Assuming 2080 hours per year (40 hours/week * 52 weeks)
  -- This calculates rate FROM salary (one-way, not reversible due to rounding)
  RETURN round((annual_salary / 2080)::numeric, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update the trigger function with documentation
CREATE OR REPLACE FUNCTION update_employee_hourly_rate()
RETURNS trigger AS $$
BEGIN
  -- IMPORTANT: This is a one-way calculation (salary -> rate).
  -- The trigger automatically calculates hourly_rate FROM annual_salary.
  -- Salaries should NEVER be reverse-calculated from hourly_rate * 2080.
  new.hourly_rate := calculate_hourly_rate(new.annual_salary);
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Configure RLS for Development
-- ============================================================================
-- Note: color_code column is already defined in budget-schema.sql
-- No need to add it here if using the schema file
-- ============================================================================
-- Option A: Completely disable RLS (easiest for development)
-- Uncomment the lines below if you want to completely disable RLS:

/*
ALTER TABLE public.locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.funders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_line_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_calculations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_utilization DISABLE ROW LEVEL SECURITY;
*/

-- Option B: Keep RLS enabled but allow unauthenticated access (recommended)
-- This keeps security in place but allows development without authentication

DROP POLICY IF EXISTS "Admins can view all budget data" ON public.locations;
DROP POLICY IF EXISTS "Admins can manage funders" ON public.funders;
DROP POLICY IF EXISTS "Admins can manage all budget data" ON public.budgets;
DROP POLICY IF EXISTS "Admins can manage budget line items" ON public.budget_line_items;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employee allocations" ON public.employee_allocations;
DROP POLICY IF EXISTS "Admins can manage time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can manage expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admins can view calculations" ON public.budget_calculations;
DROP POLICY IF EXISTS "Admins can view utilization" ON public.employee_utilization;

CREATE POLICY "Admins can view all budget data"
  ON public.locations FOR SELECT
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can manage funders"
  ON public.funders FOR ALL
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can manage all budget data"
  ON public.budgets FOR ALL
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can manage budget line items"
  ON public.budget_line_items FOR ALL
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can manage employees"
  ON public.employees FOR ALL
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can manage employee allocations"
  ON public.employee_allocations FOR ALL
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can manage time entries"
  ON public.time_entries FOR ALL
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can manage expenses"
  ON public.expenses FOR ALL
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can view calculations"
  ON public.budget_calculations FOR SELECT
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

CREATE POLICY "Admins can view utilization"
  ON public.employee_utilization FOR SELECT
  USING (public.is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) IS NULL);

-- ============================================================================
-- 3. Initialize Budget Calculations
-- ============================================================================
-- Initialize budget calculations for all budgets and all months in the fiscal year
-- This creates calculation records even when there are no time entries or expenses yet
-- Run this after importing budgets to see initial budget states
--
-- The calculations will show:
--   - Total wages: 0 (until time entries are added)
--   - Total expenses: 0 (until expenses are added)
--   - Indirect amount: 26.2% of total budget
--   - Remaining budget: total_budget - indirect_amount

DO $$
DECLARE
  budget_record RECORD;
  fiscal_start date;
  fiscal_end date;
  current_month date;
  total_wages numeric(15, 2);
  fringe_amount numeric(15, 2);
  total_wages_fringe numeric(15, 2);
  indirect_amount numeric(15, 2);
  total_expenses numeric(15, 2);
  remaining_budget numeric(15, 2);
BEGIN
  -- Get fiscal year from first budget (assuming all budgets have same fiscal year)
  SELECT fiscal_year_start, fiscal_year_end
  INTO fiscal_start, fiscal_end
  FROM public.budgets
  LIMIT 1;
  
  RAISE NOTICE 'Initializing calculations for fiscal year: % to %', fiscal_start, fiscal_end;
  
  -- Loop through each budget
  FOR budget_record IN 
    SELECT id, budget_number, total_budget, fiscal_year_start, fiscal_year_end
    FROM public.budgets
  LOOP
    RAISE NOTICE 'Processing budget: %', budget_record.budget_number;
    
    -- Loop through each month in the fiscal year
    current_month := budget_record.fiscal_year_start;
    
    WHILE current_month <= budget_record.fiscal_year_end LOOP
      -- Calculate values (with 0 wages and expenses for now)
      total_wages := 0;
      fringe_amount := round((total_wages * 0.361)::numeric, 2);
      total_wages_fringe := total_wages + fringe_amount;
      indirect_amount := round((budget_record.total_budget * 0.262)::numeric, 2);
      total_expenses := 0;
      remaining_budget := budget_record.total_budget - total_wages_fringe - total_expenses - indirect_amount;
      
      -- Insert or update calculation
      INSERT INTO public.budget_calculations (
        budget_id,
        calculation_month,
        total_wages,
        fringe_amount,
        total_wages_with_fringe,
        indirect_amount,
        total_expenses,
        remaining_budget
      )
      VALUES (
        budget_record.id,
        date_trunc('month', current_month),
        total_wages,
        fringe_amount,
        total_wages_fringe,
        indirect_amount,
        total_expenses,
        remaining_budget
      )
      ON CONFLICT (budget_id, calculation_month)
      DO UPDATE SET
        total_wages = EXCLUDED.total_wages,
        fringe_amount = EXCLUDED.fringe_amount,
        total_wages_with_fringe = EXCLUDED.total_wages_with_fringe,
        indirect_amount = EXCLUDED.indirect_amount,
        total_expenses = EXCLUDED.total_expenses,
        remaining_budget = EXCLUDED.remaining_budget,
        calculated_at = now();
      
      -- Move to next month
      current_month := current_month + interval '1 month';
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Budget calculations initialization complete!';
END $$;

-- Verify the results
SELECT 
  COUNT(*) as total_calculations,
  COUNT(DISTINCT budget_id) as budgets_with_calculations,
  MIN(calculation_month) as earliest_month,
  MAX(calculation_month) as latest_month
FROM public.budget_calculations;

