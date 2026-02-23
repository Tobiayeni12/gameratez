# Sending verification emails (all free)

## Option 1: Gmail – free, no domain, works for any user

Use your Gmail address to send verification emails. **No domain, no DNS, no payment.** Gmail can send to any recipient.

1. **Turn on 2-Step Verification** for your Google account:  
   https://myaccount.google.com/security

2. **Create an App Password:**  
   https://myaccount.google.com/apppasswords  
   - Choose “Mail” and your device (or “Other” and type “Gameratez”).  
   - Copy the 16-character password (e.g. `abcd efgh ijkl mnop`).

3. **Add to your `.env` file** (in the project root):
   ```env
   GMAIL_USER=yourname@gmail.com
   GMAIL_APP_PASSWORD=abcdefghijklmnop
   ```
   Use your real Gmail and the app password (no spaces in the password in `.env`).

4. **Restart the server:** `npm run dev`

Verification emails will be sent from your Gmail to any signup address. Gmail’s limit is 500 emails/day for normal accounts.

---

## Option 2: Resend + your own domain

If you prefer a custom “from” address (e.g. `noreply@yourdomain.com`) and already have a domain:

1. Go to [Resend → Domains](https://resend.com/domains), add your domain, and add the DNS records they show.
2. When verified, set in `.env`: `FROM_EMAIL=Gameratez <noreply@yourdomain.com>` and `RESEND_API_KEY=re_xxx`.
3. Restart the server.

The app uses **Gmail first** if `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set; otherwise it uses Resend if `RESEND_API_KEY` is set.
