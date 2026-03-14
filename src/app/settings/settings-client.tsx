"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { Profile } from "@/lib/types";
import { User } from "@supabase/supabase-js";
import {
    Loader2
} from "lucide-react";
import { useState } from "react";

interface SettingsPageProps {
    user: User
    profile: Profile | null
}

export default function SettingsClient({
    user,
    profile
}: SettingsPageProps) {
    const [username, setUsername] = useState(profile?.username || "");
    const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage(null);

        const supabase = createClient();
        const { error } = await supabase
            .from("profiles")
            .update({
                username: username || null,
                is_public: isPublic,
                updated_at: new Date().toISOString(),
            })
            .eq("id", user.id);

        if (error) {
            setMessage({ type: "error", text: error.message });
        } else {
            setMessage({ type: "success", text: "Profile updated!" });
        }
        setSaving(false);
    };


    return (
        <div className="container mx-auto px-4 py-8 space-y-8">

            <Card className="w-full border border-gray-300 shadow">
                <CardHeader>
                    <CardTitle>Profile Settings</CardTitle>
                    <CardDescription>
                        Manage your display name and privacy settings
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={user.email || ""}
                            disabled
                            className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                            Email cannot be changed
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="username">Display Name</Label>
                        <Input
                            id="username"
                            type="text"
                            placeholder="Choose a display name"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            This will be shown on the public leaderboard
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="visibility">Public Profile</Label>
                            <p className="text-sm text-muted-foreground">
                                Show your profile on the public leaderboard
                            </p>
                        </div>
                        <Switch
                            id="visibility"
                            checked={isPublic}
                            onCheckedChange={setIsPublic}
                        />
                    </div>

                    <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>

                    {message && (
                        <div className={`p-4 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                            {message.text}
                        </div>
                    )}

                </CardContent>
            </Card>
        </div>
    )
}