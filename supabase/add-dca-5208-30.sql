-- Delete DCA expenses for budget 5208-30 (PC ICM FY25)
-- DCA categories: RECOGNITION CEREMONY, STUDENT INTEGRATION, CLIENT TRANSPORTATION, CLIENT LAPTOP

-- First, let's see what we're deleting
SELECT 
  e.id,
  e.category,
  e.amount,
  b.budget_number,
  b.name
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
  AND e.category IN (
    'RECOGNITION CEREMONY',
    'STUDENT INTEGRATION',
    'CLIENT TRANSPORTATION',
    'CLIENT LAPTOP'
  );

-- Now delete them
DELETE FROM expenses
WHERE budget_id IN (
  SELECT id FROM budgets WHERE budget_number = '5208-30'
)
AND category IN (
  'RECOGNITION CEREMONY',
  'STUDENT INTEGRATION',
  'CLIENT TRANSPORTATION',
  'CLIENT LAPTOP'
);

-- Verify deletion
SELECT 
  COUNT(*) as remaining_dca_expenses
FROM expenses e
JOIN budgets b ON e.budget_id = b.id
WHERE b.budget_number = '5208-30'
  AND e.category IN (
    'RECOGNITION CEREMONY',
    'STUDENT INTEGRATION',
    'CLIENT TRANSPORTATION',
    'CLIENT LAPTOP'
  );

