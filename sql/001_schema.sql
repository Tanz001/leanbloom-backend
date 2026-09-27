-- LeanBloom Master Admin — Core Schema (MySQL 8+)
-- Run order: 001_schema.sql → 002_seed.sql
-- (If schema already applied, also run 003_affiliate_users.sql)
-- Create DB first: CREATE DATABASE leanbloom CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- Master Admin users
-- ---------------------------------------------------------------------------

CREATE TABLE admin_users (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('master_admin', 'admin', 'support') NOT NULL DEFAULT 'admin',
  status          ENUM('Active', 'Invited', 'Suspended') NOT NULL DEFAULT 'Invited',
  avatar_url      TEXT NULL,
  last_login_at   DATETIME(3) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_admin_users_email (email),
  KEY idx_admin_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Affiliates + branding
-- ---------------------------------------------------------------------------

CREATE TABLE affiliates (
  id                CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(100) NOT NULL,
  contact_name      VARCHAR(150) NOT NULL,
  contact_email     VARCHAR(255) NOT NULL,
  contact_phone     VARCHAR(50) NULL,
  address           TEXT NULL,
  status            ENUM('Active', 'Pending', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Pending',
  default_markup    DECIMAL(5, 2) NOT NULL DEFAULT 20.00,
  commission_rate   DECIMAL(5, 2) NOT NULL DEFAULT 15.00,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_affiliates_slug (slug),
  KEY idx_affiliates_status (status),
  CONSTRAINT chk_affiliates_markup CHECK (default_markup >= 0),
  CONSTRAINT chk_affiliates_commission CHECK (commission_rate >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE affiliate_branding (
  id                  CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  affiliate_id        CHAR(36) NOT NULL,
  primary_color       VARCHAR(20) NOT NULL DEFAULT '#173B72',
  secondary_color     VARCHAR(20) NOT NULL DEFAULT '#4FAF4A',
  logo_url            TEXT NULL,
  tagline             VARCHAR(255) NULL,
  font_family         ENUM('Plus Jakarta Sans', 'Inter', 'Outfit', 'DM Sans', 'Playfair Display')
                        NOT NULL DEFAULT 'Plus Jakarta Sans',
  border_radius       ENUM('rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full')
                        NOT NULL DEFAULT 'rounded-xl',
  header_theme        ENUM('white', 'navy', 'dark', 'cream') NOT NULL DEFAULT 'navy',
  portal_title        VARCHAR(200) NULL,
  welcome_message     TEXT NULL,
  support_email       VARCHAR(255) NULL,
  support_phone       VARCHAR(50) NULL,
  hide_powered_by     TINYINT(1) NOT NULL DEFAULT 0,
  trust_badge_text    VARCHAR(255) NULL,
  clinical_partner_note TEXT NULL,
  business_hours      VARCHAR(200) NULL,
  terms_url           TEXT NULL,
  privacy_url         TEXT NULL,
  custom_css          TEXT NULL,
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_affiliate_branding_affiliate (affiliate_id),
  CONSTRAINT fk_branding_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Affiliate portal users (login for affiliate dashboard)
-- ---------------------------------------------------------------------------

CREATE TABLE affiliate_users (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  affiliate_id    CHAR(36) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role            ENUM('owner', 'staff') NOT NULL DEFAULT 'owner',
  status          ENUM('Active', 'Invited', 'Suspended') NOT NULL DEFAULT 'Invited',
  avatar_url      TEXT NULL,
  last_login_at   DATETIME(3) NULL,
  last_login_ip   VARCHAR(45) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_affiliate_users_email (email),
  KEY idx_affiliate_users_affiliate (affiliate_id),
  KEY idx_affiliate_users_status (status),
  CONSTRAINT fk_affiliate_users_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Domains + DNS
-- ---------------------------------------------------------------------------

CREATE TABLE domains (
  id                CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  affiliate_id      CHAR(36) NOT NULL,
  domain            VARCHAR(255) NOT NULL,
  type              ENUM('Custom Domain', 'Platform Subdomain') NOT NULL,
  target            VARCHAR(255) NOT NULL,
  status            ENUM('Active', 'Pending DNS', 'SSL Generating', 'Configuration Error')
                      NOT NULL DEFAULT 'Pending DNS',
  ssl_status        ENUM('Valid', 'Issuing', 'Expiring Soon', 'Failed') NOT NULL DEFAULT 'Issuing',
  ssl_expiry        DATE NULL,
  is_primary        TINYINT(1) NOT NULL DEFAULT 0,
  hsts_enabled      TINYINT(1) NOT NULL DEFAULT 1,
  edge_latency_ms   INT NULL,
  last_verified_at  DATETIME(3) NULL,
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_domains_domain (domain),
  KEY idx_domains_affiliate (affiliate_id),
  KEY idx_domains_status (status),
  CONSTRAINT fk_domains_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dns_records (
  id            CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  domain_id     CHAR(36) NOT NULL,
  type          ENUM('CNAME', 'A', 'TXT') NOT NULL,
  host          VARCHAR(255) NOT NULL,
  value         TEXT NOT NULL,
  status        ENUM('Verified', 'Pending', 'Error') NOT NULL DEFAULT 'Pending',
  ttl           VARCHAR(20) NOT NULL DEFAULT '3600',
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_dns_records_domain (domain_id),
  CONSTRAINT fk_dns_domain
    FOREIGN KEY (domain_id) REFERENCES domains (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Catalog: products + per-affiliate pricing
-- ---------------------------------------------------------------------------

CREATE TABLE products (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name            VARCHAR(200) NOT NULL,
  category        ENUM('Medical Program', 'Telehealth Consult', 'Prescription Refill', 'Wellness Pack') NOT NULL,
  description     TEXT NULL,
  image_url       VARCHAR(500) NULL,
  base_price      DECIMAL(12, 2) NOT NULL,
  minimum_price   DECIMAL(12, 2) NOT NULL,
  status          ENUM('Active', 'Draft', 'Archived') NOT NULL DEFAULT 'Draft',
  stock_status    ENUM('In Stock', 'Compounding', 'Backorder') NOT NULL DEFAULT 'In Stock',
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_products_status (status),
  KEY idx_products_category (category),
  CONSTRAINT chk_products_base_price CHECK (base_price >= 0),
  CONSTRAINT chk_products_min_price CHECK (minimum_price >= 0),
  CONSTRAINT chk_product_min_gte_base CHECK (minimum_price >= base_price)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE affiliate_product_prices (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  affiliate_id    CHAR(36) NOT NULL,
  product_id      CHAR(36) NOT NULL,
  selling_price   DECIMAL(12, 2) NOT NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_aff_product (affiliate_id, product_id),
  KEY idx_aff_prices_affiliate (affiliate_id),
  KEY idx_aff_prices_product (product_id),
  CONSTRAINT chk_aff_selling_price CHECK (selling_price >= 0),
  CONSTRAINT fk_aff_prices_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE CASCADE,
  CONSTRAINT fk_aff_prices_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Patients + Orders
-- ---------------------------------------------------------------------------

CREATE TABLE patients (
  id                  CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  affiliate_id        CHAR(36) NOT NULL,
  name                VARCHAR(150) NOT NULL,
  email               VARCHAR(255) NOT NULL,
  phone               VARCHAR(50) NULL,
  status              ENUM('Active', 'Pending Intake', 'Inactive') NOT NULL DEFAULT 'Pending Intake',
  active_program      VARCHAR(200) NULL,
  prescriptions_count INT NOT NULL DEFAULT 0,
  last_activity_at    DATETIME(3) NULL,
  joined_at           DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_patients_affiliate_email (affiliate_id, email),
  KEY idx_patients_affiliate (affiliate_id),
  KEY idx_patients_status (status),
  KEY idx_patients_email (email),
  CONSTRAINT fk_patients_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE orders (
  id                CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  order_number      VARCHAR(50) NOT NULL,
  patient_id        CHAR(36) NOT NULL,
  affiliate_id      CHAR(36) NOT NULL,
  product_id        CHAR(36) NULL,
  product_name      VARCHAR(200) NOT NULL,
  amount            DECIMAL(12, 2) NOT NULL,
  status            ENUM('Completed', 'Processing', 'Pending', 'Cancelled', 'Refunded')
                      NOT NULL DEFAULT 'Pending',
  payment_method    VARCHAR(100) NULL,
  shipping_status   ENUM('Delivered', 'In Transit', 'Fulfillment Queue', 'Pending Lab') NULL,
  ordered_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_orders_number (order_number),
  KEY idx_orders_affiliate (affiliate_id),
  KEY idx_orders_patient (patient_id),
  KEY idx_orders_status (status),
  KEY idx_orders_ordered_at (ordered_at),
  CONSTRAINT chk_orders_amount CHECK (amount >= 0),
  CONSTRAINT fk_orders_patient
    FOREIGN KEY (patient_id) REFERENCES patients (id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE RESTRICT,
  CONSTRAINT fk_orders_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Commissions + Payments
-- ---------------------------------------------------------------------------

CREATE TABLE commission_records (
  id                  CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  affiliate_id        CHAR(36) NOT NULL,
  period_start        DATE NOT NULL,
  period_end          DATE NOT NULL,
  orders_count        INT NOT NULL DEFAULT 0,
  gross_sales         DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  base_revenue        DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  markup_amount       DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  commission_earned   DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  amount_payable      DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  payment_status      ENUM('Paid', 'Pending', 'Processing') NOT NULL DEFAULT 'Pending',
  payout_date         DATE NULL,
  created_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at          DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_commissions_affiliate (affiliate_id),
  KEY idx_commissions_status (payment_status),
  CONSTRAINT fk_commissions_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payment_transactions (
  id                CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  order_id          CHAR(36) NULL,
  affiliate_id      CHAR(36) NOT NULL,
  gross_amount      DECIMAL(14, 2) NOT NULL,
  commission        DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  net_leanbloom     DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  status            ENUM('Paid', 'Pending', 'Processing', 'Failed', 'Refunded')
                      NOT NULL DEFAULT 'Pending',
  method            ENUM('Stripe Direct', 'ACH Transfer', 'Credit Card', 'Wire') NOT NULL,
  transaction_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at        DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_payments_affiliate (affiliate_id),
  KEY idx_payments_order (order_id),
  KEY idx_payments_status (status),
  CONSTRAINT chk_payments_gross CHECK (gross_amount >= 0),
  CONSTRAINT fk_payments_order
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- Audit + Notifications + Platform settings
-- ---------------------------------------------------------------------------

CREATE TABLE audit_logs (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  admin_user_id   CHAR(36) NULL,
  admin_name      VARCHAR(150) NOT NULL,
  admin_email     VARCHAR(255) NOT NULL,
  action          VARCHAR(255) NOT NULL,
  target          VARCHAR(255) NOT NULL,
  old_value       TEXT NULL,
  new_value       TEXT NULL,
  category        ENUM('Pricing', 'Affiliate', 'Product', 'Security', 'Payment', 'System') NOT NULL,
  ip_address      VARCHAR(45) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_audit_logs_admin (admin_user_id),
  KEY idx_audit_logs_category (category),
  KEY idx_audit_logs_created (created_at),
  CONSTRAINT fk_audit_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  title           VARCHAR(255) NOT NULL,
  description     TEXT NOT NULL,
  severity        ENUM('Information', 'Success', 'Warning', 'Critical') NOT NULL DEFAULT 'Information',
  category        ENUM('Affiliate', 'Order', 'Payment', 'System', 'Inventory') NOT NULL DEFAULT 'System',
  is_read         TINYINT(1) NOT NULL DEFAULT 0,
  admin_user_id   CHAR(36) NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_notifications_admin (admin_user_id),
  KEY idx_notifications_read (is_read),
  CONSTRAINT fk_notifications_admin
    FOREIGN KEY (admin_user_id) REFERENCES admin_users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE platform_settings (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  setting_key     VARCHAR(100) NOT NULL,
  setting_value   JSON NOT NULL,
  description     TEXT NULL,
  updated_by      CHAR(36) NULL,
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_platform_settings_key (setting_key),
  CONSTRAINT fk_settings_admin
    FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
