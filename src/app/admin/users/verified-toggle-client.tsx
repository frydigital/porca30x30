"use client";

import { useState } from "react";

type Props = {
  userId: string;
  initialVerified: boolean;
};

export default function VerifiedToggleClient({ userId, initialVerified }: Props) {
  const [verified, setVerified] = useState(initialVerified);
  const [saving, setSaving] = useState(false);

  const onChange = async (nextValue: boolean) => {
    setVerified(nextValue);
    setSaving(true);

    try {
      const response = await fetch("/api/admin/users/verified", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, verified: nextValue }),
      });

      if (!response.ok) {
        setVerified(!nextValue);
      }
    } catch {
      setVerified(!nextValue);
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={verified}
        onChange={(e) => onChange(e.target.checked)}
        disabled={saving}
        className="h-4 w-4 rounded border-input"
      />
      <span className="text-muted-foreground">{verified ? "Yes" : "No"}</span>
    </label>
  );
}
