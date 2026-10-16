# Plant Health Scanner

Take a photo of a plant or leaf. The app sends it to an AI image model and
reports how healthy it looks, what's visibly wrong (if anything), and a few
care tips.

## What's inside

| File | What it does |
|---|---|
| `index.html` | The page: choose or take a photo, preview it, press **Scan plant**, see the health report |
| `api/scan.js` | Serverless function: sends the photo to Groq's image model (`qwen/qwen3.8-27b`) and returns a structured result |
| `.env.local.example` | Template for your own Groq API key |

Flow: **Photo → your page → your API (`api/scan.js`) → Groq → back to your page.**
The key stays in `api/scan.js` on the server. The page never sees it.

## Set it up (about 10 minutes)

1. **Get a free Groq key:** go to https://console.groq.com/keys, sign in, and create a key. Copy it.
2. **Add your key:** copy `.env.local.example` to a new file named `.env.local`, then paste your key after `GROQ_API_KEY=`.
3. **Install the Vercel CLI** (only once): `npm install -g vercel`
4. **Run it locally:** in this folder, run `vercel dev`, then open http://localhost:3000
   - The first time, Vercel asks a few setup questions. Accept the defaults.
5. **Test:** choose a plant or leaf photo and press **Scan plant**. You should see a health status, any issues found, and care tips.

## Deploy (optional)

Run `vercel` in this folder. Then in the Vercel dashboard, open the project → Settings → Environment Variables, add `GROQ_API_KEY` with your key, and redeploy.

## If something goes wrong

| You see | What it means |
|---|---|
| `GROQ_API_KEY is missing` | `.env.local` is missing or the key line is empty. Fix it and restart `vercel dev`. |
| `Invalid API Key` | The key was copied wrongly. Copy it again from console.groq.com/keys. |
| `Free limit reached — wait a minute` | Groq's free plan allows only a few photos per minute. Wait and try again. Everyone needs their own key. |
| `model ... does not exist` or `decommissioned` | Groq changed its image model. Check console.groq.com/docs/vision and update `MODEL` at the top of `api/scan.js`. |
| Nothing happens on the page | Make sure you opened the `vercel dev` address, not the HTML file directly. |

## Ideas to extend this

- Save past scans (plant name, date, status) to `localStorage` so a user can track a plant's health over time.
- Add a second photo of the whole plant alongside a close-up of the affected leaf, and send both to the model for more context.
- Turn "care tips" into a reminder schedule (e.g. "water in 3 days") using the browser's Notification API.
