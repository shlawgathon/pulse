"use client";

import { useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { PageLoading } from "@/components/loading-spinner";
import { SessionReplays } from "@/components/session-replays";
import { formatDate, calculateConversionRate, calculateLift } from "@/lib/utils";
import type { Experiment, Variant, PullRequest } from "@/types";

export default function ExperimentDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const experimentId = params.experimentId as string;

  // Fetch experiment, variants, and PRs in parallel (no dependency chain)
  const { data: experiment, isLoading: experimentLoading } = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => api.get<Experiment>(`/api/v1/experiments/${experimentId}`)
  });

  const { data: variants, isLoading: variantsLoading } = useQuery({
    queryKey: ["experiment-variants", experimentId],
    queryFn: () => api.get<Variant[]>(`/api/v1/experiments/${experimentId}/variants`)
  });

  const { data: pullRequests } = useQuery({
    queryKey: ["experiment-prs", experimentId],
    queryFn: () => api.get<PullRequest[]>(`/api/v1/pull-requests?experiment_id=${experimentId}`)
  });

  const activateExperiment = useMutation({
    mutationFn: () => api.post<Experiment>(`/api/v1/experiments/${experimentId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
    }
  });

  const pauseExperiment = useMutation({
    mutationFn: () => api.post<Experiment>(`/api/v1/experiments/${experimentId}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
    }
  });

  const selectWinner = useMutation({
    mutationFn: (variantId: string) =>
      api.post<Experiment>(`/api/v1/experiments/${experimentId}/complete`, {
        winner_variant_id: variantId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
    }
  });

  const generatePR = useMutation({
    mutationFn: (variantId: string) =>
      api.post<PullRequest>("/api/v1/pull-requests/generate", {
        experiment_id: experimentId,
        variant_id: variantId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["experiment-prs", experimentId]
      });
    }
  });

  const regenerateVariants = useMutation({
    mutationFn: () => api.post<Experiment>(`/api/v1/experiments/${experimentId}/regenerate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
      queryClient.invalidateQueries({ queryKey: ["experiment-variants", experimentId] });
    }
  });

  // Memoize derived data
  const control = useMemo(() => variants?.find((v) => v.is_control), [variants]);

  const treatmentVariants = useMemo(() => variants?.filter((v) => !v.is_control) || [], [variants]);

  const winnerVariant = useMemo(
    () => variants?.find((v) => v.id === experiment?.winner_variant_id),
    [variants, experiment?.winner_variant_id]
  );

  const hasPR = pullRequests && pullRequests.length > 0;

  const controlConversionRate = useMemo(() => {
    if (!control) return 0;
    return calculateConversionRate(control.conversions, control.impressions);
  }, [control]);

  // Callbacks for mutations
  const handleActivate = useCallback(() => {
    activateExperiment.mutate();
  }, [activateExperiment]);

  const handlePause = useCallback(() => {
    pauseExperiment.mutate();
  }, [pauseExperiment]);

  const handleSelectWinner = useCallback(
    (variantId: string) => {
      selectWinner.mutate(variantId);
    },
    [selectWinner]
  );

  const handleGeneratePR = useCallback(
    (variantId: string) => {
      generatePR.mutate(variantId);
    },
    [generatePR]
  );

  const handleRegenerate = useCallback(() => {
    regenerateVariants.mutate();
  }, [regenerateVariants]);

  const isLoading = experimentLoading || variantsLoading;

  if (isLoading) {
    return <PageLoading message="Loading experiment..." />;
  }

  if (!experiment) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-muted-foreground">Experiment not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{experiment.name}</h1>
            <StatusBadge status={experiment.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {experiment.description && !experiment.description.toLowerCase().includes("failed") 
              ? experiment.description 
              : null}
          </p>
        </div>

        <div className="flex gap-2">
          {experiment.status === "pending" && (
            <Button onClick={handleActivate} disabled={activateExperiment.isPending}>
              {activateExperiment.isPending ? "Activating..." : "Activate"}
            </Button>
          )}
          {experiment.status === "active" && (
            <Button variant="outline" onClick={handlePause} disabled={pauseExperiment.isPending}>
              {pauseExperiment.isPending ? "Pausing..." : "Pause"}
            </Button>
          )}
          {experiment.status !== "completed" && experiment.status !== "draft" && treatmentVariants.length > 0 && (
            <Button variant="outline" onClick={handleRegenerate} disabled={regenerateVariants.isPending}>
              {regenerateVariants.isPending ? "Regenerating..." : "Regenerate Variants"}
            </Button>
          )}
          {(experiment.status === "pending" || experiment.status === "active" || experiment.status === "paused" || experiment.status === "completed") && (
            <Button variant="secondary" asChild>
              <Link href={`/experiments/${experimentId}/compare`}>Compare Variants</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Target URL</p>
          <a
            href={experiment.target_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-sm font-medium text-primary hover:underline truncate block"
          >
            {experiment.target_url}
          </a>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Traffic Allocation</p>
          <p className="mt-1 text-sm font-medium">{experiment.traffic_allocation}%</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="mt-1 text-sm font-medium">{formatDate(experiment.created_at)}</p>
        </div>
      </div>

      {/* Winner Banner */}
      {experiment.status === "completed" && winnerVariant && (
        <div className="rounded-lg border-2 border-primary bg-primary/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Winner: {winnerVariant.name}</p>
              <p className="text-sm text-primary/80">
                {winnerVariant.conversions} conversions from {winnerVariant.impressions} impressions (
                {calculateConversionRate(winnerVariant.conversions, winnerVariant.impressions).toFixed(1)}% conversion
                rate)
              </p>
            </div>
            {!hasPR && (
              <Button onClick={() => handleGeneratePR(winnerVariant.id)} disabled={generatePR.isPending}>
                {generatePR.isPending ? "Generating..." : "Generate PR"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pull Requests */}
      {hasPR && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="font-medium mb-3">Pull Requests</h3>
          <div className="space-y-2">
            {pullRequests.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{pr.branch_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Status: {pr.status}
                    {pr.error_message && ` - ${pr.error_message}`}
                  </p>
                </div>
                {pr.github_pr_url && (
                  <a
                    href={pr.github_pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View PR #{pr.github_pr_number}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs for Variants and Session Replays */}
      <Tabs defaultValue="variants" className="w-full">
        <TabsList>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="replays">Session Replays</TabsTrigger>
        </TabsList>

        <TabsContent value="variants" className="mt-4">
          {/* Control */}
          {control && (
            <div className="mb-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{control.name}</h3>
                      <span
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                        role="status"
                      >
                        Control
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {control.description || "Original version (no changes)"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold">{controlConversionRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {control.conversions} / {control.impressions}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Treatment Variants */}
          <div className="space-y-3">
            {treatmentVariants.map((variant) => {
              const isWinner = variant.id === experiment.winner_variant_id;
              const conversionRate = calculateConversionRate(variant.conversions, variant.impressions);
              const lift = calculateLift(conversionRate, controlConversionRate);

              return (
                <div
                  key={variant.id}
                  className={`rounded-lg border bg-card p-4 ${isWinner ? "border-primary ring-1 ring-primary" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{variant.name}</h3>
                        {isWinner && (
                          <span
                            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            role="status"
                          >
                            Winner
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{variant.description}</p>
                      {variant.patches.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground/70">
                          {variant.patches.length} DOM patch
                          {variant.patches.length !== 1 ? "es" : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold">{conversionRate.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">
                        {variant.conversions} / {variant.impressions}
                      </p>
                      {lift !== 0 && (
                        <p className={`text-xs font-medium ${lift > 0 ? "text-green-600" : "text-destructive"}`}>
                          {lift > 0 ? "+" : ""}
                          {lift.toFixed(1)}% vs control
                        </p>
                      )}
                    </div>
                  </div>

                  {experiment.status !== "completed" && experiment.status !== "draft" && (
                    <div className="mt-4 pt-4 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectWinner(variant.id)}
                        disabled={selectWinner.isPending}
                        className="text-primary hover:text-primary/80"
                      >
                        Select as Winner
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {treatmentVariants.length === 0 && experiment.status === "draft" && (
            <div className="rounded-lg border border-dashed p-8 text-center" role="status" aria-live="polite">
              <p className="text-muted-foreground">Variants are being generated...</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                This may take a minute while AI analyzes your page
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="replays" className="mt-4">
          <SessionReplays experimentId={experimentId} variants={variants || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
