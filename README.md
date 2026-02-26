# gameratez

Rate games. Follow raters.

## Game list (massive list from the web)

The app uses a local list of game names for the "Pick a game" search. By default it ships with a small list in `src/data/gamesList.json`.

To **fetch a large list of popular games** from the web (RAWG's database, 500k+ games):

1. Get a free API key: [RAWG – Request API Access](https://rawg.io/login/?forward=developer)
2. Run the seed script (replace `YOUR_KEY` with your key):

   ```bash
   RAWG_API_KEY=YOUR_KEY npm run seed-games
   ```

3. The script writes thousands of game names to `src/data/gamesList.json`. The "Pick a game" search will then use this list.

You can run `npm run seed-games` again anytime to refresh the list.

## Deploy (Vercel + backend)

- **Frontend (Vercel)**  
  Connect this repo to [Vercel](https://vercel.com). Vercel will use `vercel.json` (build: `npm run build`, output: `dist`).  
  For the app to work in production, the frontend must call your deployed API. In the Vercel project, add an environment variable:
  - **`VITE_API_BASE_URL`** = your backend URL with no trailing slash (e.g. `https://your-app.onrender.com`).

- **Backend**  
  The API is a long-running Node server in `server/` (file-based data). Vercel only runs serverless functions, so deploy the backend elsewhere, e.g.:
  - **[Render](https://render.com)** (free tier): New → Web Service → connect repo, set **Root Directory** to this repo, **Build Command** `npm install`, **Start Command** `node server/index.mjs`. Set env vars (e.g. `SITE_URL` to your Vercel frontend URL, and any email vars from `.env.example`).
  - Or Railway, Fly.io, etc.

After the backend is live, set `VITE_API_BASE_URL` on Vercel to that URL and redeploy the frontend.

## Create Account

Users create an account with **email and password**. The app checks that the email is valid and that the domain can receive email (MX lookup). After signup we queue a verification email rather than immediately moving forward. The user must click the link in the message before they can fill out display name/username and finish creating their profile.

A token is generated on the server and stored temporarily; it expires after ten minutes.  The email contains a link back to the site with the token in the query string.  When the frontend sees that query parameter it automatically validates the token with the backend and advances to the preferences screen.
