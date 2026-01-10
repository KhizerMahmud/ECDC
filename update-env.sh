#!/bin/bash

# Script to update .env.local with Supabase credentials
# Usage: ./update-env.sh

echo "=========================================="
echo "Supabase Environment Variables Setup"
echo "=========================================="
echo ""
echo "You need to get these values from your Supabase dashboard:"
echo "1. Go to https://supabase.com and log in"
echo "2. Select your project"
echo "3. Go to Settings > API"
echo "4. Copy the 'Project URL' and 'anon public' key"
echo ""
read -p "Enter your Supabase Project URL (e.g., https://xxxxx.supabase.co): " SUPABASE_URL
read -p "Enter your Supabase Anon Key: " SUPABASE_ANON_KEY

# Validate URL format
if [[ ! $SUPABASE_URL =~ ^https://.*\.supabase\.co$ ]]; then
  echo "⚠️  Warning: URL doesn't match expected format (https://xxxxx.supabase.co)"
  read -p "Continue anyway? (y/n): " confirm
  if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
  fi
fi

# Create/update .env.local
cat > .env.local << EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
EOF

echo ""
echo "✅ Updated .env.local file!"
echo ""
echo "Next steps:"
echo "1. Restart your dev server (Ctrl+C, then 'npm run dev')"
echo "2. The errors should be resolved"
echo ""

