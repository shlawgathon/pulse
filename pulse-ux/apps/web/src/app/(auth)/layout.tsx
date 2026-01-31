/**
 * Auth layout with dark theme for login/register pages.
 */
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-black text-white flex flex-col">
      {/* Back to home link */}
      <header className="container mx-auto px-6 py-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary rounded-md flex items-center justify-center">
              <span className="text-black font-bold text-xl">P</span>
            </div>
            <span className="font-semibold text-2xl">Pulse</span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}
