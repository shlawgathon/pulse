
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import { api } from "@/lib/api-client";

// Define the shape of our user session
declare module "next-auth" {
    interface Session {
        accessToken?: string;
        refreshToken?: string;
        user: {
            id: string;
            name: string;
            email: string;
            image?: string;
        };
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        GithubProvider({
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        }),
    ],
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (!account || !user.email) return false;

            try {
                // Authenticate with our backend
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/auth/oauth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: user.email,
                        name: user.name || user.email.split("@")[0],
                        provider: account.provider,
                        provider_id: account.providerAccountId,
                        avatar_url: user.image,
                    }),
                });

                if (!response.ok) {
                    console.error("Backend auth failed", await response.text());
                    return false;
                }

                const data = await response.json();

                // Store backend tokens in the JWT
                // We temporarily attach them to the account object so jwt callback can see them
                (account as any).backend_access_token = data.access_token;
                (account as any).backend_refresh_token = data.refresh_token;
                (account as any).backend_user_id = data.user.id;

                return true;
            } catch (error) {
                console.error("Sign in error:", error);
                return false;
            }
        },
        async jwt({ token, account, user }) {
            // First sign in
            if (account && user) {
                return {
                    ...token,
                    accessToken: (account as any).backend_access_token,
                    refreshToken: (account as any).backend_refresh_token,
                    userId: (account as any).backend_user_id,
                };
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.accessToken = token.accessToken as string;
                session.refreshToken = token.refreshToken as string;
                session.user.id = token.userId as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login", // Error code passed in url query string as ?error=
    },
};
