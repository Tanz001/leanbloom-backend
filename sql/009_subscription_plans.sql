-- Subscription plans + affiliate subscriptions (manual monthly renew via PayPal)

CREATE TABLE IF NOT EXISTS subscription_plans (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  name            VARCHAR(150) NOT NULL,
  description     TEXT NULL,
  price           DECIMAL(12, 2) NOT NULL,
  billing_period  ENUM('monthly') NOT NULL DEFAULT 'monthly',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY idx_plans_active (is_active),
  CONSTRAINT chk_plans_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS affiliate_subscriptions (
  id                    CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  affiliate_id          CHAR(36) NOT NULL,
  plan_id               CHAR(36) NOT NULL,
  plan_name             VARCHAR(150) NOT NULL,
  plan_price            DECIMAL(12, 2) NOT NULL,
  status                ENUM('pending_payment', 'active', 'expired', 'cancelled') NOT NULL DEFAULT 'pending_payment',
  starts_at             DATETIME(3) NULL,
  ends_at               DATETIME(3) NULL,
  cancelled_at          DATETIME(3) NULL,
  paypal_order_id       VARCHAR(100) NULL,
  paypal_capture_id     VARCHAR(100) NULL,
  last_payment_at       DATETIME(3) NULL,
  created_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at            DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_sub_affiliate (affiliate_id),
  KEY idx_sub_status (status),
  KEY idx_sub_plan (plan_id),
  KEY idx_sub_ends (ends_at),
  CONSTRAINT fk_sub_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE CASCADE,
  CONSTRAINT fk_sub_plan
    FOREIGN KEY (plan_id) REFERENCES subscription_plans (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default single plan (~$199/mo as discussed)
INSERT INTO subscription_plans (id, name, description, price, billing_period, is_active, sort_order)
SELECT UUID(), 'LeanBloom Partner', 'White-label clinic portal, storefront, and patient tools. Manual monthly renewal via PayPal.', 199.00, 'monthly', 1, 0
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans LIMIT 1);
