-- Add total minutes to public leaderboard view
CREATE OR REPLACE VIEW public_leaderboard AS
SELECT
  p.id as user_id,
  p.username,
  p.avatar_url,
  s.current_streak,
  s.longest_streak,
  (SELECT COUNT(*) FROM daily_activities da WHERE da.user_id = p.id AND da.is_valid = true)::INTEGER as total_valid_days,
  COALESCE((
    SELECT SUM(da.total_duration_minutes)
    FROM daily_activities da
    WHERE da.user_id = p.id
  ), 0)::INTEGER as total_minutes
FROM profiles p
JOIN streaks s ON p.id = s.user_id
WHERE p.is_public = true
ORDER BY s.current_streak DESC, s.longest_streak DESC, total_valid_days DESC, total_minutes DESC;
