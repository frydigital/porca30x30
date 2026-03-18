import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdmin();

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Internal administration and user activity oversight
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/users">Users</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/options">Options</Link>
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}
