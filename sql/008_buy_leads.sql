-- Buy Now email captures from storefront
CREATE TABLE IF NOT EXISTS buy_leads (
  id              CHAR(36) NOT NULL PRIMARY KEY DEFAULT (UUID()),
  email           VARCHAR(255) NOT NULL,
  product_id      CHAR(36) NOT NULL,
  product_name    VARCHAR(200) NOT NULL,
  affiliate_id    CHAR(36) NOT NULL,
  affiliate_name  VARCHAR(200) NOT NULL,
  created_at      DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_buy_leads_affiliate (affiliate_id),
  KEY idx_buy_leads_product (product_id),
  KEY idx_buy_leads_email (email),
  KEY idx_buy_leads_created (created_at),
  CONSTRAINT fk_buy_leads_affiliate
    FOREIGN KEY (affiliate_id) REFERENCES affiliates (id) ON DELETE CASCADE,
  CONSTRAINT fk_buy_leads_product
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
