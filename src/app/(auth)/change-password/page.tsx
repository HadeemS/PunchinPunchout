import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { requireUser } from "@/lib/auth";

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Change password
          </CardTitle>
          <CardDescription>
            {user.mustChangePassword
              ? "You must set a new password before continuing."
              : `Update the password for ${user.fullName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
