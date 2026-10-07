-- Add optional external buy / checkout URL per product (storefront "Get started" opens this)
ALTER TABLE products
  ADD COLUMN buy_url VARCHAR(500) NULL AFTER image_url;
