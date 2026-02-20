import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupSchema } from "@crm/shared";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  async function signup(formData: FormData) {
    "use server";

    const result = SignupSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!result.success) {
      const message = result.error.issues[0].message;
      redirect(`/auth/signup?error=${encodeURIComponent(message)}`);
    }

    const { name, email, password } = result.data;
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`);
    }

    redirect("/auth/signup?success=1");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an admin account</CardTitle>
          <CardDescription>Enter your details to get started</CardDescription>
        </CardHeader>
        <SignupForm
          action={signup}
          serverError={error}
          success={!!success}
        />
      </Card>
    </div>
  );
}
