-- Storefront branding fields for patient-facing site
-- Run after 001–004.

ALTER TABLE affiliate_branding
  ADD COLUMN business_hours VARCHAR(200) NULL AFTER support_phone,
  ADD COLUMN trust_badge_text VARCHAR(255) NULL AFTER hide_powered_by,
  ADD COLUMN clinical_partner_note TEXT NULL AFTER trust_badge_text;
