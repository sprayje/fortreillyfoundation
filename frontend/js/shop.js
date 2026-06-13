const CART_KEY = "frf_apparel_cart";
const CHECKOUT_ENDPOINT = "/api/create-checkout-session";

const productGrid = document.getElementById("productGrid");
const shopEmpty = document.getElementById("shopEmpty");
const cartOpen = document.getElementById("cartOpen");
const cartClose = document.getElementById("cartClose");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartBadge = document.getElementById("cartBadge");
const cartTitle = document.getElementById("cartTitle");
const cartLines = document.getElementById("cartLines");
const cartSubtotal = document.getElementById("cartSubtotal");
const cartStatus = document.getElementById("cartStatus");
const checkoutButton = document.getElementById("checkoutButton");

let products = [];
let cart = readCart();

function money(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch (error) {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function escapeText(value) {
  return String(value || "").replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[match]);
}

function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

function findVariant(product, colorId) {
  return product?.variants.find((variant) => variant.id === colorId);
}

function cartProductDetails(item) {
  const product = findProduct(item.productId);
  const variant = findVariant(product, item.colorId);
  return { product, variant };
}

function cartTotal() {
  return cart.reduce((total, item) => {
    const { product } = cartProductDetails(item);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);
}

function cartQuantity() {
  return cart.reduce((total, item) => total + item.quantity, 0);
}

function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.remove("hidden");
  cartDrawer.setAttribute("aria-hidden", "false");
  cartOpen.setAttribute("aria-expanded", "true");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.add("hidden");
  cartDrawer.setAttribute("aria-hidden", "true");
  cartOpen.setAttribute("aria-expanded", "false");
}

function addToCart(productId, colorId, size) {
  const product = findProduct(productId);
  const variant = findVariant(product, colorId);
  if (!product || !variant || !size) return;

  const existing = cart.find((item) => item.productId === productId && item.colorId === colorId && item.size === size);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, 10);
  } else {
    cart.push({ productId, colorId, size, quantity: 1 });
  }

  saveCart();
  renderCart();
  openCart();
}

function updateQuantity(index, quantity) {
  if (!cart[index]) return;
  cart[index].quantity = Math.max(1, Math.min(Number.parseInt(quantity, 10) || 1, 10));
  saveCart();
  renderCart();
}

