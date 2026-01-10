-- Insert all VA employees from Excel
-- Total: $2,673,471.52 (42 employees)
-- All values rounded to 4 decimal places to match numeric(15,4) column type

-- First, check current VA employees
SELECT 
  'Before insert' as status,
  COUNT(*) as employee_count,
  SUM(annual_salary) as total_salary,
  ROUND(SUM(annual_salary)::numeric, 2) as total_rounded
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'VA' AND e.status != 'tbh';

-- Insert all VA employees
INSERT INTO employees (first_name, last_name, annual_salary, location_id, status)
SELECT 
  first_name,
  last_name,
  annual_salary,
  (SELECT id FROM locations WHERE code = 'VA') as location_id,
  'active' as status
FROM (VALUES
  ('Florance', 'Ahmadi', 59509.6590::numeric(15,4)),
  ('Yama', 'Ahmadi', 65460.3893::numeric(15,4)),
  ('Mohammad', 'Akbar Akbar', 52500.0840::numeric(15,4)),
  ('Atakhleti', 'Alemseged', 70070.1914::numeric(15,4)),
  ('Ajmal', 'Amiri', 54847.5824::numeric(15,4)),
  ('Emebet', 'Ashagre', 72100.1154::numeric(15,4)),
  ('Freshta', 'Atmar', 52500.0840::numeric(15,4)),
  ('Kamela', 'Azizi', 60332.1264::numeric(15,4)),
  ('Tahera', 'Azizi', 59997.4835::numeric(15,4)),
  ('Mohammad', 'Baig', 66950.0000::numeric(15,4)),
  ('Esra', 'Bayrakthar', 87749.0619::numeric(15,4)),
  ('Faye', 'Biggs', 64659.5602::numeric(15,4)),
  ('Barbara', 'Callen', 66950.0000::numeric(15,4)),
  ('Jean', 'Cyprien', 59509.4448::numeric(15,4)),
  ('Akilu', 'Debalkew', 52500.0840::numeric(15,4)),
  ('Konjit', 'Edward', 66968.8531::numeric(15,4)),
  ('Bob', 'Elston', 66950.0000::numeric(15,4)),
  ('Iryna', 'Gaiduk', 65460.3893::numeric(15,4)),
  ('Helen', 'Gebru', 77249.9951::numeric(15,4)),
  ('Najia', 'Hashimzada', 65817.0989::numeric(15,4)),
  ('Hamdard', 'Hashmatullah', 66950.0000::numeric(15,4)),
  ('Eftihia', 'Ionnidou', 69107.6110::numeric(15,4)),
  ('Brishna', 'Katawazai', 52500.0840::numeric(15,4)),
  ('Jehanzeb', 'Louis', 82399.9176::numeric(15,4)),
  ('Jamal', 'Noori', 60332.1264::numeric(15,4)),
  ('Parwana', 'Noori', 52500.0840::numeric(15,4)),
  ('Manizha', 'Nuzhat', 70039.9835::numeric(15,4)),
  ('Abeer', 'Omer', 52500.0840::numeric(15,4)),
  ('Earnest', 'Overton', 52500.0840::numeric(15,4)),
  ('Mariela', 'Peneranda', 52500.0840::numeric(15,4)),
  ('Laryssa', 'Romenko', 59509.6590::numeric(15,4)),
  ('Aemal', 'Sanjeeda', 56649.9835::numeric(15,4)),
  ('Ahmed', 'Seyar Auobi', 52500.0840::numeric(15,4)),
  ('Ziai', 'Shafiullah', 66950.0000::numeric(15,4)),
  ('Viktoria', 'Sutanovska', 71301.8571::numeric(15,4)),
  ('Ramaswami', 'Swaminathan Abirami', 54847.5824::numeric(15,4)),
  ('Morgan', 'Swindall', 56649.9835::numeric(15,4)),
  ('Shakil', 'Tabassum', 98785.8498::numeric(15,4)),
  ('Taylor', 'Woody', 52500.0840::numeric(15,4)),
  ('Ferdawok', 'Woyesa', 60880.7950::numeric(15,4)),
  ('Firdus', 'Yusuf (P/T)', 35992.3200::numeric(15,4)),
  ('Sarah', 'Zullo', 107491.0637::numeric(15,4))
) AS va_emp(first_name, last_name, annual_salary)
WHERE NOT EXISTS (
  SELECT 1 FROM employees e
  INNER JOIN locations l ON e.location_id = l.id
  WHERE LOWER(TRIM(e.first_name)) = LOWER(TRIM(va_emp.first_name))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM(va_emp.last_name))
    AND l.code = 'VA'
);

-- Verify the total after insert
SELECT 
  'After insert' as status,
  COUNT(*) as employee_count,
  SUM(annual_salary) as total_salary,
  ROUND(SUM(annual_salary)::numeric, 2) as total_rounded
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'VA' AND e.status != 'tbh';

-- Show all VA employees for verification
SELECT 
  e.id,
  e.first_name,
  e.last_name,
  e.annual_salary,
  location.code
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'VA' AND e.status != 'tbh'
ORDER BY e.last_name, e.first_name;
