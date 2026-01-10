-- Add fringe_rate column to budgets table
-- This allows each budget to have its own fringe benefit rate (as a percentage, e.g., 36.1 for 36.1%)
-- If null, defaults to 36.1% in calculations

alter table if exists public.budgets
  add column if not exists fringe_rate numeric(5, 2) default 36.1;

-- Add comment to explain the field
comment on column public.budgets.fringe_rate is 'Fringe benefit rate as a percentage (e.g., 36.1 for 36.1%). Defaults to 36.1% if not specified.';

