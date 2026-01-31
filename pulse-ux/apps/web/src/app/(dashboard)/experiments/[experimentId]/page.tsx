"use client";

import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Experiment, Variant, PullRequest } from "@/types";
import Link from "next/link";

const statusColors: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700",
  pending: "bg-yellow-100 text-yellow-700",
  active: "bg-green-100 text-green-700",
  paused: "bg-orange-100 text-orange-700",
  completed: "bg-blue-100 text-blue-700",
  archived: "bg-zinc-100 text-zinc-500",
};

export default function ExperimentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const experimentId = params.experimentId as string;

  const { data: experiment, isLoading } = useQuery({
    queryKey: ["experiment", experimentId],
    queryFn: () => api.get<Experiment>(`/api/v1/experiments/${experimentId}`),
  });

  const { data: variants } = useQuery({
    queryKey: ["experiment-variants", experimentId],
    queryFn: () =>
      api.get<Variant[]>(`/api/v1/experiments/${experimentId}/variants`),
    enabled: !!experiment,
  });

  const { data: pullRequests } = useQuery({
    queryKey: ["experiment-prs", experimentId],
    queryFn: () =>
      api.get<PullRequest[]>(`/api/v1/pull-requests?experiment_id=${experimentId}`),
    enabled: !!experiment,
  });

  const activateExperiment = useMutation({
    mutationFn: () =>
      api.post<Experiment>(`/api/v1/experiments/${experimentId}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
    },
  });

  const pauseExperiment = useMutation({
    mutationFn: () =>
      api.post<Experiment>(`/api/v1/experiments/${experimentId}/pause`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
    },
  });

  const selectWinner = useMutation({
    mutationFn: (variantId: string) =>
      api.post<Experiment>(`/api/v1/experiments/${experimentId}/complete`, {
        winner_variant_id: variantId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment", experimentId] });
    },
  });

  const generatePR = useMutation({
    mutationFn: (variantId: string) =>
      api.post<PullRequest>("/api/v1/pull-requests/generate", {
        experiment_id: experimentId,
        variant_id: variantId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["experiment-prs", experimentId] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    );
  }

  if (!experiment) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Experiment not found</p>
      </div>
    );
  }

  const control = variants?.find((v) => v.is_control);
  const treatmentVariants = variants?.filter((v) => !v.is_control) || [];
  const winnerVariant = variants?.find((v) => v.id === experiment.winner_variant_id);
  const hasPR = pullRequests && pullRequests.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-zinc-900">
              {experiment.name}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[experiment.status]}`}
            >
              {experiment.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-500">{experiment.description}</p>
        </div>

        <div className="flex gap-2">
          {experiment.status === "pending" && (
            <button
              onClick={() => activateExperiment.mutate()}
              disabled={activateExperiment.isPending}
              className="rounded-md bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-lime-500 disabled:opacity-50"
            >
              Activate
            </button>
          )}
          {experiment.status === "active" && (
            <button
              onClick={() => pauseExperiment.mutate()}
              disabled={pauseExperiment.isPending}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {(experiment.status === "active" || experiment.status === "paused") && (
            <Link
              href={`/experiments/${experimentId}/compare`}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Compare Variants
            </Link>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Target URL</p>
          <a
            href={experiment.target_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 text-sm font-medium text-lime-600 hover:text-lime-700 truncate block"
          >
            {experiment.target_url}
          </a>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Traffic Allocation</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {experiment.traffic_allocation}%
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <p className="text-sm text-zinc-500">Created</p>
          <p className="mt-1 text-sm font-medium text-zinc-900">
            {new Date(experiment.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Winner Banner */}
      {experiment.status === "completed" && winnerVariant && (
        <div className="rounded-lg border-2 border-lime-400 bg-lime-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-lime-800">
                Winner: {winnerVariant.name}
              </p>
              <p className="text-sm text-lime-700">
                {winnerVariant.conversions} conversions from{" "}
                {winnerVariant.impressions} impressions (
                {winnerVariant.impressions > 0
                  ? ((winnerVariant.conversions / winnerVariant.impressions) * 100).toFixed(1)
                  : 0}
                % conversion rate)
              </p>
            </div>
            {!hasPR && (
              <button
                onClick={() => generatePR.mutate(winnerVariant.id)}
                disabled={generatePR.isPending}
                className="rounded-md bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-lime-500 disabled:opacity-50"
              >
                {generatePR.isPending ? "Generating..." : "Generate PR"}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pull Requests */}
      {hasPR && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4">
          <h3 className="font-medium text-zinc-900 mb-3">Pull Requests</h3>
          <div className="space-y-2">
            {pullRequests.map((pr) => (
              <div
                key={pr.id}
                className="flex items-center justify-between py-2 border-b border-zinc-100 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {pr.branch_name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Status: {pr.status}
                    {pr.error_message && ` - ${pr.error_message}`}
                  </p>
                </div>
                {pr.github_pr_url && (
                  <a
                    href={pr.github_pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-lime-600 hover:text-lime-700"
                  >
                    View PR #{pr.github_pr_number}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Variants */}
      <div>
        <h2 className="text-lg font-medium text-zinc-900 mb-4">Variants</h2>

        {/* Control */}
        {control && (
          <div className="mb-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-zinc-900">{control.name}</h3>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                      Control
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {control.description || "Original version (no changes)"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold text-zinc-900">
                    {control.impressions > 0
                      ? ((control.conversions / control.impressions) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                  <p className="text-xs text-zinc-500">
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
            const conversionRate =
              variant.impressions > 0
                ? (variant.conversions / variant.impressions) * 100
                : 0;
            const controlRate =
              control && control.impressions > 0
                ? (control.conversions / control.impressions) * 100
                : 0;
            const lift = controlRate > 0 ? ((conversionRate - controlRate) / controlRate) * 100 : 0;

            return (
              <div
                key={variant.id}
                className={`rounded-lg border bg-white p-4 ${
                  isWinner ? "border-lime-400 ring-1 ring-lime-400" : "border-zinc-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-zinc-900">{variant.name}</h3>
                      {isWinner && (
                        <span className="inline-flex items-center rounded-full bg-lime-100 px-2 py-0.5 text-xs font-medium text-lime-700">
                          Winner
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {variant.description}
                    </p>
                    {variant.patches.length > 0 && (
                      <p className="mt-2 text-xs text-zinc-400">
                        {variant.patches.length} DOM patch
                        {variant.patches.length !== 1 ? "es" : ""}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold text-zinc-900">
                      {conversionRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-zinc-500">
                      {variant.conversions} / {variant.impressions}
                    </p>
                    {lift !== 0 && (
                      <p
                        className={`text-xs font-medium ${
                          lift > 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {lift > 0 ? "+" : ""}
                        {lift.toFixed(1)}% vs control
                      </p>
                    )}
                  </div>
                </div>

                {experiment.status !== "completed" &&
                  experiment.status !== "draft" && (
                    <div className="mt-4 pt-4 border-t border-zinc-100">
                      <button
                        onClick={() => selectWinner.mutate(variant.id)}
                        disabled={selectWinner.isPending}
                        className="text-sm text-lime-600 hover:text-lime-700 font-medium disabled:opacity-50"
                      >
                        Select as Winner
                      </button>
                    </div>
                  )}
              </div>
            );
          })}
        </div>

        {treatmentVariants.length === 0 && experiment.status === "draft" && (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center">
            <p className="text-zinc-500">Variants are being generated...</p>
            <p className="mt-1 text-sm text-zinc-400">
              This may take a minute while AI analyzes your page
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
