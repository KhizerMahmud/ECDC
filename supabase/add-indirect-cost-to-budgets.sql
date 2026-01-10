-- Add indirect_cost column to budgets table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'budgets' 
        AND column_name = 'indirect_cost'
    ) THEN
        ALTER TABLE public.budgets 
        ADD COLUMN indirect_cost numeric(15, 2) default null;
        RAISE NOTICE 'Column indirect_cost added to budgets table.';
    ELSE
        RAISE NOTICE 'Column indirect_cost already exists in budgets table.';
    END IF;
END
$$;

