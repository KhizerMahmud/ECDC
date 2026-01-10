-- Find MD salary mismatch
-- Excel total: $1,314,788.74 (23 employees)
-- Site total: $1,314,788.70
-- Difference: $0.04
-- 
-- Excel salaries (from column 6 "Special adjustment XXX % Salary Adjustment"):
-- 52,500.08, 52,500.08, 71,301.86, 70,039.98, 52,500.08, 65,460.39,
-- 54,847.58, 60,332.13, 37,492.00, 52,500.08, 54,847.58, 66,950.00,
-- 52,500.08, 52,500.08, 58,709.90, 52,500.08, 54,847.58, 71,301.86,
-- 52,500.08, 52,500.08, 61,800.10, 54,847.58, 59,509.44
-- Total: 1,314,788.74

-- First, let's see the total from database
SELECT 
  location.code,
  COUNT(*) as employee_count,
  SUM(e.annual_salary) as total_salary,
  ROUND(SUM(e.annual_salary)::numeric, 2) as total_rounded,
  ROUND(SUM(e.annual_salary)::numeric, 2) - 1314788.74 as difference_from_excel
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'MD' 
  AND e.status != 'tbh'
GROUP BY location.code;

-- Now let's see individual salaries to find which one might be off
-- List all MD employees with their salaries (ordered by salary to make it easier to spot)
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.annual_salary,
  ROUND(e.annual_salary::numeric, 2) as salary_rounded,
  location.code
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'MD' 
  AND e.status != 'tbh'
ORDER BY e.annual_salary DESC;

-- Check if any salary has fractional cents beyond 2 decimals that might cause rounding issues
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.annual_salary,
  e.annual_salary - TRUNC(e.annual_salary, 2) as fractional_cents,
  location.code
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'MD' 
  AND e.status != 'tbh'
  AND (e.annual_salary - TRUNC(e.annual_salary, 2)) > 0.0001
ORDER BY e.annual_salary DESC;

-- Calculate running total to see where the discrepancy might be
WITH md_employees AS (
  SELECT 
    e.id,
    e.first_name,
    e.last_name,
    e.annual_salary,
    location.code
  FROM employees e
  LEFT JOIN locations location ON e.location_id = location.id
  WHERE location.code = 'MD' 
    AND e.status != 'tbh'
  ORDER BY e.last_name, e.first_name
),
running_totals AS (
  SELECT 
    *,
    SUM(annual_salary) OVER (ORDER BY last_name, first_name ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total
  FROM md_employees
)
SELECT 
  first_name,
  last_name,
  annual_salary,
  running_total,
  ROUND(running_total::numeric, 2) as running_total_rounded
FROM running_totals
ORDER BY last_name, first_name;