function removeItem(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function renderProducts() {
  productGrid.innerHTML = "";
  shopEmpty.classList.toggle("hidden", products.length > 0);

  products.forEach((product) => {
    const firstVariant = product.variants[0];
    const card = document.createElement("article");
    card.className = "nike-card";
    card.dataset.productId = product.id;
    card.dataset.activeColor = firstVariant.id;

    card.innerHTML = `
      <div class="product-image-wrap">
        <img class="product-image front" src="${escapeText(firstVariant.images.front)}" alt="${escapeText(product.name)} in ${escapeText(firstVariant.name)} front view">
        <img class="product-image back" src="${escapeText(firstVariant.images.back)}" alt="${escapeText(product.name)} in ${escapeText(firstVariant.name)} back view">
      </div>
      <div class="variant-strip" aria-label="${escapeText(product.name)} color options">
        ${product.variants.map((variant, index) => `
          <button class="variant-thumb${index === 0 ? " active" : ""}" type="button" data-color-id="${escapeText(variant.id)}" aria-label="${escapeText(variant.name)}">
            <img src="${escapeText(variant.images.front)}" alt="">
          </button>
        `).join("")}
      </div>
      <div class="product-info">
        <div>
          <h2>${escapeText(product.name)}</h2>
          <p class="product-color">${escapeText(firstVariant.name)}</p>
        </div>
        <strong>${money(product.price)}</strong>
      </div>
      <div class="size-row" aria-label="${escapeText(product.name)} sizes">
        ${product.sizes.map((size, index) => `
          <button class="size-chip${index === 0 ? " active" : ""}" type="button" data-size="${escapeText(size)}">${escapeText(size)}</button>
        `).join("")}
      </div>
      <button class="add-cart" type="button">Add to Cart</button>
    `;

    card.querySelectorAll(".variant-thumb").forEach((button) => {
      button.addEventListener("click", () => {
        const variant = findVariant(product, button.dataset.colorId);
        card.dataset.activeColor = variant.id;
        card.querySelector(".product-image.front").src = variant.images.front;
        card.querySelector(".product-image.back").src = variant.images.back;
        card.querySelector(".product-image.front").alt = `${product.name} in ${variant.name} front view`;
        card.querySelector(".product-image.back").alt = `${product.name} in ${variant.name} back view`;
        card.querySelector(".product-color").textContent = variant.name;
        card.querySelectorAll(".variant-thumb").forEach((thumb) => thumb.classList.toggle("active", thumb === button));
      });
    });

    card.querySelectorAll(".size-chip").forEach((button) => {
      button.addEventListener("click", () => {
        card.querySelectorAll(".size-chip").forEach((chip) => chip.classList.toggle("active", chip === button));
      });
    });

    card.querySelector(".add-cart").addEventListener("click", () => {
      const size = card.querySelector(".size-chip.active")?.dataset.size;
      addToCart(product.id, card.dataset.activeColor, size);
    });

    productGrid.appendChild(card);
  });
}

function renderCart() {
  const quantity = cartQuantity();
  cartBadge.textContent = quantity;
  cartTitle.textContent = `${quantity} Item${quantity === 1 ? "" : "s"}`;
  cartSubtotal.textContent = money(cartTotal());
  checkoutButton.disabled = quantity === 0;
  cartStatus.textContent = "";

  if (!cart.length) {
    cartLines.innerHTML = '<p class="cart-empty">Your bag is empty.</p>';
    return;
  }

  cartLines.innerHTML = cart.map((item, index) => {
    const { product, variant } = cartProductDetails(item);
    if (!product || !variant) return "";
    return `
      <article class="cart-item">
        <img src="${escapeText(variant.images.front)}" alt="">
        <div>
          <strong>${escapeText(product.name)}</strong>
          <span>${escapeText(variant.name)} / ${escapeText(item.size)}</span>
          <div class="quantity-row">
            <button type="button" data-cart-action="decrease" data-index="${index}">-</button>
            <span>${item.quantity}</span>
            <button type="button" data-cart-action="increase" data-index="${index}">+</button>
            <button type="button" data-cart-action="remove" data-index="${index}">Remove</button>
          </div>
        </div>
        <strong>${money(product.price * item.quantity)}</strong>
      </article>
    `;
  }).join("");

  cartLines.querySelectorAll("[data-cart-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number.parseInt(button.dataset.index, 10);
      const action = button.dataset.cartAction;
      if (action === "remove") removeItem(index);
      if (action === "increase") updateQuantity(index, cart[index].quantity + 1);
      if (action === "decrease") {
        if (cart[index].quantity === 1) removeItem(index);
        else updateQuantity(index, cart[index].quantity - 1);
      }
    });
  });
}

async function loadProducts() {
  const response = await fetch("data/products.json", { cache: "no-store" });
  const data = await response.json();
  products = Array.isArray(data.products) ? data.products : [];
  cart = cart.filter((item) => findProduct(item.productId) && findVariant(findProduct(item.productId), item.colorId));
  saveCart();
  renderProducts();
  renderCart();
}

async function checkout() {
  checkoutButton.disabled = true;
  cartStatus.textContent = "Opening secure checkout...";

  try {
    const response = await fetch(CHECKOUT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart })
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Checkout could not be started.");
    window.location.href = data.url;
  } catch (error) {
    cartStatus.textContent = error.message;
    checkoutButton.disabled = cart.length === 0;
  }
}

cartOpen.addEventListener("click", openCart);
cartClose.addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);
checkoutButton.addEventListener("click", checkout);

loadProducts().catch(() => {
  shopEmpty.classList.remove("hidden");
  renderCart();
});
