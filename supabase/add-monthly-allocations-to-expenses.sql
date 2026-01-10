-- Add monthly_allocations JSONB column to expenses table
-- This stores monthly allocation breakdowns: { "2024-10": 100, "2024-11": 50, ... }
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'expenses' 
        AND column_name = 'monthly_allocations'
    ) THEN
        ALTER TABLE public.expenses 
        ADD COLUMN monthly_allocations jsonb default '{}'::jsonb;
        RAISE NOTICE 'Column monthly_allocations added to expenses table.';
    ELSE
        RAISE NOTICE 'Column monthly_allocations already exists in expenses table.';
    END IF;
END
$$;

