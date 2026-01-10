-- First, let's see what DCA expenses actually exist for budget 5208-30
-- This will show us the exact category names and amounts

SELECT 
  e.id,
  e.category,
  e.amount,
  b.budget_number,
  b.name,
  e.expense_month
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
ORDER BY e.category;

-- Also check with case-insensitive matching to see if there are any variations
SELECT 
  e.id,
  e.category,
  e.amount,
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
  );

