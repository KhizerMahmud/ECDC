-- Add fringe_benefits_amount column to budgets table
-- This stores the total fringe benefits amount for the budget (annual amount)

alter table if exists public.budgets
  add column if not exists fringe_benefits_amount numeric(15, 2) default 0;

-- Add comment to explain the field
comment on column public.budgets.fringe_benefits_amount is 'Total fringe benefits amount for the budget (annual amount in dollars).';

