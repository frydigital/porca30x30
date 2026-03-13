// Strava OAuth configuration
export const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
export const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
export const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI!;

export const STRAVA_AUTH_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_API_URL = "https://www.strava.com/api/v3";

// Scopes needed for activity access
export const STRAVA_SCOPES = "activity:read_all";

export interface StravaTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  start_date_local: string;
  moving_time: number; // in seconds
  elapsed_time: number; // in seconds
  distance: number; // in meters
}

export function getStravaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: "code",
    scope: STRAVA_SCOPES,
    state: state,
  });
  
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<StravaTokens> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code: code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
  const response = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh access token");
  }

  return response.json();
}

export async function getActivities(
  accessToken: string,
  after?: number,
  before?: number,
  page = 1,
  perPage = 50
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({
    page: page.toString(),
    per_page: perPage.toString(),
  });

  if (after) {
    params.append("after", after.toString());
  }
  if (before) {
    params.append("before", before.toString());
  }

  const response = await fetch(
    `${STRAVA_API_URL}/athlete/activities?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch activities");
  }

  return response.json();
}
