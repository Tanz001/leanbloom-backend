-- LeanBloom Master Admin — Seed data (MySQL)
-- Prerequisite: 001_schema.sql (includes affiliate_users)
-- Admin: john.admin@leanbloom.com / MasterAdmin2026!
-- Affiliate: contact@wellnesspartner.com / PartnerSecure2026!

INSERT INTO admin_users (id, name, email, password_hash, role, status, last_login_at)
VALUES (
  'a0000000-0000-4000-8000-000000000001',
  'John Admin',
  'john.admin@leanbloom.com',
  '$2b$10$j2K9bdm3WwV13KkClH0NwOCYZCRoiOiiZnn3jaUo7MhYa3Y/nSsCu',
  'master_admin',
  'Active',
  NOW(3)
);

INSERT INTO affiliates (
  id, name, slug, contact_name, contact_email, contact_phone,
  status, default_markup, commission_rate
) VALUES (
  'b0000000-0000-4000-8000-000000000001',
  'Wellness Partner LLC',
  'wellness-partner',
  'Wellness Partner LLC',
  'contact@wellnesspartner.com',
  '+1 (555) 100-2000',
  'Active',
  25.00,
  15.00
);

INSERT INTO affiliate_branding (
  affiliate_id, primary_color, secondary_color, portal_title, support_email,
  tagline, welcome_message, support_phone, trust_badge_text
) VALUES (
  'b0000000-0000-4000-8000-000000000001',
  '#173B72',
  '#4FAF4A',
  'Wellness Partner Patient Portal',
  'contact@wellnesspartner.com',
  'Physician-guided wellness & metabolic programs',
  'Browse clinician-reviewed protocols tailored for your clinic. Complete intake and clinical review through LeanBloom / MyDose.',
  '+1 (555) 100-2000',
  'Licensed Telehealth Partner • Physician Network'
);

INSERT INTO domains (
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

INSERT INTO affiliate_users (
  id, affiliate_id, name, email, password_hash, role, status, last_login_at
) VALUES (
  'c0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'Wellness Partner LLC',
  'contact@wellnesspartner.com',
  '$2b$10$xlDRNb3NAItfCSHoPSzNZO0YppV3a7GebB7IXVqxEgbo6vDDn86lm',
  'owner',
  'Active',
  NOW(3)
);

INSERT INTO platform_settings (setting_key, setting_value, description, updated_by)
VALUES
  (
    'platform.name',
    JSON_QUOTE('LeanBloom'),
    'Display name for the master admin console',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    'platform.default_commission_rate',
    CAST(15 AS JSON),
    'Default affiliate commission rate (%)',
    'a0000000-0000-4000-8000-000000000001'
  ),
  (
    'platform.subdomain_base',
    JSON_QUOTE('leanbloom.com'),
    'Base domain for platform subdomains',
    'a0000000-0000-4000-8000-000000000001'
  );
