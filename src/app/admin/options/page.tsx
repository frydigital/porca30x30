import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOptionsPage() {
  return (
    <Card className="border border-gray-300 shadow">
      <CardHeader>
        <CardTitle>Admin Options</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This section is reserved for future admin settings and controls.
        </p>
      </CardContent>
    </Card>
  );
}
