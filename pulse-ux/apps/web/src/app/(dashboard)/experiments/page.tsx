"use client";

/**
 * Experiments listing page with Detail.dev-inspired loading states.
 */
import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, ExternalLink, Trash2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, getHostname } from "@/lib/utils";
import type { Experiment, Site } from "@/types";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-6" role="status" aria-live="polite" aria-label="Loading experiments">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="space-y-3 w-full max-w-sm">
          <div className="h-4 bg-muted rounded animate-pulse w-full" />
          <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
          <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
          <div className="flex items-center justify-center pt-2">
            <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
          </div>
          <div className="h-4 bg-muted rounded animate-pulse w-3/6 mx-auto" />
        </div>

        <div className="mt-8 text-center">
          <h3 className="text-xl font-medium text-muted-foreground">Loading experiments</h3>
          <p className="text-sm text-muted-foreground mt-2">This should only take a moment.</p>
        </div>
      </div>
    </div>
  );
}

// Experiment card component with action buttons
function ExperimentCard({
  experiment,
  onDelete,
  onRetry,
  isDeleting,
  isRetrying
}: {
  experiment: Experiment;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  isDeleting: boolean;
  isRetrying: boolean;
}) {
  const hostname = useMemo(() => getHostname(experiment.target_url), [experiment.target_url]);
  const createdDate = useMemo(() => formatDate(experiment.created_at), [experiment.created_at]);

  // Show retry button for draft (generation in progress or failed) experiments
  const showRetry = experiment.status === "draft" || experiment.status === "failed";
  // Check if this is a failed experiment based on description containing error
  const isFailed = experiment.status === "draft" && experiment.description?.toLowerCase().includes("failed");
  const displayStatus = isFailed ? "failed" : experiment.status;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${experiment.name}"? This action cannot be undone.`)) {
      onDelete(experiment.id);
    }
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRetry(experiment.id);
  };

  return (
    <div className="bg-card rounded-lg border hover:border-primary/50 transition-colors">
      <Link href={`/experiments/${experiment.id}`} className="block p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium">{experiment.name}</h3>
          <StatusBadge status={displayStatus} />
        </div>

        {experiment.description && !experiment.description.toLowerCase().includes("failed") && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{experiment.description}</p>
        )}
        {isFailed && experiment.description && (
          <p className="text-sm text-destructive mb-3 line-clamp-2">{experiment.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {hostname}
          </span>
          <span>Created {createdDate}</span>
        </div>
      </Link>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 px-4 pb-3 pt-0">
        {showRetry && (
          <Button variant="outline" size="sm" onClick={handleRetry} disabled={isRetrying} className="text-xs h-7">
            <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? "Retrying..." : "Retry"}
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs h-7 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}

// Info cards component
function InfoCards() {
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      <div className="bg-card rounded-lg border p-4">
        <h4 className="font-medium text-muted-foreground mb-2">How does Pulse analyze my site?</h4>
        <p className="text-sm text-muted-foreground">
          Pulse scrapes your site&apos;s DOM and uses Claude Opus 4.5 to generate UX improvements, looking for
          conversion opportunities and selecting the most impactful changes.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h4 className="font-medium text-muted-foreground mb-2">What types of improvements do you find?</h4>
        <p className="text-sm text-muted-foreground">
          We test all kinds of UX changes, from CTA styling to layout adjustments. We focus on the improvements that are
          most likely to increase conversions.
        </p>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.get<Site[]>("/api/v1/sites")
  });

  // Fetch experiments
  const { data: experiments, isLoading } = useQuery({
    queryKey: ["experiments", selectedSiteId, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSiteId && selectedSiteId !== "all") params.append("site_id", selectedSiteId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const query = params.toString();
      return api.get<Experiment[]>(`/api/v1/experiments${query ? `?${query}` : ""}`);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/experiments/${id}`),
    onMutate: (id) => setDeletingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
    },
    onSettled: () => setDeletingId(null)
  });

  // Retry/regenerate mutation
  const retryMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/experiments/${id}/regenerate`),
    onMutate: (id) => setRetryingId(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiments"] });
    },
    onSettled: () => setRetryingId(null)
  });

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleRetry = (id: string) => {
    retryMutation.mutate(id);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Experiments</h1>

        <div className="flex items-center gap-4">
          {/* Site filter */}
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All sites" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sites</SelectItem>
              {sites?.map((site) => (
                <SelectItem key={site.id} value={site.id}>
                  {site.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* Create button */}
          <Button asChild className="cta-button">
            <Link href="/experiments/new">
              <Plus className="h-4 w-4" />
              NEW EXPERIMENT
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <>
          <LoadingSkeleton />
          <InfoCards />
        </>
      ) : experiments && experiments.length > 0 ? (
        <div className="grid gap-4">
          {experiments.map((experiment) => (
            <ExperimentCard
              key={experiment.id}
              experiment={experiment}
              onDelete={handleDelete}
              onRetry={handleRetry}
              isDeleting={deletingId === experiment.id}
              isRetrying={retryingId === experiment.id}
            />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border p-12 text-center">
          <h3 className="text-lg font-medium mb-2">No experiments yet</h3>
          <p className="text-muted-foreground mb-6">Create your first experiment to start optimizing your UX.</p>
          <Button asChild className="cta-button">
            <Link href="/experiments/new">
              <Plus className="h-4 w-4" />
              CREATE EXPERIMENT
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
