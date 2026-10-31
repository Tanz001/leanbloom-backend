import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

type PayPalAccessToken = {
  access_token: string;
  expires_in: number;
};

type PayPalOrder = {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
};

function baseUrl() {
  return env.paypalMode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!env.paypalClientId || !env.paypalClientSecret) {
    throw new AppError(
      'PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.',
      503
    );
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const auth = Buffer.from(
    `${env.paypalClientId}:${env.paypalClientSecret}`
  ).toString('base64');

  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AppError(`PayPal auth failed: ${text.slice(0, 200)}`, 502);
  }

  const data = (await res.json()) as PayPalAccessToken;
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export const PaypalService = {
  isMockMode() {
    return Boolean(env.paypalMock);
  },

  getClientId() {
    return env.paypalClientId || (env.paypalMock ? 'mock-client-id' : '');
  },

  async createOrder(input: {
    amount: number;
    currency?: string;
    description: string;
    returnUrl: string;
    cancelUrl: string;
  }): Promise<{ orderId: string; approveUrl: string; mock: boolean }> {
    if (env.paypalMock) {
      const orderId = `MOCK-${Date.now()}`;
      return {
        orderId,
        approveUrl: `${input.returnUrl}${input.returnUrl.includes('?') ? '&' : '?'}token=${orderId}&mock=1`,
        mock: true,
      };
    }

    const token = await getAccessToken();
    const amount = input.amount.toFixed(2);

    const res = await fetch(`${baseUrl()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            description: input.description.slice(0, 120),
            amount: {
              currency_code: input.currency || 'USD',
              value: amount,
            },
          },
        ],
        application_context: {
          brand_name: 'LeanBloom',
          landing_page: 'LOGIN',
          user_action: 'PAY_NOW',
          return_url: input.returnUrl,
          cancel_url: input.cancelUrl,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new AppError(`PayPal create order failed: ${text.slice(0, 300)}`, 502);
    }

    const order = (await res.json()) as PayPalOrder;
    const approveUrl =
      order.links?.find((l) => l.rel === 'approve')?.href || '';
    if (!order.id || !approveUrl) {
      throw new AppError('PayPal did not return an approval link', 502);
    }

    return { orderId: order.id, approveUrl, mock: false };
  },

  async captureOrder(
    orderId: string
  ): Promise<{ captureId: string; status: string; mock: boolean }> {
    if (env.paypalMock || orderId.startsWith('MOCK-')) {
      return {
        captureId: `MOCK-CAP-${Date.now()}`,
        status: 'COMPLETED',
        mock: true,
      };
    }

    const token = await getAccessToken();
    const res = await fetch(
      `${baseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      throw new AppError(`PayPal capture failed: ${text.slice(0, 300)}`, 502);
    }

    const data = (await res.json()) as {
      id: string;
      status: string;
      purchase_units?: {
        payments?: { captures?: { id: string; status: string }[] };
      }[];
    };

    const capture =
      data.purchase_units?.[0]?.payments?.captures?.[0] || null;
    const captureId = capture?.id || data.id;
    const status = capture?.status || data.status;

    if (!captureId) {
      throw new AppError('PayPal capture response missing id', 502);
    }

    return { captureId, status, mock: false };
  },
};
