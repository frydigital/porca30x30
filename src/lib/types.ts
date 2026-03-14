export interface Profile {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface StravaConnection {
  id: string;
  user_id: string;
  strava_athlete_id: number;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  created_at: string;
  updated_at: string;
}

export type ActivitySource = 'strava' | 'manual';

export interface Activity {
  id: string;
  user_id: string;
  source: ActivitySource;
  external_activity_id: string | null;
  activity_date: string; // YYYY-MM-DD format
  duration_minutes: number;
  activity_type: string;
  activity_name: string;
  notes: string | null;
  created_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string; // YYYY-MM-DD format
  total_duration_minutes: number;
  is_valid: boolean; // true if >= 30 minutes
  created_at: string;
  updated_at: string;
}

export interface Streak {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  current_streak: number;
  total_minutes: number;
  total_valid_days: number;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      strava_connections: {
        Row: StravaConnection;
        Insert: Omit<StravaConnection, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<StravaConnection, "id" | "created_at">>;
      };
      activities: {
        Row: Activity;
        Insert: Omit<Activity, "id" | "created_at">;
        Update: Partial<Omit<Activity, "id" | "created_at">>;
      };
      daily_activities: {
        Row: DailyActivity;
        Insert: Omit<DailyActivity, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DailyActivity, "id" | "created_at">>;
      };
      streaks: {
        Row: Streak;
        Insert: Omit<Streak, "id" | "updated_at">;
        Update: Partial<Omit<Streak, "id">>;
      };
    };
  };
}
