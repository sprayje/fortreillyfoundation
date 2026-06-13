const MAX_QUANTITY = 10;
function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    }
  });
}

function toFormBody(params) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.append(key, String(value));
  });
  return body;
}

async function loadCatalog(request) {
  const catalogUrl = new URL("/frontend/data/products.json", request.url);
  const response = await fetch(catalogUrl.toString(), {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error("Product catalog is not available.");
  const data = await response.json();
  return Array.isArray(data.products) ? data.products : [];
}

function normalizeCart(items, products) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Your cart is empty.");
  }

  return items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const variant = product?.variants.find((entry) => entry.id === item.colorId);
    const size = String(item.size || "").trim();
    const quantity = Number.parseInt(item.quantity, 10);

    if (!product || !variant) throw new Error("One cart item is no longer available.");
    if (!variant.stripePriceId || !variant.stripePriceId.startsWith("price_")) {
      throw new Error(`${product.name} is missing a Stripe Price ID.`);
    }
    if (!product.sizes.includes(size)) throw new Error(`Choose a valid size for ${product.name}.`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      throw new Error(`Choose a quantity from 1 to ${MAX_QUANTITY} for ${product.name}.`);
    }

    return {
      productId: product.id,
      productName: product.name,
      colorId: variant.id,
      colorName: variant.name,
      size,
      quantity,
      stripePriceId: variant.stripePriceId
    };
  });
}

export async function onRequestOptions() {
  return jsonResponse({});
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY) {
    return jsonResponse({ error: "Stripe secret key is not configured in Cloudflare Pages." }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonResponse({ error: "Send a valid cart to checkout." }, 400);
  }

  try {
    const products = await loadCatalog(request);
    const cart = normalizeCart(payload.items, products);
    const origin = new URL(request.url).origin;
    const params = {
      mode: "payment",
      success_url: `${origin}/shop-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/shop-cancel.html`,
      "shipping_address_collection[allowed_countries][0]": "US",
      "phone_number_collection[enabled]": "true",
      allow_promotion_codes: "true",
      "metadata[fulfillment]": "manual",
      "metadata[cart]": JSON.stringify(
        cart.map((item) => ({
          productId: item.productId,
          colorId: item.colorId,
          colorName: item.colorName,
          size: item.size,
          quantity: item.quantity
        }))
      ).slice(0, 500)
    };

    cart.forEach((item, index) => {
      params[`line_items[${index}][price]`] = item.stripePriceId;
      params[`line_items[${index}][quantity]`] = item.quantity;
    });

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2026-02-25.clover"
      },
      body: toFormBody(params)
    });

    const data = await stripeResponse.json();
    if (!stripeResponse.ok) {
      return jsonResponse({ error: data.error?.message || "Stripe checkout could not be created." }, 400);
    }

    return jsonResponse({ url: data.url });
  } catch (error) {
    return jsonResponse({ error: error.message || "Checkout could not be started." }, 400);
  }
}
