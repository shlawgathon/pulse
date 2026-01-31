"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Site, SiteCreate } from "@/types";

export default function NewSitePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<SiteCreate>({
    name: "",
    domain: "",
    github_repo: "",
    github_pat: "",
  });

  const createSite = useMutation({
    mutationFn: (data: SiteCreate) => api.post<Site>("/api/v1/sites", data),
    onSuccess: (site) => {
      router.push(`/sites/${site.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean up empty optional fields
    const data: SiteCreate = {
      name: formData.name,
      domain: formData.domain,
    };
    if (formData.github_repo) {
      data.github_repo = formData.github_repo;
    }
    if (formData.github_pat) {
      data.github_pat = formData.github_pat;
    }

    createSite.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Add Site</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Register a website to start running A/B tests
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Site Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700"
          >
            Site Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., My Company Website"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
        </div>

        {/* Domain */}
        <div>
          <label
            htmlFor="domain"
            className="block text-sm font-medium text-zinc-700"
          >
            Domain
          </label>
          <input
            type="text"
            id="domain"
            required
            value={formData.domain}
            onChange={(e) =>
              setFormData({ ...formData, domain: e.target.value })
            }
            placeholder="e.g., example.com"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            The domain where the actuator script will be installed
          </p>
        </div>

        {/* GitHub Integration (Optional) */}
        <div className="pt-4 border-t border-zinc-200">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">
            GitHub Integration (Optional)
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Connect a GitHub repository to automatically generate Pull Requests
            for winning variants.
          </p>

          <div className="space-y-4">
            {/* GitHub Repo */}
            <div>
              <label
                htmlFor="github_repo"
                className="block text-sm font-medium text-zinc-700"
              >
                Repository
              </label>
              <input
                type="text"
                id="github_repo"
                value={formData.github_repo}
                onChange={(e) =>
                  setFormData({ ...formData, github_repo: e.target.value })
                }
                placeholder="owner/repository"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Format: owner/repository (e.g., acme/website)
              </p>
            </div>

            {/* GitHub PAT */}
            <div>
              <label
                htmlFor="github_pat"
                className="block text-sm font-medium text-zinc-700"
              >
                Personal Access Token
              </label>
              <input
                type="password"
                id="github_pat"
                value={formData.github_pat}
                onChange={(e) =>
                  setFormData({ ...formData, github_pat: e.target.value })
                }
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Generate a token with &quot;repo&quot; scope at{" "}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime-600 hover:text-lime-700"
                >
                  github.com/settings/tokens
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {createSite.error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {createSite.error instanceof Error
                ? createSite.error.message
                : "Failed to create site"}
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createSite.isPending}
            className="flex-1 rounded-md bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-lime-500 disabled:opacity-50"
          >
            {createSite.isPending ? "Creating..." : "Add Site"}
          </button>
        </div>
      </form>
    </div>
  );
}
