-- Add branding columns to institutions for white-label support
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS brand_primary_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_secondary_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_accent_color TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_logo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS brand_platform_name TEXT DEFAULT NULL;