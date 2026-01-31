"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ComparisonData, Variant } from "@/types";

export default function CompareVariantsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const experimentId = params.experimentId as string;

  const [selectedVariants, setSelectedVariants] = useState<[string, string]>([
    "",
    "",
  ]);
  const [syncScroll, setSyncScroll] = useState(true);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const { data: comparison, isLoading } = useQuery({
    queryKey: ["experiment-comparison", experimentId],
    queryFn: () =>
      api.get<ComparisonData>(`/api/v1/experiments/${experimentId}/comparison`),
  });

  const selectWinner = useMutation({
    mutationFn: (variantId: string) =>
      api.post(`/api/v1/experiments/${experimentId}/complete`, {
        winner_variant_id: variantId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["experiment-comparison", experimentId],
      });
      router.push(`/experiments/${experimentId}`);
    },
  });

  // Initialize selected variants
  useEffect(() => {
    if (comparison?.variants && comparison.variants.length >= 2) {
      const control = comparison.variants.find((v) => v.is_control);
      const firstTreatment = comparison.variants.find((v) => !v.is_control);
      if (control && firstTreatment) {
        setSelectedVariants([control.id, firstTreatment.id]);
      } else if (comparison.variants.length >= 2) {
        setSelectedVariants([
          comparison.variants[0].id,
          comparison.variants[1].id,
        ]);
      }
    }
  }, [comparison]);

  // Synchronized scrolling
  useEffect(() => {
    if (!syncScroll) return;

    const handleScroll = (source: "left" | "right") => {
      if (isScrolling.current) return;
      isScrolling.current = true;

      const sourceRef = source === "left" ? leftPanelRef : rightPanelRef;
      const targetRef = source === "left" ? rightPanelRef : leftPanelRef;

      if (sourceRef.current && targetRef.current) {
        targetRef.current.scrollTop = sourceRef.current.scrollTop;
      }

      requestAnimationFrame(() => {
        isScrolling.current = false;
      });
    };

    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;

    const leftHandler = () => handleScroll("left");
    const rightHandler = () => handleScroll("right");

    leftPanel?.addEventListener("scroll", leftHandler);
    rightPanel?.addEventListener("scroll", rightHandler);

    return () => {
      leftPanel?.removeEventListener("scroll", leftHandler);
      rightPanel?.removeEventListener("scroll", rightHandler);
    };
  }, [syncScroll]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-lime-400 border-t-transparent" />
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-500">Comparison data not found</p>
      </div>
    );
  }

  const leftVariant = comparison.variants.find(
    (v) => v.id === selectedVariants[0]
  );
  const rightVariant = comparison.variants.find(
    (v) => v.id === selectedVariants[1]
  );

  const getConversionRate = (variant: Variant) =>
    variant.impressions > 0
      ? ((variant.conversions / variant.impressions) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">
              Compare Variants
            </h1>
            <p className="text-sm text-zinc-500">{comparison.experiment.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={(e) => setSyncScroll(e.target.checked)}
                className="rounded border-zinc-300 text-lime-500 focus:ring-lime-500"
              />
              Sync scroll
            </label>
            <button
              onClick={() => router.back()}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      {comparison.ai_analysis && (
        <div className="flex-shrink-0 my-4 rounded-lg bg-zinc-50 border border-zinc-200 p-4">
          <p className="text-xs font-medium text-zinc-500 uppercase mb-2">
            AI Analysis
          </p>
          <p className="text-sm text-zinc-700">{comparison.ai_analysis}</p>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-3">
            <select
              value={selectedVariants[0]}
              onChange={(e) =>
                setSelectedVariants([e.target.value, selectedVariants[1]])
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
            >
              {comparison.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.is_control ? "(Control)" : ""}
                </option>
              ))}
            </select>
          </div>

          {leftVariant && (
            <>
              <div className="flex-shrink-0 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-semibold text-zinc-900">
                    {getConversionRate(leftVariant)}%
                  </span>
                  <span className="ml-2 text-sm text-zinc-500">
                    ({leftVariant.conversions}/{leftVariant.impressions})
                  </span>
                </div>
                {!leftVariant.is_control && (
                  <button
                    onClick={() => selectWinner.mutate(leftVariant.id)}
                    disabled={selectWinner.isPending}
                    className="rounded-md bg-lime-400 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-lime-500 disabled:opacity-50"
                  >
                    Select Winner
                  </button>
                )}
              </div>

              <div
                ref={leftPanelRef}
                className="flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white"
              >
                {leftVariant.screenshot_url ? (
                  <img
                    src={leftVariant.screenshot_url}
                    alt={leftVariant.name}
                    className="w-full"
                  />
                ) : (
                  <div className="p-4">
                    <p className="text-sm font-medium text-zinc-700 mb-2">
                      {leftVariant.description}
                    </p>
                    {leftVariant.patches.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase mb-2">
                          DOM Patches
                        </p>
                        <div className="space-y-2">
                          {leftVariant.patches.map((patch, i) => (
                            <div
                              key={i}
                              className="rounded bg-zinc-50 p-2 text-xs font-mono"
                            >
                              <span className="text-lime-600">{patch.action}</span>
                              <span className="text-zinc-400"> @ </span>
                              <span className="text-zinc-700">
                                {patch.selector}
                              </span>
                              {patch.value && (
                                <>
                                  <span className="text-zinc-400"> = </span>
                                  <span className="text-blue-600">
                                    {patch.value.slice(0, 50)}
                                    {patch.value.length > 50 ? "..." : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-3">
            <select
              value={selectedVariants[1]}
              onChange={(e) =>
                setSelectedVariants([selectedVariants[0], e.target.value])
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
            >
              {comparison.variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} {v.is_control ? "(Control)" : ""}
                </option>
              ))}
            </select>
          </div>

          {rightVariant && (
            <>
              <div className="flex-shrink-0 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-semibold text-zinc-900">
                    {getConversionRate(rightVariant)}%
                  </span>
                  <span className="ml-2 text-sm text-zinc-500">
                    ({rightVariant.conversions}/{rightVariant.impressions})
                  </span>
                </div>
                {!rightVariant.is_control && (
                  <button
                    onClick={() => selectWinner.mutate(rightVariant.id)}
                    disabled={selectWinner.isPending}
                    className="rounded-md bg-lime-400 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-lime-500 disabled:opacity-50"
                  >
                    Select Winner
                  </button>
                )}
              </div>

              <div
                ref={rightPanelRef}
                className="flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white"
              >
                {rightVariant.screenshot_url ? (
                  <img
                    src={rightVariant.screenshot_url}
                    alt={rightVariant.name}
                    className="w-full"
                  />
                ) : (
                  <div className="p-4">
                    <p className="text-sm font-medium text-zinc-700 mb-2">
                      {rightVariant.description}
                    </p>
                    {rightVariant.patches.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-zinc-500 uppercase mb-2">
                          DOM Patches
                        </p>
                        <div className="space-y-2">
                          {rightVariant.patches.map((patch, i) => (
                            <div
                              key={i}
                              className="rounded bg-zinc-50 p-2 text-xs font-mono"
                            >
                              <span className="text-lime-600">{patch.action}</span>
                              <span className="text-zinc-400"> @ </span>
                              <span className="text-zinc-700">
                                {patch.selector}
                              </span>
                              {patch.value && (
                                <>
                                  <span className="text-zinc-400"> = </span>
                                  <span className="text-blue-600">
                                    {patch.value.slice(0, 50)}
                                    {patch.value.length > 50 ? "..." : ""}
                                  </span>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
