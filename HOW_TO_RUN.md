# How to Run Eco Academy (Locally)

This runs the app **on your own computer** at `localhost` — for viewing and
testing. Districts can't reach it this way; that requires deploying (see the
bottom of this file).

## First time on a new computer

You need [Node.js](https://nodejs.org) installed (LTS version). Then, in Terminal:

```bash
cd ~/Projects/eco-academy
npm install        # downloads dependencies (only needed once, or after a git pull)
```

You also need a `.env` file in the project root with the Supabase keys:

```
EXPO_PUBLIC_SUPABASE_URL=https://iflwnlktdltajiimfwoc.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<the anon public key from Supabase → Project Settings → API Keys>
```

(`.env` is intentionally not stored in Git. The anon key is safe to use in the app.)

## Every time you want to run it

1. Open **Terminal** (`Cmd+Space` → type "Terminal" → Enter).
2. Go to the project and start it:
   ```bash
   cd ~/Projects/eco-academy
   npm run web
   ```
3. When it says **"Waiting on http://localhost:8081"**, open **http://localhost:8081**
   in your browser.
4. Sign in as a district (e.g. `austin`) or as the super-admin email.

**To stop:** click the Terminal and press `Ctrl + C` (or close the window).
Keep the Terminal open while you're using the app.

## See it on your phone (optional)

Run `npm start` instead of `npm run web`, install the free **Expo Go** app on your
phone, and scan the QR code shown in the Terminal.

## Troubleshooting

- **"Port 8081 already in use"** — an old server is still running. Press `Ctrl+C`
  in any open Terminal, or just re-run `npm run web` and accept a different port.
- **Blank screen / "Supabase env missing"** — the `.env` file is missing or the
  keys are wrong. See the "First time" section above.
- **Nothing loads / login fails** — make sure the Supabase project is not paused
  (Supabase dashboard). On the free plan it can pause after ~a week of inactivity.

## Going live (for real districts)

`localhost` only exists on your machine. To let districts log in from their own
computers, the app must be **deployed** to a public web host (e.g. Vercel or
Netlify) with its own URL like `dashboard.ecoacademy.org`. That's a separate,
one-time setup — not covered here yet.
