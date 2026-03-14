import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md border border-gray-300 shadow">
        <CardHeader className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
          <CardTitle className="text-2xl font-bold">Authentication error</CardTitle>
          <CardDescription>
            We could not verify your link. It may be expired or already used.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/login">Try login again</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/forgot-password">Reset password</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
