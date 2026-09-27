-- Product catalog images (Multer-stored files → image_url)
-- Run against existing leanbloom DB after 001–003.

ALTER TABLE products
  ADD COLUMN image_url VARCHAR(500) NULL AFTER description;
