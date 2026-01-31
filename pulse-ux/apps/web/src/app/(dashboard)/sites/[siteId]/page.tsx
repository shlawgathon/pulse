"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Site, Experiment } from "@/types";

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const siteId = params.siteId as string;

  const [copied, setCopied] = useState(false);
  const [showGitHubForm, setShowGitHubForm] = useState(false);
  const [githubRepo, setGithubRepo] = useState("");
  const [githubPat, setGithubPat] = useState("");

  const { data: site, isLoading } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => api.get<Site>(`/api/v1/sites/${siteId}`),
  });

  const { data: experiments } = useQuery({
    queryKey: ["site-experiments", siteId],
    queryFn: () => api.get<Experiment[]>(`/api/v1/experiments?site_id=${siteId}`),
    enabled: !!site,
  });

  const updateSite = useMutation({
    mutationFn: (data: { github_repo?: string; github_pat?: string }) =>
      api.patch<Site>(`/api/v1/sites/${siteId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site", siteId] });
      setShowGitHubForm(false);
      setGithubPat("");
    },
  });

  const deleteSite = useMutation({
    mutationFn: () => api.delete(`/api/v1/sites/${siteId}`),
    onSuccess: () => {
      router.push("/sites");
    },
  });

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Site not found</p>
      </div>
    );
  }

  const activeExperiments =
    experiments?.filter((e) => e.status === "active").length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{site.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">{site.domain}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (confirm("Are you sure you want to delete this site?")) {
                deleteSite.mutate();
              }
            }}
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Status</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {site.is_active ? (
              <span className="inline-flex items-center text-green-600">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center text-zinc-500">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-zinc-400" />
                Inactive
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Active Experiments</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {activeExperiments}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Created</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {new Date(site.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Script Installation */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900 mb-4">
          Install Script
        </h2>
        <p className="text-sm text-zinc-500 mb-4">
          Add this script tag to your website&apos;s{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs">
            &lt;head&gt;
          </code>{" "}
          section to enable A/B testing.
        </p>

        <div className="relative">
          <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100 overflow-x-auto">
            <code>{site.script_tag}</code>
          </pre>
          <button
            onClick={() => copyToClipboard(site.script_tag)}
            className="absolute right-2 top-2 rounded-md bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-600"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-lime-50 border border-lime-200 p-4">
          <p className="text-sm text-lime-800">
            <strong>Public Key:</strong>{" "}
            <code className="font-mono">{site.public_key}</code>
          </p>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium text-zinc-900">
              GitHub Integration
            </h2>
            <p className="text-sm text-zinc-500">
              Connect your repository to generate Pull Requests for winning
              variants.
            </p>
          </div>
          {!showGitHubForm && (
            <button
              onClick={() => {
                setGithubRepo(site.github_repo || "");
                setShowGitHubForm(true);
              }}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              {site.github_repo ? "Update" : "Connect"}
            </button>
          )}
        </div>

        {site.github_repo && !showGitHubForm && (
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 p-4">
            <svg
              className="h-5 w-5 text-zinc-700"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-zinc-700">
              {site.github_repo}
            </span>
            <span className="ml-auto inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Connected
            </span>
          </div>
        )}

        {showGitHubForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateSite.mutate({
                github_repo: githubRepo || undefined,
                github_pat: githubPat || undefined,
              });
            }}
            className="space-y-4"
          >
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
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="owner/repository"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Format: owner/repository (e.g., acme/website)
              </p>
            </div>

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
                value={githubPat}
                onChange={(e) => setGithubPat(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Needs repo scope. Leave blank to keep existing token.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowGitHubForm(false)}
                className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateSite.isPending}
                className="flex-1 rounded-md bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-lime-500 disabled:opacity-50"
              >
                {updateSite.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        )}

        {!site.github_repo && !showGitHubForm && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center">
            <svg
              className="mx-auto h-8 w-8 text-zinc-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="mt-2 text-sm text-zinc-500">
              No GitHub repository connected
            </p>
            <p className="text-xs text-zinc-400">
              Connect to automatically generate PRs for winning variants
            </p>
          </div>
        )}
      </div>

      {/* Recent Experiments */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-lg font-medium text-zinc-900 mb-4">
          Recent Experiments
        </h2>

        {experiments && experiments.length > 0 ? (
          <div className="space-y-3">
            {experiments.slice(0, 5).map((experiment) => (
              <a
                key={experiment.id}
                href={`/experiments/${experiment.id}`}
                className="flex items-center justify-between rounded-lg border border-zinc-100 p-4 hover:border-zinc-200 hover:bg-zinc-50"
              >
                <div>
                  <p className="font-medium text-zinc-900">{experiment.name}</p>
                  <p className="text-sm text-zinc-500 truncate max-w-md">
                    {experiment.target_url}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    experiment.status === "active"
                      ? "bg-green-100 text-green-700"
                      : experiment.status === "completed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {experiment.status}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-500">No experiments yet</p>
            <a
              href="/experiments/new"
              className="mt-2 inline-block text-sm text-lime-600 hover:text-lime-700"
            >
              Create your first experiment
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
