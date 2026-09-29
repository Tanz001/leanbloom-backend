-- Optional patch for existing DBs: platform subdomain + richer seed branding
-- Safe to re-run (INSERT IGNORE / UPDATE)

INSERT IGNORE INTO domains (
  id, affiliate_id, domain, type, target, status, ssl_status, is_primary, hsts_enabled, last_verified_at
) VALUES (
  'd0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'wellness-partner.leanbloom.health',
  'Platform Subdomain',
  'leanbloom.health',
  'Active',
  'Valid',
  1,
  1,
  NOW(3)
);

UPDATE affiliate_branding
SET
  tagline = COALESCE(NULLIF(tagline, ''), 'Physician-guided wellness & metabolic programs'),
  welcome_message = COALESCE(
    NULLIF(welcome_message, ''),
    'Browse clinician-reviewed protocols tailored for your clinic. Complete intake and clinical review through LeanBloom / MyDose.'
  ),
  support_phone = COALESCE(NULLIF(support_phone, ''), '+1 (555) 100-2000'),
  trust_badge_text = COALESCE(
    NULLIF(trust_badge_text, ''),
    'Licensed Telehealth Partner • Physician Network'
  ),
  primary_color = COALESCE(NULLIF(primary_color, ''), '#173B72'),
  secondary_color = COALESCE(NULLIF(secondary_color, ''), '#4FAF4A')
WHERE affiliate_id = 'b0000000-0000-4000-8000-000000000001';
