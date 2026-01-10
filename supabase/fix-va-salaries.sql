-- Update VA employee salaries to match Excel values exactly
-- Excel total from column 6 "Special adjustment XXX % Salary Adjustment"
-- Total: $2,673,471.52 (42 employees)
-- All values rounded to 4 decimal places to match numeric(15,4) column type

-- First, check current state
SELECT 
  'Before update' as status,
  COUNT(*) as employee_count,
  SUM(annual_salary) as total_salary,
  ROUND(SUM(annual_salary)::numeric, 2) as total_rounded
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'VA' AND e.status != 'tbh';

-- Update all VA employee salaries to match Excel values exactly
UPDATE employees e
SET annual_salary = CASE
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Florance'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Ahmadi'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 59509.6590::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Yama'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Ahmadi'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 65460.3893::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Mohammad'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Akbar Akbar'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Atakhleti'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Alemseged'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 70070.1914::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Ajmal'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Amiri'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 54847.5824::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Emebet'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Ashagre'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 72100.1154::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Freshta'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Atmar'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Kamela'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Azizi'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 60332.1264::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Tahera'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Azizi'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 59997.4835::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Mohammad'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Baig'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 66950.0000::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Esra'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Bayrakthar'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 87749.0619::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Faye'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Biggs'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 64659.5602::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Barbara'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Callen'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 66950.0000::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Jean'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Cyprien'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 59509.4448::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Akilu'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Debalkew'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Konjit'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Edward'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 66968.8531::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Bob'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Elston'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 66950.0000::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Iryna'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Gaiduk'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 65460.3893::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Helen'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Gebru'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 77249.9951::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Najia'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Hashimzada'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 65817.0989::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Hamdard'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Hashmatullah'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 66950.0000::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Eftihia'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Ionnidou'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 69107.6110::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Brishna'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Katawazai'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Jehanzeb'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Louis'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 82399.9176::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Jamal'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Noori'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 60332.1264::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Parwana'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Noori'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Manizha'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Nuzhat'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 70039.9835::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Abeer'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Omer'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Earnest'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Overton'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Mariela'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Peneranda'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Laryssa'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Romenko'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 59509.6590::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Aemal'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Sanjeeda'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 56649.9835::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Ahmed'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Seyar Auobi'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Ziai'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Shafiullah'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 66950.0000::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Viktoria'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Sutanovska'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 71301.8571::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Ramaswami'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Swaminathan Abirami'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 54847.5824::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Morgan'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Swindall'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 56649.9835::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Shakil'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Tabassum'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 98785.8498::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Taylor'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Woody'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 52500.0840::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Ferdawok'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Woyesa'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 60880.7950::numeric(15,4)
  WHEN (LOWER(TRIM(e.first_name)) = LOWER(TRIM('Firdus')) OR LOWER(TRIM(e.first_name)) = LOWER(TRIM('Firdus (P/T)')))
    AND (LOWER(TRIM(e.last_name)) LIKE LOWER(TRIM('%Yusuf%')))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 35992.3200::numeric(15,4)
  WHEN LOWER(TRIM(e.first_name)) = LOWER(TRIM('Sarah'))
    AND LOWER(TRIM(e.last_name)) = LOWER(TRIM('Zullo'))
    AND e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  THEN 107491.0637::numeric(15,4)
  ELSE e.annual_salary
END
WHERE e.location_id IN (SELECT id FROM locations WHERE code = 'VA')
  AND e.status != 'tbh';

-- Verify the total after update
SELECT 
  'After update' as status,
  COUNT(*) as employee_count,
  SUM(annual_salary) as total_salary,
  ROUND(SUM(annual_salary)::numeric, 2) as total_rounded
FROM employees e
LEFT JOIN locations location ON e.location_id = location.id
WHERE location.code = 'VA' AND e.status != 'tbh';

-- Show individual salaries for verification
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
