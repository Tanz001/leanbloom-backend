-- Additive migration: affiliate portal users
-- Run if 001_schema was applied before affiliate_users existed

CREATE TABLE IF NOT EXISTS affiliate_users (
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
