# 3D / AR local testing

## 1. Same-Wi-Fi 3D testing

`npm run dev` in this patch binds Next.js to `0.0.0.0`, so another device on the LAN can reach it.

1. Start the app:

```bash
npm run setup
```

or:

```bash
npm run dev
```

2. Open a book page on the desktop and inspect the 3D / AR QR block.
3. The QR endpoint tries, in this order:
   - `AR_PUBLIC_BASE_URL`
   - `NEXT_PUBLIC_AR_BASE_URL`
   - the current non-local request host
   - a private IPv4 address discovered from the machine network interfaces
4. Phone and computer must be on the same Wi-Fi/LAN.
5. If the phone cannot connect to a `192.168.x.x:3000` URL, allow Node.js / port 3000 through the computer firewall and check that the Wi-Fi does not use client isolation.

## 2. Real camera WebXR AR

A LAN URL such as `http://192.168.1.20:3000` is useful for opening the 3D fallback on a phone, but camera-based WebXR `immersive-ar` normally requires HTTPS.

Use an HTTPS deployment/tunnel and set:

```env
AR_PUBLIC_BASE_URL="https://your-public-https-domain.example"
```

Examples: a Vercel deployment, ngrok, or Cloudflare Tunnel.

Restart the Next.js server after changing the environment variable. The QR code will then use this HTTPS origin.

## 3. What to expect

- Desktop or unsupported phone: CSS 3D / 3D fallback.
- Compatible mobile browser + HTTPS + WebXR immersive-ar support: camera AR option can become available.
- Internal PDF pages still require a logged-in session; an unauthenticated phone can open the public 3D/AR page but cannot fetch private PDF content.
