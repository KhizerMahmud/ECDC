-- Find and delete ALL expenses for budget 5208-30
-- This will help find the "ghost" expenses that aren't showing in the UI

-- Step 1: Find the budget ID
SELECT id, budget_number, name, fiscal_year_start
FROM budgets
WHERE budget_number = '5208-30';

-- Step 2: Show ALL expenses for this budget (to see what's actually there)
SELECT 
  e.id,
  e.category,
  e.amount,
  e.expense_month,
  e.created_at,
  e.updated_at,
  b.budget_number,
  b.name
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
ORDER BY e.created_at DESC;

-- Step 3: Count and sum all expenses
SELECT 
  COUNT(*) as expense_count,
  COALESCE(SUM(e.amount), 0) as total_expenses,
  STRING_AGG(DISTINCT e.category, ', ') as all_categories
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30';

-- Step 4: Delete ALL expenses for this budget (use with caution!)
-- Uncomment the line below only after reviewing what was found in Step 2
-- DELETE FROM expenses
-- WHERE budget_id IN (SELECT id FROM budgets WHERE budget_number = '5208-30');

-- Step 5: After deletion, verify all expenses are gone
-- SELECT COUNT(*) as remaining_expenses
-- FROM expenses e
-- JOIN budgets b ON e.budget_id = b.id
-- WHERE b.budget_number = '5208-30';

