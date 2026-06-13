# Fort Reilly Foundation Chatroom

Production-ready plain HTML/CSS/JS chat frontend with a separate Node.js, Express, Socket.IO, MongoDB backend.

## Project Structure

```text
/frontend
  index.html
  shop.html
  chat.html
  admin.html
  css/style.css
  js/auth.js
  js/chat.js
  js/admin.js
  assets/

/backend
  server.js
  package.json
  .env.example
  seedAdmin.js
  models/
  middleware/
  routes/
  uploads/
```

## Features

- Email/password registration and login
- JWT sessions
- bcrypt password hashing
- MongoDB message history
- Public and private rooms
- Admin/moderator roles
- Room create/edit/delete controls
- Room topic and description controls
- Ban/unban users
- Promote/demote moderators
- Moderator message deletion
- Real-time chat with Socket.IO
- Online user list
- Typing indicators
- Private direct messages
- Image/GIF/PDF/text upload support with size limits
- Pasted GIF URL support
- Message timestamps
- Basic REST and chat anti-spam rate limiting
- Secure CORS via `FRONTEND_URL`
- Responsive mobile design
- Apparel shop with Stripe Checkout
- Manual fulfillment order records after successful payment

## Backend Local Setup

1. Install Node.js 20 or newer.
2. Create a MongoDB database, either local or hosted with MongoDB Atlas.
3. Copy the example environment file:

```bash
cd backend
cp .env.example .env
```

On Windows PowerShell:

```powershell
cd backend
Copy-Item .env.example .env
```

4. Edit `backend/.env`:

```text
PORT=4000
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=use-a-long-random-secret
FRONTEND_URL=http://localhost:8788
MAX_UPLOAD_MB=8
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SHOP_SHIPPING_AMOUNT=700
```

5. Install and run:

```bash
npm install
npm run dev
```

The backend will start at `http://localhost:4000`.

## Shop and Stripe Setup

The Cloudflare Pages shop uses Stripe-hosted Checkout. The browser sends only product IDs, color IDs, sizes, and quantities; the Cloudflare Function validates those cart items against `frontend/data/products.json` before creating a Checkout Session.

Set `STRIPE_SECRET_KEY` in Cloudflare Pages as an environment variable or secret:

```text
STRIPE_SECRET_KEY=sk_test_your_secret_key
```

Do not put the Stripe secret key in frontend files. The checkout endpoint is `functions/api/create-checkout-session.js`, which deploys as `/api/create-checkout-session` on Cloudflare Pages.

Products are added to `frontend/data/products.json`:

```json
{
  "id": "shirt-slug",
  "name": "Shirt Name",
  "price": 3000,
  "sizes": ["S", "M", "L", "XL", "2XL"],
  "variants": [
    {
      "id": "black",
      "name": "Black",
      "stripePriceId": "price_...",
      "images": {
        "front": "assets/shop/shirt-black-front.jpg",
        "back": "assets/shop/shirt-black-back.jpg"
      }
    }
  ]
}
```

Paid orders live in Stripe Checkout/Payments for this first launch. Use Stripe metadata to see selected color and size while you fulfill orders manually.

## Frontend Local Setup

The frontend is static and can be served by any static file server. From the repository root:

```bash
npx serve frontend -l 8788
```

Open `http://localhost:8788`.

Important: update the `API_BASE` constant in these files before deploying:

- `frontend/js/auth.js`
- `frontend/js/chat.js`
- `frontend/js/admin.js`

For production, use your deployed backend URL:

```js
const API_BASE = "https://your-chat-backend.onrender.com";
```

## First Admin Account

The first account registered through the website automatically becomes an `admin`.

You can also seed or reset an admin account with:

```bash
cd backend
npm run seed:admin
```

Set these values in `backend/.env` first:

```text
SEED_ADMIN_EMAIL=admin@fortreillyfoundation.org
SEED_ADMIN_PASSWORD=change-this-admin-password
SEED_ADMIN_NAME=Foundation Admin
```

## Cloudflare Pages Frontend Deployment

1. Push this repository to GitHub.
2. In Cloudflare Pages, create a project from the GitHub repository.
3. Set the production branch.
4. Use these build settings:

```text
Framework preset: None
Build command: none
Build output directory: frontend
```

5. In `frontend/js/auth.js`, `frontend/js/chat.js`, and `frontend/js/admin.js`, set `API_BASE` to the deployed backend URL.
6. Set your backend `FRONTEND_URL` to the Cloudflare Pages URL or `https://fortreillyfoundation.org`.

## Render Backend Deployment

1. Create a new Render Web Service from the GitHub repository.
2. Root directory: `backend`
3. Build command:

```bash
npm install
```

4. Start command:

```bash
npm start
```

5. Add environment variables:

```text
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=long-random-secret
FRONTEND_URL=https://fortreillyfoundation.org
PORT=10000
MAX_UPLOAD_MB=8
```

Render supplies `PORT` automatically on many plans. If it does, keep Render's value.

## Railway Backend Deployment

1. Create a Railway project from the GitHub repository.
2. Set the service root directory to `backend`.
3. Add environment variables:

```text
MONGO_URI=your-production-mongodb-uri
JWT_SECRET=long-random-secret
FRONTEND_URL=https://fortreillyfoundation.org
MAX_UPLOAD_MB=8
```

4. Railway will run `npm start`.

## Upload Notes

Uploads are stored in `backend/uploads` on the backend server. This is fine for a VPS or persistent disk. Render and Railway filesystems may be ephemeral unless persistent storage is configured. For long-term production file storage, connect a durable object store later, such as Cloudflare R2 or S3.

Allowed upload MIME types:

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `application/pdf`
- `text/plain`

The default max upload size is `8 MB`, controlled by `MAX_UPLOAD_MB`.

## Security Notes

- Use a long, random `JWT_SECRET`.
- Keep `FRONTEND_URL` exact in production for CORS.
- Keep MongoDB credentials out of Git.
- Serve both frontend and backend over HTTPS in production.
- Rotate the seed admin password after first login.
