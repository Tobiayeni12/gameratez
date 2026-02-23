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

## Create Account

Users create an account with **email and password**. The app checks that the email is valid and that the domain can receive email (MX lookup). No verification email is sent—after signup they go straight to preferences (display name, username, etc.), then into the app.
