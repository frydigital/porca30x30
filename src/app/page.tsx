import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardEntry } from "@/lib/types";
import { Award, Flame, Medal, Trophy } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Get leaderboard data
  const { data: leaderboard } = await supabase
    .from("public_leaderboard")
    .select("*")
    .limit(50) as { data: LeaderboardEntry[] | null };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="border-b border-gray-300 bg-background">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">30x30</span>
          </div>
          <nav className="flex items-center gap-4">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      
      {/* Hero */}
      <section className="h-full flex px-4 text-center bg-muted">
        <div className="container mx-auto max-w-3xl">
            <h1 className="text-xl font-semibold py-8">Current Challenges</h1>
          
          {!user && (
            <Button asChild size="lg">
              <Link href="/login">PORCA</Link>
            </Button>
          )}
        </div>
      </section>

      {/* Leaderboard */}
      <section className="py-12 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl">
      <Card className="w-full border border-gray-300 shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Leaderboard
              </CardTitle>
              <CardDescription>
                Top participants ranked by current streak
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-5">User</div>
                    <div className="col-span-2 text-center">Current</div>
                    <div className="col-span-2 text-center">Best</div>
                    <div className="col-span-2 text-center">Days</div>
                  </div>
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg ${
                        index < 3 ? "bg-muted/50" : ""
                      }`}
                    >
                      <div className="col-span-1 flex items-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <div className="col-span-5 flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={entry.avatar_url || undefined} />
                          <AvatarFallback>
                            {(entry.username || "?").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium truncate">
                          {entry.username || "Anonymous"}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <div className="flex items-center gap-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="font-bold">{entry.current_streak}</span>
                        </div>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-muted-foreground">{entry.longest_streak}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-muted-foreground">{entry.total_valid_days}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    No participants yet. Be the first to join!
                  </p>
                  {!user && (
                    <Button asChild>
                      <Link href="/login">Get Started</Link>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-300 py-8 mt-12 bg-background">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 30x30 Challenge</p>
        </div>
      </footer>
    </div>
  );
}
