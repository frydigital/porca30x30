"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type AuthState = {
	user: User | null;
	role: Profile["role"] | null;
	avatarUrl: string | null;
	username: string | null;
	loading: boolean;
};

export default function AuthMenu() {
	const router = useRouter();
	const pathname = usePathname();
	const supabase = useMemo(() => createClient(), []);

	const [state, setState] = useState<AuthState>({
		user: null,
		role: null,
		avatarUrl: null,
		username: null,
		loading: true,
	});

	useEffect(() => {
		let mounted = true;

		const loadAuthState = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();

			if (!mounted) return;

			if (!user) {
				setState({ user: null, role: null, avatarUrl: null, username: null, loading: false });
				return;
			}

			const { data: profile } = await supabase
				.from("profiles")
				.select("role, avatar_url, username")
				.eq("id", user.id)
				.single();

			if (!mounted) return;

			setState({
				user,
				role: profile?.role ?? "user",
				avatarUrl: profile?.avatar_url ?? null,
				username: profile?.username ?? null,
				loading: false,
			});
		};

		loadAuthState();

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange(() => {
			loadAuthState();
			router.refresh();
		});

		return () => {
			mounted = false;
			subscription.unsubscribe();
		};
	}, [router, supabase]);

	const handleLogout = async () => {
		await supabase.auth.signOut();
		setState({ user: null, role: null, avatarUrl: null, username: null, loading: false });
		router.replace("/login");
		router.refresh();
	};

	if (state.loading) {
		return (
			<nav className="flex items-center gap-2" aria-hidden="true">
				<div className="h-9 w-20 animate-pulse rounded-md bg-muted" />
				<div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
				<div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
				<div className="h-9 w-24 animate-pulse rounded-md bg-muted" />
				<div className="h-9 w-9 animate-pulse rounded-full bg-muted" />
			</nav>
		);
	}

	if (!state.user) {
		return (
			<Button asChild>
				<Link href="/login">Sign In</Link>
			</Button>
		);
	}

	const fallbackInitial = (state.username || state.user.email || "?").charAt(0).toUpperCase();

	return (
		<nav className="flex items-center gap-2">
			{state.role === "admin" && (
				<Button variant={pathname?.startsWith("/admin") ? "outline" : "ghost"} asChild>
					<Link href="/admin">Admin</Link>
				</Button>
			)}
			<Button variant={pathname?.startsWith("/settings") ? "outline" : "ghost"} asChild>
				<Link href="/settings">Settings</Link>
			</Button>
			<Button variant={pathname?.startsWith("/dashboard/leaderboard") ? "outline" : "ghost"} asChild>
				<Link href="/dashboard/leaderboard">Leaderboard</Link>
			</Button>
			<Button variant={pathname === "/dashboard" ? "outline" : "ghost"} asChild>
				<Link href="/dashboard">Dashboard</Link>
			</Button>

			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild>
					<button
						aria-label="Open profile menu"
						className="rounded-full border border-input p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
					>
						<Avatar className="h-8 w-8">
							<AvatarImage src={state.avatarUrl || undefined} alt="Profile avatar" />
							<AvatarFallback>{fallbackInitial}</AvatarFallback>
						</Avatar>
					</button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Portal>
					<DropdownMenu.Content
						sideOffset={8}
						align="end"
						className="z-50 min-w-50 rounded-md border border-gray-300 bg-background p-1 shadow-md"
					>
						<DropdownMenu.Label className="px-2 py-1.5 text-xs text-muted-foreground">
							{state.user.email}
						</DropdownMenu.Label>
						<DropdownMenu.Separator className="my-1 h-px bg-border" />
						<DropdownMenu.Item asChild>
							<Link className="block rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted" href="/settings">
								Profile Settings
							</Link>
						</DropdownMenu.Item>
						<DropdownMenu.Item asChild>
							<Link className="block rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted" href="/dashboard">
								Dashboard
							</Link>
						</DropdownMenu.Item>
						{state.role === "admin" && (
							<DropdownMenu.Item asChild>
								<Link className="block rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted" href="/admin">
									Admin
								</Link>
							</DropdownMenu.Item>
						)}
						<DropdownMenu.Separator className="my-1 h-px bg-border" />
						<DropdownMenu.Item
							onSelect={(event) => {
								event.preventDefault();
								handleLogout();
							}}
							className="cursor-pointer rounded-sm px-2 py-1.5 text-sm text-destructive outline-none hover:bg-muted"
						>
							Log out
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Portal>
			</DropdownMenu.Root>
		</nav>
	);
}
