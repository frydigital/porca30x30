import { createClient } from "@/lib/supabase/server";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
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
                            <div className="flex items-center gap-4">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={profile?.avatar_url || undefined} />
                                    <AvatarFallback>
                                        {(profile?.username || user.email || "U").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <Button variant="ghost" size="sm" onClick={handleLogout}>
                                    <LogOut className="w-4 h-4 mr-2" />
                                    Sign Out
                                </Button>
                            </div>
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