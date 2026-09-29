import { OpenAPIV3 } from 'openapi-types';
import { env } from '../config/env';

const bearerAuth: OpenAPIV3.SecuritySchemeObject = {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    'JWT from POST /api/auth/login. Admin tokens for /api/admin/*; affiliate tokens for /api/affiliate/*.',
};

const errorSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    message: { type: 'string', example: 'Invalid input' },
  },
};

const authUserSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    portal: { type: 'string', enum: ['admin', 'affiliate'] },
    role: { type: 'string', example: 'master_admin' },
    status: { type: 'string', example: 'Active' },
    affiliateId: { type: 'string', format: 'uuid', nullable: true },
    affiliateName: { type: 'string', nullable: true },
    affiliateStatus: { type: 'string', nullable: true },
    avatarUrl: { type: 'string', nullable: true },
  },
};

const affiliateSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    domain: { type: 'string' },
    subdomain: { type: 'string' },
    contactName: { type: 'string' },
    contactEmail: { type: 'string', format: 'email' },
    contactPhone: { type: 'string' },
    address: { type: 'string', nullable: true },
    status: {
      type: 'string',
      enum: ['Active', 'Pending', 'Inactive', 'Suspended'],
    },
    defaultMarkup: { type: 'number' },
    commissionRate: { type: 'number' },
    primaryColor: { type: 'string', example: '#173B72' },
    secondaryColor: { type: 'string', example: '#4FAF4A' },
    logoUrl: { type: 'string', nullable: true },
    tagline: { type: 'string', nullable: true },
    portalTitle: { type: 'string', nullable: true },
    welcomeMessage: { type: 'string', nullable: true },
    supportEmail: { type: 'string', nullable: true },
    supportPhone: { type: 'string', nullable: true },
    businessHours: { type: 'string', nullable: true },
    hidePoweredBy: { type: 'boolean' },
    trustBadgeText: { type: 'string', nullable: true },
    clinicalPartnerNote: { type: 'string', nullable: true },
    patientsCount: { type: 'integer' },
    ordersCount: { type: 'integer' },
    revenue: { type: 'number' },
    createdAt: { type: 'string' },
  },
};

const productSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    category: {
      type: 'string',
      enum: [
        'Medical Program',
        'Telehealth Consult',
        'Prescription Refill',
        'Wellness Pack',
      ],
    },
    description: { type: 'string' },
    imageUrl: { type: 'string', nullable: true },
    basePrice: { type: 'number' },
    minimumPrice: { type: 'number' },
    status: { type: 'string', enum: ['Active', 'Draft', 'Archived'] },
    stockStatus: {
      type: 'string',
      enum: ['In Stock', 'Compounding', 'Backorder'],
    },
    activeAffiliatesCount: { type: 'integer' },
    ordersCount: { type: 'integer' },
  },
};

const affiliateProductSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    category: { type: 'string' },
    description: { type: 'string' },
    imageUrl: { type: 'string', nullable: true },
    basePrice: { type: 'number' },
    minimumPrice: { type: 'number' },
    stockStatus: { type: 'string' },
    status: { type: 'string' },
    sellingPrice: { type: 'number', nullable: true },
    isPriced: { type: 'boolean' },
  },
};

const storefrontTenantSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    slug: { type: 'string' },
    subdomain: { type: 'string' },
    customDomain: { type: 'string' },
    logoUrl: { type: 'string', nullable: true },
    primaryColor: { type: 'string' },
    secondaryColor: { type: 'string' },
    businessName: { type: 'string' },
    tagline: { type: 'string' },
    welcomeMessage: { type: 'string' },
    supportEmail: { type: 'string' },
    supportPhone: { type: 'string' },
    hidePoweredBy: { type: 'boolean' },
    clinicAddress: { type: 'string', nullable: true },
    businessHours: { type: 'string', nullable: true },
    clinicalPartnerNote: { type: 'string', nullable: true },
    trustBadgeText: { type: 'string', nullable: true },
  },
};

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'LeanBloom API',
    version: '1.0.0',
    description: `
LeanBloom Master Admin & Affiliate Partner Portal API.

## Portals
- **Admin** — manage affiliates, catalog products, pricing floors
- **Affiliate** — view own data, set selling prices (≥ minimum), manage customers

## Auth
1. \`POST /api/auth/login\` with email/password (optional \`portal\`: \`admin\` | \`affiliate\`)
2. Copy \`token\` from the response
3. Click **Authorize** and paste: \`Bearer &lt;token&gt;\` or just the token
4. Update display name via \`PATCH /api/auth/me\` (email change not supported yet)
5. Change password via \`POST /api/auth/change-password\`

## Uploads
Product images and affiliate logos are multipart fields (\`image\` / \`logo\`) and served under \`/uploads/...\`.
    `.trim(),
    contact: { name: 'LeanBloom' },
  },
  servers: [
    {
      url: `http://localhost:${env.port}`,
      description: 'Local development',
    },
  ],
  tags: [
    { name: 'Health', description: 'Service health' },
    { name: 'Auth', description: 'Login, signup, profile, password' },
    { name: 'Admin — Affiliates', description: 'Master admin affiliate CRUD' },
    { name: 'Admin — Products', description: 'Master admin catalog CRUD' },
    { name: 'Admin — Misc', description: 'Placeholder admin endpoints' },
    {
      name: 'Affiliate Portal',
      description: 'Tenant-scoped partner portal APIs',
    },
    {
      name: 'Storefront',
      description: 'Public patient storefront (no auth)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: bearerAuth,
    },
    schemas: {
      Error: errorSchema,
      AuthUser: authUserSchema,
      Affiliate: affiliateSchema,
      Product: productSchema,
      AffiliateProduct: affiliateProductSchema,
      StorefrontTenant: storefrontTenantSchema,
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'john.admin@leanbloom.com',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'MasterAdmin2026!',
          },
          portal: {
            type: 'string',
            enum: ['admin', 'affiliate'],
            description: 'Optional; auto-detects if omitted',
          },
        },
      },
      AffiliateSignupRequest: {
        type: 'object',
        required: ['clinicName', 'ownerName', 'email', 'password'],
        properties: {
          clinicName: { type: 'string', example: 'Metro Health Clinic' },
          ownerName: { type: 'string', example: 'Dr. Jane Smith' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string', format: 'password', minLength: 8 },
          customDomain: { type: 'string' },
        },
      },
      SetSellingPriceRequest: {
        type: 'object',
        required: ['sellingPrice'],
        properties: {
          sellingPrice: {
            type: 'number',
            minimum: 0,
            description: 'Must be >= product minimumPrice',
            example: 299,
          },
        },
      },
      CreatePatientRequest: {
        type: 'object',
        required: ['name', 'email'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          plan: { type: 'string' },
          address: { type: 'string' },
          notes: { type: 'string' },
        },
      },
      UpdateProfileRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            minLength: 2,
            maxLength: 150,
            example: 'John Admin',
          },
        },
      },
      ChangePasswordRequest: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', format: 'password' },
          newPassword: {
            type: 'string',
            format: 'password',
            minLength: 8,
            maxLength: 128,
          },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'API is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ok: { type: 'boolean' },
                    service: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // —— Auth ——
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login (admin or affiliate)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authenticated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/AuthUser' },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/api/auth/signup/affiliate': {
      post: {
        tags: ['Auth'],
        summary: 'Public affiliate self-signup',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AffiliateSignupRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Affiliate account created' },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          '409': { description: 'Email already exists' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current authenticated user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Current user',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    user: { $ref: '#/components/schemas/AuthUser' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update own profile (name only)',
        description:
          'Updates display name for the authenticated admin or affiliate user. Email change is not supported yet. Returns a refreshed JWT.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateProfileRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Profile updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/AuthUser' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change own password',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Password updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
          '401': { description: 'Unauthorized or wrong current password' },
        },
      },
    },

    // —— Admin Affiliates ——
    '/api/admin/affiliates': {
      get: {
        tags: ['Admin — Affiliates'],
        summary: 'List affiliates',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['Active', 'Pending', 'Inactive', 'Suspended'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'Affiliate list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    affiliates: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Affiliate' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin — Affiliates'],
        summary: 'Create affiliate (admin sets owner password)',
        description:
          'Multipart form: fields + optional `logo` file. Creates owner login with `ownerPassword`.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: [
                  'name',
                  'contactName',
                  'contactEmail',
                  'ownerPassword',
                ],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  contactName: { type: 'string' },
                  contactEmail: { type: 'string', format: 'email' },
                  contactPhone: { type: 'string' },
                  address: { type: 'string' },
                  status: {
                    type: 'string',
                    enum: ['Active', 'Pending', 'Inactive', 'Suspended'],
                  },
                  defaultMarkup: { type: 'number' },
                  commissionRate: { type: 'number' },
                  primaryColor: { type: 'string' },
                  secondaryColor: { type: 'string' },
                  portalTitle: { type: 'string' },
                  tagline: { type: 'string' },
                  welcomeMessage: { type: 'string' },
                  supportEmail: { type: 'string' },
                  supportPhone: { type: 'string' },
                  businessHours: { type: 'string' },
                  hidePoweredBy: { type: 'boolean' },
                  trustBadgeText: { type: 'string' },
                  clinicalPartnerNote: { type: 'string' },
                  customDomain: { type: 'string' },
                  ownerPassword: {
                    type: 'string',
                    format: 'password',
                    minLength: 8,
                  },
                  logo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Logo image (max 5MB)',
                  },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: [
                  'name',
                  'contactName',
                  'contactEmail',
                  'ownerPassword',
                ],
                properties: {
                  name: { type: 'string' },
                  slug: { type: 'string' },
                  contactName: { type: 'string' },
                  contactEmail: { type: 'string' },
                  contactPhone: { type: 'string' },
                  address: { type: 'string' },
                  status: { type: 'string' },
                  defaultMarkup: { type: 'number' },
                  commissionRate: { type: 'number' },
                  primaryColor: { type: 'string' },
                  secondaryColor: { type: 'string' },
                  ownerPassword: { type: 'string', minLength: 8 },
                  logoUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Affiliate created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    affiliate: { $ref: '#/components/schemas/Affiliate' },
                  },
                },
              },
            },
          },
          '409': { description: 'Duplicate email/slug' },
        },
      },
    },
    '/api/admin/affiliates/{id}': {
      get: {
        tags: ['Admin — Affiliates'],
        summary: 'Get affiliate by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Affiliate',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    affiliate: { $ref: '#/components/schemas/Affiliate' },
                  },
                },
              },
            },
          },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Admin — Affiliates'],
        summary: 'Update affiliate',
        description:
          'JSON or multipart. Optional `logo` file and `ownerPassword` to reset login.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  contactName: { type: 'string' },
                  contactEmail: { type: 'string' },
                  contactPhone: { type: 'string', nullable: true },
                  address: { type: 'string', nullable: true },
                  status: {
                    type: 'string',
                    enum: ['Active', 'Pending', 'Inactive', 'Suspended'],
                  },
                  defaultMarkup: { type: 'number' },
                  commissionRate: { type: 'number' },
                  primaryColor: { type: 'string' },
                  secondaryColor: { type: 'string' },
                  logoUrl: { type: 'string', nullable: true },
                  portalTitle: { type: 'string', nullable: true },
                  tagline: { type: 'string', nullable: true },
                  welcomeMessage: { type: 'string', nullable: true },
                  supportEmail: { type: 'string', nullable: true },
                  supportPhone: { type: 'string', nullable: true },
                  businessHours: { type: 'string', nullable: true },
                  hidePoweredBy: { type: 'boolean' },
                  trustBadgeText: { type: 'string', nullable: true },
                  clinicalPartnerNote: { type: 'string', nullable: true },
                  ownerPassword: { type: 'string', minLength: 8 },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  contactName: { type: 'string' },
                  contactEmail: { type: 'string' },
                  status: { type: 'string' },
                  defaultMarkup: { type: 'number' },
                  primaryColor: { type: 'string' },
                  secondaryColor: { type: 'string' },
                  portalTitle: { type: 'string' },
                  tagline: { type: 'string' },
                  welcomeMessage: { type: 'string' },
                  supportEmail: { type: 'string' },
                  supportPhone: { type: 'string' },
                  businessHours: { type: 'string' },
                  hidePoweredBy: { type: 'boolean' },
                  trustBadgeText: { type: 'string' },
                  clinicalPartnerNote: { type: 'string' },
                  ownerPassword: { type: 'string' },
                  logo: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Admin — Affiliates'],
        summary: 'Delete affiliate',
        description:
          'Fails with 409 if affiliate has patients/orders (use Suspend instead).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Deleted' },
          '409': { description: 'Has related records' },
          '404': { description: 'Not found' },
        },
      },
    },

    // —— Admin Products ——
    '/api/admin/products': {
      get: {
        tags: ['Admin — Products'],
        summary: 'List catalog products',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['Active', 'Draft', 'Archived'],
            },
          },
        ],
        responses: {
          '200': {
            description: 'Products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    products: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Admin — Products'],
        summary: 'Create product',
        description:
          'Multipart preferred: fields + optional `image` file. `minimumPrice` must be ≥ `basePrice`. Status **Active** makes it visible to affiliates.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['name', 'category', 'basePrice', 'minimumPrice'],
                properties: {
                  name: { type: 'string' },
                  category: {
                    type: 'string',
                    enum: [
                      'Medical Program',
                      'Telehealth Consult',
                      'Prescription Refill',
                      'Wellness Pack',
                    ],
                  },
                  description: { type: 'string' },
                  basePrice: { type: 'number' },
                  minimumPrice: { type: 'number' },
                  status: {
                    type: 'string',
                    enum: ['Active', 'Draft', 'Archived'],
                  },
                  stockStatus: {
                    type: 'string',
                    enum: ['In Stock', 'Compounding', 'Backorder'],
                  },
                  image: {
                    type: 'string',
                    format: 'binary',
                    description: 'Product image (max 5MB)',
                  },
                },
              },
            },
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'category', 'basePrice', 'minimumPrice'],
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                  basePrice: { type: 'number' },
                  minimumPrice: { type: 'number' },
                  status: { type: 'string' },
                  stockStatus: { type: 'string' },
                  imageUrl: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    product: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          '400': { description: 'Validation error' },
        },
      },
    },
    '/api/admin/products/{id}': {
      get: {
        tags: ['Admin — Products'],
        summary: 'Get product by ID',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Product' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Admin — Products'],
        summary: 'Update product',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  description: { type: 'string', nullable: true },
                  basePrice: { type: 'number' },
                  minimumPrice: { type: 'number' },
                  status: {
                    type: 'string',
                    enum: ['Active', 'Draft', 'Archived'],
                  },
                  stockStatus: { type: 'string' },
                  imageUrl: { type: 'string', nullable: true },
                },
              },
            },
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  category: { type: 'string' },
                  description: { type: 'string' },
                  basePrice: { type: 'number' },
                  minimumPrice: { type: 'number' },
                  status: { type: 'string' },
                  stockStatus: { type: 'string' },
                  image: { type: 'string', format: 'binary' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Admin — Products'],
        summary: 'Delete product',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Deleted' },
          '404': { description: 'Not found' },
        },
      },
    },

    '/api/admin/users': {
      get: {
        tags: ['Admin — Misc'],
        summary: 'List admin users (placeholder)',
        security: [{ BearerAuth: [] }],
        responses: {
          '501': { description: 'Not implemented yet' },
        },
      },
    },
    '/api/admin/dashboard/stats': {
      get: {
        tags: ['Admin — Misc'],
        summary: 'Dashboard stats (placeholder)',
        security: [{ BearerAuth: [] }],
        responses: {
          '501': { description: 'Not implemented yet' },
        },
      },
    },

    // —— Affiliate Portal ——
    '/api/affiliate/me': {
      get: {
        tags: ['Affiliate Portal'],
        summary: 'Affiliate profile + branding',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Profile for the authenticated affiliate tenant',
          },
          '403': { description: 'Not an affiliate token' },
        },
      },
    },
    '/api/affiliate/dashboard': {
      get: {
        tags: ['Affiliate Portal'],
        summary: 'Dashboard KPIs + 30-day sales series',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'stats, salesData, recentOrders, recentPatients',
          },
        },
      },
    },
    '/api/affiliate/products': {
      get: {
        tags: ['Affiliate Portal'],
        summary: 'Active catalog with this affiliate’s selling prices',
        description:
          'Only products with status **Active** are returned. `sellingPrice` is null until set.',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    products: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/AffiliateProduct' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/affiliate/products/{id}/price': {
      patch: {
        tags: ['Affiliate Portal'],
        summary: 'Set selling price for a product',
        description: 'Enforced: sellingPrice ≥ product.minimumPrice',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/SetSellingPriceRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Price saved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    product: { $ref: '#/components/schemas/AffiliateProduct' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Below minimum floor or product not Active',
          },
        },
      },
    },
    '/api/affiliate/patients': {
      get: {
        tags: ['Affiliate Portal'],
        summary: 'List customers (patients) for this affiliate',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Patients list' },
        },
      },
      post: {
        tags: ['Affiliate Portal'],
        summary: 'Create customer',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreatePatientRequest' },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '409': { description: 'Email already exists for this affiliate' },
        },
      },
    },
    '/api/affiliate/orders': {
      get: {
        tags: ['Affiliate Portal'],
        summary: 'List orders for this affiliate',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Orders list' },
        },
      },
    },
    '/api/affiliate/commissions': {
      get: {
        tags: ['Affiliate Portal'],
        summary: 'Commission records (derived from orders)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Commissions list' },
        },
      },
    },
    '/api/affiliate/payments': {
      get: {
        tags: ['Affiliate Portal'],
        summary: 'Payout / payment transactions',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Payments list' },
        },
      },
    },

    // —— Public storefront ——
    '/api/storefront/tenants': {
      get: {
        tags: ['Storefront'],
        summary: 'List active affiliate storefronts',
        responses: {
          '200': {
            description: 'Tenants',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tenants: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/StorefrontTenant' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/storefront/tenant': {
      get: {
        tags: ['Storefront'],
        summary: 'Resolve tenant by host, slug, or id',
        parameters: [
          {
            name: 'host',
            in: 'query',
            schema: { type: 'string' },
            example: 'wellness-partner.leanbloom.com',
          },
          { name: 'slug', in: 'query', schema: { type: 'string' } },
          {
            name: 'id',
            in: 'query',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': { description: 'Resolved tenant' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/storefront/{affiliateId}/products': {
      get: {
        tags: ['Storefront'],
        summary: 'Catalog products with affiliate selling prices',
        parameters: [
          {
            name: 'affiliateId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Products for storefront',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    tenant: { $ref: '#/components/schemas/StorefrontTenant' },
                    products: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          category: { type: 'string' },
                          description: { type: 'string' },
                          imageUrl: { type: 'string', nullable: true },
                          price: { type: 'number' },
                          basePrice: { type: 'number' },
                          minimumPrice: { type: 'number' },
                          stockStatus: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': { description: 'Affiliate not found' },
        },
      },
    },
    '/api/storefront/checkout': {
      post: {
        tags: ['Storefront'],
        summary: 'Submit patient checkout (creates patient + orders)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['affiliateId', 'fullName', 'email', 'items'],
                properties: {
                  affiliateId: { type: 'string', format: 'uuid' },
                  fullName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  state: { type: 'string' },
                  shippingAddress: {
                    type: 'object',
                    properties: {
                      addressLine1: { type: 'string' },
                      addressLine2: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      zipCode: { type: 'string' },
                    },
                  },
                  items: {
                    type: 'array',
                    minItems: 1,
                    items: {
                      type: 'object',
                      required: ['productId'],
                      properties: {
                        productId: { type: 'string', format: 'uuid' },
                        quantity: { type: 'integer', minimum: 1, default: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Order submitted' },
          '400': { description: 'Validation or pricing error' },
          '404': { description: 'Affiliate not found' },
        },
      },
    },
  },
};
