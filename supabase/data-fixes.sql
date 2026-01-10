-- ============================================================================
-- Data Fixes and Maintenance Scripts
-- ============================================================================
-- This file contains one-time data fixes, maintenance queries, and migrations
-- Run these scripts as needed to fix data issues, update assignments, or migrate data
-- ============================================================================
--
-- IMPORTANT SALARY STORAGE NOTES:
-- - annual_salary is stored as numeric(15, 4) with 4 decimal precision (for exact Excel values)
-- - annual_salary should be the source "New Salary" value from Excel (not calculated)
-- - hourly_rate is automatically calculated FROM annual_salary (one-way: salary -> rate)
-- - NEVER calculate annual_salary from hourly_rate * 2080 (rounding errors will occur)
-- - Total salaries should always sum stored annual_salary values directly
-- - Display should show 2 decimal places, but storage uses 4 decimals for precision
-- ============================================================================

-- ============================================================================
-- MIGRATION: Update hourly_rate to 4 decimal places
-- ============================================================================
-- Only needed if you have an existing database with hourly_rate numeric(10, 2)
-- If using budget-schema.sql, the schema already includes numeric(10, 4)
-- ============================================================================

-- Update the column type to support 4 decimal places (only if needed)
-- Uncomment if migrating an existing database:
/*
ALTER TABLE public.employees 
ALTER COLUMN hourly_rate TYPE numeric(10, 4);

-- Update the calculate_hourly_rate function to return 4 decimal places
CREATE OR REPLACE FUNCTION calculate_hourly_rate(annual_salary numeric)
RETURNS numeric AS $$
BEGIN
  -- Assuming 2080 hours per year (40 hours/week * 52 weeks)
  RETURN round((annual_salary / 2080)::numeric, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Recalculate hourly rates for all employees to ensure 4 decimal precision
UPDATE public.employees
SET hourly_rate = calculate_hourly_rate(annual_salary)
WHERE annual_salary > 0;
*/

-- ============================================================================
-- 0. Update Funder Descriptions
-- ============================================================================
-- Updates funder descriptions with full names

UPDATE public.funders
SET description = 'Maryland Office for Refugees and Asylees'
WHERE code = 'MORA';

UPDATE public.funders
SET description = 'Virginia Foundation for Healthy Youth'
WHERE code = 'VFHY';

UPDATE public.funders
SET description = 'Domestic Violence'
WHERE code = 'DV';

UPDATE public.funders
SET description = 'RACE to Rebuilding Trust and Community'
WHERE code = 'NOFO';

-- Clear "Funder" from descriptions that don't have proper full names
-- For funders without specific descriptions, set description to null so code is shown instead
UPDATE public.funders
SET description = NULL
WHERE (description LIKE '% Funder' OR description LIKE '%Funder')
  AND code NOT IN ('MORA', 'VFHY', 'DV', 'NOFO', 'MG');

-- Verify updates
SELECT code, name, description
FROM public.funders
WHERE code IN ('MORA', 'VFHY', 'DV', 'NOFO', 'R&P', 'TVAP', 'VOCA', 'AFHS', 'ONA', 'PC')
ORDER BY code;

-- ============================================================================
-- 1. Assign MORA Budgets
-- ============================================================================
-- Assigns the correct programs to MORA funder
-- Expected programs:
--   2032 RYMP
--   5051 SOR
--   5052 ECMP
--   5059 RSS
--   5247 RTCA FY 26
--   5212 RTCA FY 25
--   5248 CMF #2 Jan - June
--   5196 ARSS
-- (Note: User mentioned 9 programs but listed 8 - verify which is the 9th)

DO $$
DECLARE
    mora_funder_id uuid;
BEGIN
    -- Get MORA funder ID
    SELECT id INTO mora_funder_id
    FROM public.funders
    WHERE code = 'MORA';
    
    IF mora_funder_id IS NULL THEN
        RAISE EXCEPTION 'MORA funder not found. Please create it first.';
    END IF;
    
    -- Update budgets to assign them to MORA
    -- Note: Budget numbers may end in -30 (VA) or -33 (MD)
    UPDATE public.budgets
    SET funder_id = mora_funder_id
    WHERE budget_number LIKE '2032-%'  -- RYMP
       OR budget_number LIKE '5051-%'  -- SOR
       OR budget_number LIKE '5052-%'  -- ECMP
       OR budget_number LIKE '5059-%'  -- RSS
       OR budget_number LIKE '5247-%'  -- RTCA FY 26
       OR budget_number LIKE '5212-%'  -- RTCA FY 25
       OR budget_number LIKE '5248-%'  -- CMF #2 Jan - June
       OR budget_number LIKE '5196-%'; -- ARSS
    
    RAISE NOTICE 'Updated budgets assigned to MORA funder (ID: %)', mora_funder_id;
