"use client";

/**
 * Registration page with email/password form.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api, setTokens } from "@/lib/api-client";
import type { AuthResponse } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organization_name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post<AuthResponse>("/api/v1/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        organization_name: formData.organization_name || undefined,
      });

      setTokens(response.access_token, response.refresh_token);
      toast.success("Account created successfully!");
      router.push("/experiments");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 p-8">
      <h1 className="text-2xl font-bold text-center mb-2">Create an account</h1>
      <p className="text-white/60 text-center mb-8">
        Start optimizing your UX today
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium mb-2 text-white/80"
          >
            Name
          </label>
          <input
            id="name"
            type="text"
            required
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder:text-white/40"
            placeholder="Your name"
          />
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium mb-2 text-white/80"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, email: e.target.value }))
            }
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder:text-white/40"
            placeholder="you@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-2 text-white/80"
          >
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder:text-white/40 pr-10"
              placeholder="Min 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Organization (optional) */}
        <div>
          <label
            htmlFor="organization"
            className="block text-sm font-medium mb-2 text-white/80"
          >
            Organization{" "}
            <span className="text-white/40 font-normal">(optional)</span>
          </label>
          <input
            id="organization"
            type="text"
            value={formData.organization_name}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                organization_name: e.target.value,
              }))
            }
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-white placeholder:text-white/40"
            placeholder="Your company or team"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="cta-button w-full bg-primary text-black py-3 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              CREATING ACCOUNT...
            </>
          ) : (
            "CREATE ACCOUNT"
          )}
        </button>
      </form>

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
