# 30x30 Challenge

A public-facing leaderboard tracking daily streak activity for 30 days, with a minimum of 30 minutes of activity per day.

## Features

- **Public Leaderboard**: See who's leading the 30x30 challenge
- **Multiple Data Sources**: 
  - **Strava Integration**: Automatically sync activities from Strava
  - **Garmin Connect Integration**: Automatically sync activities from Garmin
  - **Manual Entry**: Log activities manually for any workout
- **Email/Password Authentication**: Traditional login with email confirmation on signup
- **Personal Dashboard**: Track your streak, manage settings, and view your activity calendar
- **Privacy Controls**: Choose whether to appear on the public leaderboard

## Tech Stack

- **Frontend**: Next.js 15 with App Router
- **UI Components**: Shadcn UI with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password + email confirmation)
- **Activity Data**: Strava API, Garmin Connect API, Manual Entry

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase account
- A Strava API application (optional)
- A Garmin Connect API application (optional)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/frydigital/30x30.git
   cd 30x30
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Your Supabase publishable key
   - `STRAVA_CLIENT_ID`: Your Strava API client ID (optional)
   - `STRAVA_CLIENT_SECRET`: Your Strava API client secret (optional)
   - `GARMIN_CONSUMER_KEY`: Your Garmin API consumer key (optional)
   - `GARMIN_CONSUMER_SECRET`: Your Garmin API consumer secret (optional)
   - `NEXT_PUBLIC_APP_URL`: Fallback app URL (e.g., http://localhost:3000)
   - `NEXT_PUBLIC_SITE_URL`: Canonical site URL for auth email redirects (staging/prod)

4. Set up the database:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the schema from `supabase/schema.sql`

5. Configure Supabase Auth:
   - Enable Email provider in Authentication settings
   - Disable "Confirm email" or configure email templates
   - Add your app URL to the allowed redirect URLs

6. Configure Strava API (optional):
   - Create an API application at https://www.strava.com/settings/api
   - Set the callback URL to `{your-app-url}/api/strava/callback`

7. Configure Garmin Connect API (optional):
   - Apply for API access at https://developer.garmin.com/
   - Set the callback URL to `{your-app-url}/api/garmin/callback`

8. Run the development server:
   ```bash
   npm run dev
   ```

9. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── strava/         # Strava OAuth & sync endpoints
│   │   ├── garmin/         # Garmin OAuth & sync endpoints
│   │   └── activities/     # Manual activity entry
│   ├── auth/               # Auth callback handlers
│   ├── dashboard/          # User dashboard
│   ├── login/              # Login page
│   └── page.tsx            # Public leaderboard
├── components/
│   └── ui/                 # Shadcn UI components
├── lib/
│   ├── strava/             # Strava API utilities
│   ├── garmin/             # Garmin API utilities
│   ├── supabase/           # Supabase client setup
│   ├── types.ts            # TypeScript types
│   └── utils.ts            # Utility functions
└── middleware.ts           # Auth middleware
```

## How It Works

1. Users sign up with email/password and confirm via email link
2. Users log in with email/password
3. Connect their fitness platforms (Strava, Garmin) or add activities manually
4. Sync activities from connected platforms (last 30 days)
5. Activities from all sources are aggregated per day
6. Days with 30+ minutes count toward the streak
7. Streaks are calculated based on consecutive valid days
8. Public profiles appear on the leaderboard

## License

MIT
