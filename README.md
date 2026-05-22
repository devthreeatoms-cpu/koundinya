# Koundinya App

## Resend Email Setup

This app now includes a secure server endpoint at `POST /api/send-email`.

### 1. Configure environment variables

Set these where your server runs (Vercel Project Settings -> Environment Variables):

- `RESEND_API_KEY` = your Resend API key
- `RESEND_FROM_EMAIL` = verified sender (example: `noreply@yourdomain.com`)

For local development, you can also add these to `.env.local` (already gitignored).

### 2. Call from frontend

Use:

`src/lib/resend-client.ts`

Example:

```ts
import { sendAppEmail } from "@/lib/resend-client";

await sendAppEmail({
  to: "user@example.com",
  subject: "Welcome",
  html: "<p>Your account is ready.</p>",
});
```
