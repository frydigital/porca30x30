import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "./ui/button";

export async function Header() {

    const supabase = await createClient();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();


    return (
        <header className="border-b border-gray-300 bg-background">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">30x30</span>
                </div>
                <nav className="flex items-center gap-4">
                    {user ? (
                        <>
                            <Button variant="ghost" asChild>
                                <Link href="/settings">Settings</Link>
                            </Button>
                            <Button variant="ghost" asChild>
                                <Link href="/dashboard/leaderboard">Leaderboard</Link>
                            </Button>
                            <Button variant="outline" asChild>
                                <Link href="/dashboard">Dashboard</Link>
                            </Button>
                        </>
                    ) : (
                        <Button asChild>
                            <Link href="/login">Sign In</Link>
                        </Button>
                    )}
                </nav>
            </div>
        </header>
    );
}