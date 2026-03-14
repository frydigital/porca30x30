import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
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
      
    </>
  );
}
