"use client";

/**
 * Registration page with email/password form.
 * Uses react-hook-form with zod validation.
 */
import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { api, setTokens } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ButtonLoading } from "@/components/loading-spinner";
import type { AuthResponse } from "@/types";

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  organization_name: z.string().optional()
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      organization_name: ""
    }
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      const response = await api.post<AuthResponse>("/api/v1/auth/register", {
        name: data.name,
        email: data.email,
        password: data.password,
        organization_name: data.organization_name || undefined
      });

      setTokens(response.access_token, response.refresh_token);
      toast.success("Account created successfully!");
      router.push("/experiments");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create account");
    }
  };

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Create an account</h1>
      <p className="text-white/60 text-center mb-8">Start optimizing your UX today</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your name"
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
                      placeholder="Min 8 characters"
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

          <FormField
            control={form.control}
            name="organization_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-white/80">
                  Organization <span className="text-white/40 font-normal">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Your company or team"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus-visible:ring-primary"
                    {...field}
                  />
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
            <ButtonLoading loading={form.formState.isSubmitting} loadingText="CREATING ACCOUNT...">
              CREATE ACCOUNT
            </ButtonLoading>
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-white/60 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>

      <p className="text-center text-xs text-white/40 mt-4">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="hover:text-white/60">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="hover:text-white/60">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
