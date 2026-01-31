"use client";

/**
 * Experiments listing page with Detail.dev-inspired loading states.
 */
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, ExternalLink } from "lucide-react";
import { api } from "@/lib/api-client";
import type { Experiment, Site } from "@/types";

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="bg-card rounded-lg border p-6">
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
          <h3 className="text-xl font-medium text-muted-foreground">
            Loading experiments
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            This should only take a moment.
          </p>
        </div>
      </div>
    </div>
  );
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending: "bg-yellow-100 text-yellow-700",
    active: "bg-green-100 text-green-700",
    paused: "bg-orange-100 text-orange-700",
    completed: "bg-blue-100 text-blue-700",
    archived: "bg-gray-100 text-gray-500",
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.draft}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Experiment card component
function ExperimentCard({ experiment }: { experiment: Experiment }) {
  return (
    <Link
      href={`/experiments/${experiment.id}`}
      className="block bg-card rounded-lg border p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium">{experiment.name}</h3>
        <StatusBadge status={experiment.status} />
      </div>

      {experiment.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {experiment.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ExternalLink className="h-3 w-3" />
          {new URL(experiment.target_url).hostname}
        </span>
        <span>
          Created {new Date(experiment.created_at).toLocaleDateString()}
        </span>
      </div>
    </Link>
  );
}

// Info cards component
function InfoCards() {
  return (
    <div className="grid md:grid-cols-2 gap-4 mt-6">
      <div className="bg-card rounded-lg border p-4">
        <h4 className="font-medium text-muted-foreground mb-2">
          How does Pulse analyze my site?
        </h4>
        <p className="text-sm text-muted-foreground">
          Pulse scrapes your site&apos;s DOM and uses Claude Opus 4.5 to
          generate UX improvements, looking for conversion opportunities and
          selecting the most impactful changes.
        </p>
      </div>

      <div className="bg-card rounded-lg border p-4">
        <h4 className="font-medium text-muted-foreground mb-2">
          What types of improvements do you find?
        </h4>
        <p className="text-sm text-muted-foreground">
          We test all kinds of UX changes, from CTA styling to layout
          adjustments. We focus on the improvements that are most likely to
          increase conversions.
        </p>
      </div>
    </div>
  );
}

export default function ExperimentsPage() {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.get<Site[]>("/api/v1/sites"),
  });

  // Fetch experiments
  const { data: experiments, isLoading } = useQuery({
    queryKey: ["experiments", selectedSiteId, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedSiteId) params.append("site_id", selectedSiteId);
      if (statusFilter !== "all") params.append("status", statusFilter);
      const query = params.toString();
      return api.get<Experiment[]>(
        `/api/v1/experiments${query ? `?${query}` : ""}`
      );
    },
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Experiments</h1>

        <div className="flex items-center gap-4">
          {/* Site filter */}
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="px-3 py-2 bg-background border rounded-md text-sm"
          >
            <option value="">All sites</option>
            {sites?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-background border rounded-md text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>

          {/* Create button */}
          <Link
            href="/experiments/new"
            className="cta-button inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            NEW EXPERIMENT
          </Link>
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
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border p-12 text-center">
          <h3 className="text-lg font-medium mb-2">No experiments yet</h3>
          <p className="text-muted-foreground mb-6">
            Create your first experiment to start optimizing your UX.
          </p>
          <Link
            href="/experiments/new"
            className="cta-button inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            CREATE EXPERIMENT
          </Link>
        </div>
      )}
    </div>
  );
}
