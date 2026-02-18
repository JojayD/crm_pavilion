import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Authentication error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">
            Something went wrong during authentication. The link may have
            expired or already been used.
          </p>
        </CardContent>
        <CardFooter>
          <Button asChild className="w-full">
            <Link href="/auth/login">Back to sign in</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
