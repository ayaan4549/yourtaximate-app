#!/bin/bash
# Run this ONCE on your local machine before building:
#   chmod +x scripts/setup-env.sh && ./scripts/setup-env.sh

if [ -f ".env" ]; then
  echo ".env already exists — skipping."
  exit 0
fi

cat > .env << 'EOF'
# ── Supabase (required — your live project) ───────────────────────────────────
VITE_SUPABASE_URL=https://vhvssujjuwjkgkweytct.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZodnNzdWpqdXdqa2drd2V5dGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMTYxODEsImV4cCI6MjA3NDg5MjE4MX0.r-KoAI3sI-r2yoeeKDNJA40QvX4Am5wAbPKaPU9nFUI

# ── Optional — leave blank if not using ──────────────────────────────────────
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
EOF

echo ".env created successfully."
