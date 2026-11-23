import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";
import { getSetting } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const businessName = await getSetting("businessName", "TimeClock");

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {businessName}
          </CardTitle>
          <CardDescription>Sign in to punch in or punch out</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </main>
  );
}
