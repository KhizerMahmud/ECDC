-- Delete DCA-related expenses for budget 5208-30
-- This will remove "ghost" DCA expenses that aren't showing in the UI

-- FIRST: Show ALL expenses to see what exists
SELECT 
  e.id,
  e.category,
  e.amount,
  e.expense_month,
  b.budget_number,
  b.name,
  CASE 
    WHEN UPPER(e.category) IN ('RECOGNITION CEREMONY', 'STUDENT INTEGRATION', 'CLIENT TRANSPORTATION', 'CLIENT LAPTOP') 
    THEN 'DCA Expense (will be deleted)'
    ELSE 'Other Expense (will NOT be deleted)'
  END as expense_type
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
ORDER BY e.amount DESC;

-- SECOND: Show only DCA expenses that will be deleted
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
  AND UPPER(e.category) IN (
    'RECOGNITION CEREMONY',
    'STUDENT INTEGRATION',
    'CLIENT TRANSPORTATION',
    'CLIENT LAPTOP'
  )
ORDER BY e.amount DESC;

-- THIRD: Delete only DCA expenses (not all expenses)
DELETE FROM expenses
WHERE budget_id IN (
  SELECT id FROM budgets WHERE budget_number = '5208-30'
)
AND UPPER(category) IN (
  'RECOGNITION CEREMONY',
  'STUDENT INTEGRATION',
  'CLIENT TRANSPORTATION',
  'CLIENT LAPTOP'
);

-- FINALLY: Verify deletion (should show 0 remaining DCA expenses)
SELECT 
  COUNT(*) as remaining_dca_expenses,
  COALESCE(SUM(e.amount), 0) as total_dca_amount
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
  AND UPPER(e.category) IN (
    'RECOGNITION CEREMONY',
    'STUDENT INTEGRATION',
    'CLIENT TRANSPORTATION',
    'CLIENT LAPTOP'
  );

