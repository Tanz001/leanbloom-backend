import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  portal: z.enum(['admin', 'affiliate']).optional(),
});

export const affiliateSignupSchema = z.object({
  clinicName: z.string().min(2).max(200),
  ownerName: z.string().min(2).max(150),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  password: z.string().min(8).max(128),
  customDomain: z.string().max(255).optional().or(z.literal('')),
});

export const createAffiliateSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(100).optional().or(z.literal('')),
  contactName: z.string().min(2).max(150),
  contactEmail: z.string().email().max(255),
  contactPhone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  status: z.enum(['Active', 'Pending', 'Inactive', 'Suspended']).default('Active'),
  defaultMarkup: z.coerce.number().min(0).max(500).default(25),
  commissionRate: z.coerce.number().min(0).max(100).default(15),
  primaryColor: z.string().max(20).default('#173B72'),
  secondaryColor: z.string().max(20).default('#4FAF4A'),
  logoUrl: z.string().max(500).optional().nullable(),
  /** Storefront branding */
  portalTitle: z.string().max(200).optional().or(z.literal('')),
  tagline: z.string().max(255).optional().or(z.literal('')),
  welcomeMessage: z.string().max(2000).optional().or(z.literal('')),
  supportEmail: z.string().email().max(255).optional().or(z.literal('')),
  supportPhone: z.string().max(50).optional().or(z.literal('')),
  businessHours: z.string().max(200).optional().or(z.literal('')),
  hidePoweredBy: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0', 'on', 'off'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return false;
      if (typeof v === 'boolean') return v;
      return v === 'true' || v === '1' || v === 'on';
    }),
  trustBadgeText: z.string().max(255).optional().or(z.literal('')),
  clinicalPartnerNote: z.string().max(2000).optional().or(z.literal('')),
  customDomain: z.string().max(255).optional().or(z.literal('')),
  fontFamily: z
    .enum(['Plus Jakarta Sans', 'Inter', 'Outfit', 'DM Sans', 'Playfair Display'])
    .optional(),
  borderRadius: z
    .enum(['rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'])
    .optional(),
  headerTheme: z.enum(['white', 'navy', 'dark', 'cream']).optional(),
  /** Master admin sets the affiliate owner password */
  ownerPassword: z.string().min(8).max(128),
});

export const updateAffiliateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  contactName: z.string().min(2).max(150).optional(),
  contactEmail: z.string().email().max(255).optional(),
  contactPhone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  status: z.enum(['Active', 'Pending', 'Inactive', 'Suspended']).optional(),
  defaultMarkup: z.coerce.number().min(0).max(500).optional(),
  commissionRate: z.coerce.number().min(0).max(100).optional(),
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  logoUrl: z.string().max(500).optional().nullable(),
  portalTitle: z.string().max(200).optional().nullable(),
  tagline: z.string().max(255).optional().nullable(),
  welcomeMessage: z.string().max(2000).optional().nullable(),
  supportEmail: z.string().email().max(255).optional().nullable().or(z.literal('')),
  supportPhone: z.string().max(50).optional().nullable(),
  businessHours: z.string().max(200).optional().nullable(),
  hidePoweredBy: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0', 'on', 'off'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === 'boolean') return v;
      return v === 'true' || v === '1' || v === 'on';
    }),
  trustBadgeText: z.string().max(255).optional().nullable(),
  clinicalPartnerNote: z.string().max(2000).optional().nullable(),
  fontFamily: z
    .enum(['Plus Jakarta Sans', 'Inter', 'Outfit', 'DM Sans', 'Playfair Display'])
    .optional(),
  borderRadius: z
    .enum(['rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'])
    .optional(),
  headerTheme: z.enum(['white', 'navy', 'dark', 'cream']).optional(),
  customDomain: z.string().max(255).optional().nullable().or(z.literal('')),
  /** Optional: reset affiliate owner password */
  ownerPassword: z.string().min(8).max(128).optional(),
});

export const createDomainSchema = z.object({
  affiliateId: z.string().uuid(),
  domain: z.string().min(3).max(255),
  type: z.enum(['Custom Domain', 'Platform Subdomain']).default('Custom Domain'),
  target: z.string().max(255).optional().or(z.literal('')),
  isPrimary: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return true;
      if (typeof v === 'boolean') return v;
      return v === 'true' || v === '1';
    }),
});

export const updateDomainSchema = z.object({
  isPrimary: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === 'boolean') return v;
      return v === 'true' || v === '1';
    }),
  status: z
    .enum(['Active', 'Pending DNS', 'SSL Generating', 'Configuration Error'])
    .optional(),
  hstsEnabled: z
    .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (typeof v === 'boolean') return v;
      return v === 'true' || v === '1';
    }),
});

export type CreateDomainInput = z.infer<typeof createDomainSchema>;
export type UpdateDomainInput = z.infer<typeof updateDomainSchema>;

export const storefrontCheckoutSchema = z.object({
  affiliateId: z.string().uuid(),
  fullName: z.string().min(2).max(150),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  state: z.string().max(50).optional().or(z.literal('')),
  shippingAddress: z
    .object({
      addressLine1: z.string().max(255).optional().or(z.literal('')),
      addressLine2: z.string().max(255).optional().or(z.literal('')),
      city: z.string().max(100).optional().or(z.literal('')),
      state: z.string().max(50).optional().or(z.literal('')),
      zipCode: z.string().max(20).optional().or(z.literal('')),
    })
    .optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().min(1).max(20).default(1),
      })
    )
    .min(1),
});

export type StorefrontCheckoutInput = z.infer<typeof storefrontCheckoutSchema>;

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  category: z.enum([
    'Medical Program',
    'Telehealth Consult',
    'Prescription Refill',
    'Wellness Pack',
  ]),
  description: z.string().max(5000).optional().or(z.literal('')),
  imageUrl: z.string().max(500).optional().nullable(),
  basePrice: z.coerce.number().min(0),
  minimumPrice: z.coerce.number().min(0),
  status: z.enum(['Active', 'Draft', 'Archived']).default('Draft'),
  stockStatus: z
    .enum(['In Stock', 'Compounding', 'Backorder'])
    .default('In Stock'),
}).refine((d) => d.minimumPrice >= d.basePrice, {
  message: 'Minimum price must be >= base price',
  path: ['minimumPrice'],
});

export const updateProductSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  category: z
    .enum([
      'Medical Program',
      'Telehealth Consult',
      'Prescription Refill',
      'Wellness Pack',
    ])
    .optional(),
  description: z.string().max(5000).optional().nullable(),
  imageUrl: z.string().max(500).optional().nullable(),
  basePrice: z.coerce.number().min(0).optional(),
  minimumPrice: z.coerce.number().min(0).optional(),
  status: z.enum(['Active', 'Draft', 'Archived']).optional(),
  stockStatus: z.enum(['In Stock', 'Compounding', 'Backorder']).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AffiliateSignupInput = z.infer<typeof affiliateSignupSchema>;
export type CreateAffiliateInput = z.infer<typeof createAffiliateSchema>;
export type UpdateAffiliateInput = z.infer<typeof updateAffiliateSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const setAffiliatePriceSchema = z.object({
  sellingPrice: z.coerce.number().min(0),
});

export const createAffiliatePatientSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  plan: z.string().max(200).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type SetAffiliatePriceInput = z.infer<typeof setAffiliatePriceSchema>;
export type CreateAffiliatePatientInput = z.infer<
  typeof createAffiliatePatientSchema
>;

/** Self-serve profile update (name only; email change deferred) */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(150),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
