"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { StatusBadge } from "@/components/status-badge";
import { PageLoading } from "@/components/loading-spinner";
import { formatDate } from "@/lib/utils";
import type { Site, Experiment } from "@/types";

const COPY_FEEDBACK_DURATION = 2000;

const githubSchema = z.object({
  github_repo: z.string().optional(),
  github_pat: z.string().optional()
});

type GitHubFormData = z.infer<typeof githubSchema>;

export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const siteId = params.siteId as string;

  const [copied, setCopied] = useState(false);
  const [showGitHubForm, setShowGitHubForm] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Fetch site and experiments in parallel
  const { data: site, isLoading: siteLoading } = useQuery({
    queryKey: ["site", siteId],
    queryFn: () => api.get<Site>(`/api/v1/sites/${siteId}`)
  });

  const { data: experiments, isLoading: experimentsLoading } = useQuery({
    queryKey: ["site-experiments", siteId],
    queryFn: () => api.get<Experiment[]>(`/api/v1/experiments?site_id=${siteId}`)
  });

  const form = useForm<GitHubFormData>({
    resolver: zodResolver(githubSchema),
    defaultValues: {
      github_repo: "",
      github_pat: ""
    }
  });

  // Update form when site data loads
  useEffect(() => {
    if (site?.github_repo) {
      form.setValue("github_repo", site.github_repo);
    }
  }, [site, form]);

  const updateSite = useMutation({
    mutationFn: (data: GitHubFormData) =>
      api.patch<Site>(`/api/v1/sites/${siteId}`, {
        github_repo: data.github_repo || undefined,
        github_pat: data.github_pat || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site", siteId] });
      setShowGitHubForm(false);
      form.reset();
    }
  });

  const deleteSite = useMutation({
    mutationFn: () => api.delete(`/api/v1/sites/${siteId}`),
    onSuccess: () => {
      router.push("/sites");
    }
  });

  const copyToClipboard = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION);
  }, []);

  const handleDelete = useCallback(() => {
    if (confirm("Are you sure you want to delete this site?")) {
      deleteSite.mutate();
    }
  }, [deleteSite]);

  const handleOpenGitHubForm = useCallback(() => {
    if (site?.github_repo) {
      form.setValue("github_repo", site.github_repo);
    }
    setShowGitHubForm(true);
  }, [site, form]);

  const handleCloseGitHubForm = useCallback(() => {
    setShowGitHubForm(false);
    form.reset();
  }, [form]);

  const onGitHubSubmit = useCallback(
    (data: GitHubFormData) => {
      updateSite.mutate(data);
    },
    [updateSite]
  );

  // Memoized computed values
  const activeExperiments = useMemo(() => experiments?.filter((e) => e.status === "active").length || 0, [experiments]);

  const isLoading = siteLoading || experimentsLoading;

  if (isLoading) {
    return <PageLoading message="Loading site..." />;
  }

  if (!site) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-muted-foreground">Site not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{site.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{site.domain}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={deleteSite.isPending}
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          {deleteSite.isPending ? "Deleting..." : "Delete"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-1 text-sm font-medium">
            {site.is_active ? (
              <span className="inline-flex items-center text-green-600">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-green-500" aria-hidden="true" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center text-muted-foreground">
                <span className="mr-1.5 h-2 w-2 rounded-full bg-muted-foreground" aria-hidden="true" />
                Inactive
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Experiments</p>
          <p className="mt-1 text-sm font-medium">{activeExperiments}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="mt-1 text-sm font-medium">{formatDate(site.created_at)}</p>
        </div>
      </div>

      {/* Script Installation */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-4">Install Script</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Add this script tag to your website&apos;s{" "}
          <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">&lt;head&gt;</code> section to enable A/B
          testing.
        </p>

        <div className="relative">
          <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-zinc-100 overflow-x-auto">
            <code>{site.script_tag}</code>
          </pre>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => copyToClipboard(site.script_tag)}
            className="absolute right-2 top-2"
            aria-label={copied ? "Copied to clipboard" : "Copy script tag"}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        <div className="mt-4 rounded-lg bg-primary/5 border border-primary/20 p-4">
          <p className="text-sm text-primary">
            <strong>Public Key:</strong> <code className="font-mono">{site.public_key}</code>
          </p>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-medium">GitHub Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect your repository to generate Pull Requests for winning variants.
            </p>
          </div>
          {!showGitHubForm && (
            <Button variant="outline" onClick={handleOpenGitHubForm}>
              {site.github_repo ? "Update" : "Connect"}
            </Button>
          )}
        </div>

        {site.github_repo && !showGitHubForm && (
          <div className="flex items-center gap-2 rounded-lg bg-muted p-4">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium">{site.github_repo}</span>
            <span className="ml-auto inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Connected
            </span>
          </div>
        )}

        {showGitHubForm && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onGitHubSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="github_repo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository</FormLabel>
                    <FormControl>
                      <Input placeholder="owner/repository" {...field} />
                    </FormControl>
                    <FormDescription>Format: owner/repository (e.g., acme/website)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="github_pat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Access Token</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormDescription>Needs repo scope. Leave blank to keep existing token.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleCloseGitHubForm} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={updateSite.isPending} className="flex-1">
                  {updateSite.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        )}

        {!site.github_repo && !showGitHubForm && (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <svg
              className="mx-auto h-8 w-8 text-muted-foreground"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <p className="mt-2 text-sm text-muted-foreground">No GitHub repository connected</p>
            <p className="text-xs text-muted-foreground/70">
              Connect to automatically generate PRs for winning variants
            </p>
          </div>
        )}
      </div>

      {/* Recent Experiments */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-medium mb-4">Recent Experiments</h2>

        {experiments && experiments.length > 0 ? (
          <div className="space-y-3">
            {experiments.slice(0, 5).map((experiment) => (
              <Link
                key={experiment.id}
                href={`/experiments/${experiment.id}`}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{experiment.name}</p>
                  <p className="text-sm text-muted-foreground truncate max-w-md">{experiment.target_url}</p>
                </div>
                <StatusBadge status={experiment.status} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No experiments yet</p>
            <Link href="/experiments/new" className="mt-2 inline-block text-sm text-primary hover:underline">
              Create your first experiment
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
