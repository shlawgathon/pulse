"use client";

/**
 * Login page with email/password form.
 * Uses react-hook-form with zod validation.
 */
import { useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, setTokens } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ButtonLoading } from "@/components/loading-spinner";
import type { AuthResponse } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-8 animate-pulse">
      <div className="h-8 bg-white/10 rounded w-48 mx-auto mb-2" />
      <div className="h-4 bg-white/10 rounded w-64 mx-auto mb-8" />
      <div className="space-y-4">
        <div className="h-10 bg-white/10 rounded" />
        <div className="h-10 bg-white/10 rounded" />
        <div className="h-10 bg-white/10 rounded" />
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const response = await api.post<AuthResponse>("/api/v1/auth/login", {
        email: data.email,
        password: data.password,
      });

      setTokens(response.access_token, response.refresh_token);
      toast.success("Welcome back!");

      // Redirect to original destination or experiments
      const from = searchParams.get("from") || "/experiments";
      router.push(from);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Invalid email or password"
      );
    }
  };

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
      <p className="text-white/60 text-center mb-8">
        Sign in to your Pulse account
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="cta-button w-full bg-primary text-primary-foreground py-3 hover:bg-primary/90"
          >
            <ButtonLoading
              loading={form.formState.isSubmitting}
              loadingText="SIGNING IN..."
            >
              SIGN IN
            </ButtonLoading>
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-white/60 mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