END $$;

-- Verify MORA assignments
SELECT 
  b.budget_number,
  b.name,
  f.code as funder_code,
  f.name as funder_name
FROM public.budgets b
JOIN public.funders f ON b.funder_id = f.id
WHERE f.code = 'MORA'
ORDER BY b.budget_number;

-- Check budgets that should be MORA but aren't
SELECT 
  b.budget_number,
  b.name,
  b.funder_id,
  f.code as current_funder
FROM public.budgets b
LEFT JOIN public.funders f ON b.funder_id = f.id
WHERE b.budget_number IN ('2032-30', '2032-33', '5051-30', '5051-33', '5052-30', '5052-33', '5059-30', '5059-33', '5247-30', '5247-33', '5212-30', '5212-33', '5248-30', '5248-33', '5196-30', '5196-33')
  AND (f.code IS NULL OR f.code != 'MORA')
ORDER BY b.budget_number;

-- ============================================================================
-- 2. Remove AFHS from Budget 1060-30
-- ============================================================================
-- Removes AFHS funder assignment from budget 1060-30 (Food Security Arlington)
-- This budget should be under a different donor

UPDATE public.budgets
SET funder_id = NULL
WHERE budget_number = '1060-30';

-- Verify the update
SELECT 
  id,
  budget_number,
  name,
  funder_id,
  (SELECT code FROM public.funders WHERE id = budgets.funder_id) as funder_code
FROM public.budgets
WHERE budget_number = '1060-30';

-- ============================================================================
-- 3. Consolidate DV2 into DV
-- ============================================================================
-- Migrates all budgets from DV2 funder to DV funder, then deletes the DV2 funder
-- Since DV1 and DV2 are both under DV, DV2 should not be a separate funder

DO $$
DECLARE
    dv_funder_id uuid;
    dv2_funder_id uuid;
    budget_count integer;
BEGIN
    -- Get DV funder ID
    SELECT id INTO dv_funder_id
    FROM public.funders
    WHERE code = 'DV';
    
    -- Get DV2 funder ID
    SELECT id INTO dv2_funder_id
    FROM public.funders
    WHERE code = 'DV2';
    
    -- Check if both funders exist
    IF dv_funder_id IS NULL THEN
        RAISE EXCEPTION 'DV funder not found. Please create it first.';
    END IF;
    
    IF dv2_funder_id IS NULL THEN
        RAISE NOTICE 'DV2 funder not found. Nothing to migrate.';
        RETURN;
    END IF;
    
    -- Count budgets assigned to DV2
    SELECT COUNT(*) INTO budget_count
    FROM public.budgets
    WHERE funder_id = dv2_funder_id;
    
    RAISE NOTICE 'Found % budgets assigned to DV2 funder', budget_count;
    
    -- Migrate all budgets from DV2 to DV
    IF budget_count > 0 THEN
        UPDATE public.budgets
        SET funder_id = dv_funder_id
        WHERE funder_id = dv2_funder_id;
        
        RAISE NOTICE 'Migrated % budgets from DV2 to DV', budget_count;
    END IF;
    
    -- Delete the DV2 funder
    DELETE FROM public.funders
    WHERE id = dv2_funder_id;
    
    RAISE NOTICE 'Deleted DV2 funder';
END $$;

-- Verify the migration
SELECT 
    f.code AS funder_code,
    f.name AS funder_name,
    COUNT(b.id) AS budget_count
FROM public.funders f
LEFT JOIN public.budgets b ON b.funder_id = f.id
WHERE f.code IN ('DV', 'DV2')
GROUP BY f.code, f.name
ORDER BY f.code;

-- DV2 should not appear in the results above
SELECT code, name, description
FROM public.funders
WHERE code = 'DV2';
-- Should return 0 rows

