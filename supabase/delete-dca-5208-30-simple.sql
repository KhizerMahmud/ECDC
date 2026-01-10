-- Simple script to delete the $53 DCA expense for budget 5208-30
-- This finds and deletes any expense with amount 53 for this budget in DCA categories

-- Step 1: See what we're deleting
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

-- Step 2: Delete by ID (copy the ID from step 1 if the above query shows results)
-- Or use this to delete all $53 DCA expenses:
DELETE FROM expenses
WHERE id IN (
  SELECT e.id
  FROM expenses e
  JOIN budgets b ON e.budget_id = b.id
  WHERE b.budget_number = '5208-30'
    AND e.amount = 53.00
    AND UPPER(e.category) IN (
      'RECOGNITION CEREMONY',
      'STUDENT INTEGRATION',
      'CLIENT TRANSPORTATION',
      'CLIENT LAPTOP'
    )
);

-- Step 3: Verify deletion
SELECT 
  COUNT(*) as remaining_dca_expenses,
  COALESCE(SUM(e.amount), 0) as total_amount
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
  AND UPPER(e.category) IN (
    'RECOGNITION CEREMONY',
    'STUDENT INTEGRATION',
    'CLIENT TRANSPORTATION',
    'CLIENT LAPTOP'
  );

