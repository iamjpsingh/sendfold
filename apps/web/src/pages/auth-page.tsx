import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, LockKeyhole, Check } from "lucide-react";
import { api, post } from "@/lib/api";
import { Brand, Busy, ErrorBox } from "@/components/common";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
export function AuthPage() {
  const query = useQueryClient(),
    setup = useQuery({
      queryKey: ["setup"],
      queryFn: () => api<{ required: boolean }>("/setup"),
    });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(),
    [created, setCreated] = useState(false);
  const required = setup.data?.required && !created;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.entries());
    try {
      if (required) {
        await post("/setup", values);
        setCreated(true);
        await query.invalidateQueries({ queryKey: ["setup"] });
      }
      await post("/auth/sign-in/email", {
        email: values.email,
        password: values.password,
      });
      await query.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-6 py-5 md:px-10">
        <Brand />
        <span className="text-xs text-muted-foreground">
          Your work. Your space.
        </span>
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-81px)] max-w-5xl items-center gap-12 px-6 py-14 md:grid-cols-2">
        <div className="space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium">
            <LockKeyhole className="size-3.5" />
            Private by default
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Good work deserves
            <br />a better handoff.
          </h1>
          <p className="max-w-sm text-base leading-7 text-muted-foreground">
            Bring files, questions, and feedback together. Give your clients one
            link to move the project forward.
          </p>
          <div className="space-y-3 text-sm">
            {[
              "Drop a folder. Keep everything together.",
              "Share a password, not another signup.",
              "Review, decide, and save the next version.",
            ].map((text) => (
              <div key={text} className="flex gap-3">
                <Check className="size-4 text-muted-foreground" />
                {text}
              </div>
            ))}
          </div>
        </div>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>
              {required ? "Set up Sendfold" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {required
                ? "Create the first super-admin account."
                : "Sign in to manage your projects and people."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={submit}>
            <CardContent className="space-y-4">
              {setup.error && <ErrorBox error={setup.error} />}{" "}
              {!!error && <ErrorBox error={error} />}{" "}
              {required && (
                <>
                  <Field label="Your name" name="name" autoComplete="name" />
                  <Field
                    label="Installation name"
                    name="installation"
                    placeholder="Your studio or company"
                  />
                  <Field
                    label="One-time setup token"
                    name="token"
                    type="password"
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    This token protects the first super-admin setup. You only
                    use it once per installation; projects never need a setup
                    token.
                  </p>
                </>
              )}
              <Field
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
              />
              <Field
                label="Password"
                name="password"
                type="password"
                minLength={required ? 12 : undefined}
                autoComplete={required ? "new-password" : "current-password"}
              />
              <Button
                className="w-full"
                disabled={busy || setup.isPending}
                type="submit"
              >
                <Busy busy={busy}>
                  {required ? "Create super admin" : "Sign in"}
                </Busy>
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </form>
          <CardFooter className="justify-center border-t pt-5 text-xs text-muted-foreground">
            {required
              ? "Self-hosted. Open-source. Yours to control."
              : "Have a client link? Open it directly to enter its password."}
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}
function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.name}>{label}</Label>
      <Input id={props.name} required {...props} />
    </div>
  );
}
