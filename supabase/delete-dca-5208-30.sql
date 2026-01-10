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
  AND UPPER(e.category) IN (
    'RECOGNITION CEREMONY',
    'STUDENT INTEGRATION',
    'CLIENT TRANSPORTATION',
    'CLIENT LAPTOP'
  );

-- Now delete them using the IDs we found (more reliable)
DELETE FROM expenses
WHERE id IN (
  SELECT e.id
  FROM expenses e
  JOIN budgets b ON e.budget_id = b.id
  WHERE b.budget_number = '5208-30'
    AND UPPER(e.category) IN (
      'RECOGNITION CEREMONY',
      'STUDENT INTEGRATION',
      'CLIENT TRANSPORTATION',
      'CLIENT LAPTOP'
    )
);

-- Verify deletion
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

