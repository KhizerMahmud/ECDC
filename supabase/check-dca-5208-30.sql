-- Check if any DCA expenses exist for budget 5208-30
-- This will show us exactly what expenses are there

-- First, find the budget ID
SELECT id, budget_number, name, fiscal_year_start
FROM budgets
WHERE budget_number = '5208-30';

-- Check ALL expenses for this budget (not just DCA)
SELECT 
  e.id,
  e.category,
  e.amount,
  e.expense_month,
  b.budget_number,
  b.name
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
ORDER BY e.category, e.amount;

-- Check specifically for DCA categories with amount = 53
SELECT 
  e.id,
  e.category,
  e.amount,
  b.budget_number,
  b.name
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
  AND e.amount = 53.00
  AND UPPER(e.category) IN (
    'RECOGNITION CEREMONY',
    'STUDENT INTEGRATION',
    'CLIENT TRANSPORTATION',
    'CLIENT LAPTOP'
  );

-- Sum all expenses for this budget to see the total
SELECT 
  COUNT(*) as expense_count,
  COALESCE(SUM(e.amount), 0) as total_expenses
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30';

