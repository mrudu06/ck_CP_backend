# Competitive Programming Backend

This is the backend for the Competitive Programming Platform.

## Deployment on Render

This project is configured for deployment on Render.

1.  **Push to GitHub/GitLab:** clear any local changes and push the code to a repository.
2.  **Create a New Web Service on Render:**
    *   Connect your repository.
    *   Select "Web Service".
    *   Render will automatically detect `render.yaml` configuration.
    *   Or configure manually:
        *   **Build Command:** `npm install`
        *   **Start Command:** `node src/server.js`
3.  **Environment Variables:**
    Set the following environment variables in the Render dashboard:
    *   `SUPABASE_URL`: Your Supabase URL
    *   `SUPABASE_SERVICE_KEY`: Your Supabase Service Key
    *   `JUDGE0_API_KEY`: Your RapidAPI Key for Judge0
    *   `JUDGE0_HOST`: `judge0-ce.p.rapidapi.com` (or your host)

## Local Development

1.  Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
2.  Fill in the environment variables in `.env`.
3.  Install dependencies:
    ```bash
    npm install
    ```
4.  Start the server:
    ```bash
    npm run dev
    ```

## API Endpoints

-   `GET /health`: Health check
-   `POST /api/teams/signup`: Sign up a team
-   `POST /api/submissions`: Submit code
-   `GET /api/leaderboard`: Get leaderboard
-   `GET /api/round`: Get round info
-   `GET /api/questions`: Get questions
