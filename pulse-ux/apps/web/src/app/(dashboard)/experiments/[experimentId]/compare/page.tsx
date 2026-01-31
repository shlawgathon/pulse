"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoading } from "@/components/loading-spinner";
import { VariantPreview, VariantPreviewFallback } from "@/components/variant-preview";
import { formatConversionRate } from "@/lib/utils";
import type { ComparisonData, Variant } from "@/types";

export default function CompareVariantsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const experimentId = params.experimentId as string;

  const [syncScroll, setSyncScroll] = useState(true);
  // Track user-selected variants (null = use defaults)
  const [userSelectedVariants, setUserSelectedVariants] = useState<[string | null, string | null]>([null, null]);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const { data: comparison, isLoading } = useQuery({
    queryKey: ["experiment-comparison", experimentId],
    queryFn: () => api.get<ComparisonData>(`/api/v1/experiments/${experimentId}/comparison`)
  });

  const selectWinner = useMutation({
    mutationFn: (variantId: string) =>
      api.post(`/api/v1/experiments/${experimentId}/complete`, {
        winner_variant_id: variantId
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["experiment-comparison", experimentId]
      });
      router.push(`/experiments/${experimentId}`);
    }
  });

  // Compute default selected variants from comparison data
  const defaultSelectedVariants = useMemo((): [string, string] => {
    if (!comparison?.variants || comparison.variants.length < 2) {
      return ["", ""];
    }
    const control = comparison.variants.find((v) => v.is_control);
    const firstTreatment = comparison.variants.find((v) => !v.is_control);
    if (control && firstTreatment) {
      return [control.id, firstTreatment.id];
    }
    return [comparison.variants[0].id, comparison.variants[1].id];
  }, [comparison]);

  // Derive actual selected variants from user selection or defaults
  const selectedVariants: [string, string] = useMemo(
    () => [
      userSelectedVariants[0] ?? defaultSelectedVariants[0],
      userSelectedVariants[1] ?? defaultSelectedVariants[1]
    ],
    [userSelectedVariants, defaultSelectedVariants]
  );

  // Synchronized scrolling with passive event listeners
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

    // Use passive event listeners for better scroll performance
    leftPanel?.addEventListener("scroll", leftHandler, { passive: true });
    rightPanel?.addEventListener("scroll", rightHandler, { passive: true });

    return () => {
      leftPanel?.removeEventListener("scroll", leftHandler);
      rightPanel?.removeEventListener("scroll", rightHandler);
    };
  }, [syncScroll]);

  // Memoized getConversionRate function
  const getConversionRate = useCallback((variant: Variant) => {
    return formatConversionRate(variant.conversions, variant.impressions);
  }, []);

  // Memoized variant lookups
  const leftVariant = useMemo(
    () => comparison?.variants.find((v) => v.id === selectedVariants[0]),
    [comparison?.variants, selectedVariants]
  );

  const rightVariant = useMemo(
    () => comparison?.variants.find((v) => v.id === selectedVariants[1]),
    [comparison?.variants, selectedVariants]
  );

  // Callbacks
  const handleLeftVariantChange = useCallback((value: string) => {
    setUserSelectedVariants((prev) => [value, prev[1]]);
  }, []);

  const handleRightVariantChange = useCallback((value: string) => {
    setUserSelectedVariants((prev) => [prev[0], value]);
  }, []);

  const handleSyncScrollChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSyncScroll(e.target.checked);
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleSelectWinner = useCallback(
    (variantId: string) => {
      selectWinner.mutate(variantId);
    },
    [selectWinner]
  );

  if (isLoading) {
    return <PageLoading message="Loading comparison..." />;
  }

  if (!comparison) {
    return (
      <div className="text-center py-12" role="status">
        <p className="text-muted-foreground">Comparison data not found</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Compare Variants</h1>
            <p className="text-sm text-muted-foreground">{comparison.experiment.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={syncScroll}
                onChange={handleSyncScrollChange}
                className="rounded border-input text-primary focus:ring-primary"
                aria-label="Synchronize scroll between panels"
              />
              Sync scroll
            </label>
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* AI Analysis */}
      {comparison.ai_analysis && (
        <div className="flex-shrink-0 my-4 rounded-lg bg-muted/50 border p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">AI Analysis</p>
          <p className="text-sm">{comparison.ai_analysis}</p>
        </div>
      )}

      {/* Comparison Grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
        {/* Left Panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-3">
            <Select value={selectedVariants[0]} onValueChange={handleLeftVariantChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                {comparison.variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} {v.is_control ? "(Control)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {leftVariant && (
            <>
              <div className="flex-shrink-0 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-semibold">{getConversionRate(leftVariant)}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({leftVariant.conversions}/{leftVariant.impressions})
                  </span>
                </div>
                {!leftVariant.is_control && (
                  <Button
                    size="sm"
                    onClick={() => handleSelectWinner(leftVariant.id)}
                    disabled={selectWinner.isPending}
                  >
                    Select Winner
                  </Button>
                )}
              </div>

              <div ref={leftPanelRef} className="flex-1 overflow-auto rounded-lg border bg-card">
                {comparison.experiment.base_html_snapshot ? (
                  <VariantPreview
                    baseHtml={comparison.experiment.base_html_snapshot}
                    variant={leftVariant}
                    targetUrl={comparison.experiment.target_url}
                    className="min-h-[500px]"
                  />
                ) : leftVariant.screenshot_url ? (
                  <div className="relative w-full">
                    <Image
                      src={leftVariant.screenshot_url}
                      alt={`Screenshot of ${leftVariant.name}`}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      unoptimized
                    />
                  </div>
                ) : (
                  <VariantDetails variant={leftVariant} />
                )}
              </div>
            </>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-3">
            <Select value={selectedVariants[1]} onValueChange={handleRightVariantChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select variant" />
              </SelectTrigger>
              <SelectContent>
                {comparison.variants.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} {v.is_control ? "(Control)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {rightVariant && (
            <>
              <div className="flex-shrink-0 mb-3 flex items-center justify-between">
                <div>
                  <span className="text-2xl font-semibold">{getConversionRate(rightVariant)}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({rightVariant.conversions}/{rightVariant.impressions})
                  </span>
                </div>
                {!rightVariant.is_control && (
                  <Button
                    size="sm"
                    onClick={() => handleSelectWinner(rightVariant.id)}
                    disabled={selectWinner.isPending}
                  >
                    Select Winner
                  </Button>
                )}
              </div>

              <div ref={rightPanelRef} className="flex-1 overflow-auto rounded-lg border bg-card">
                {comparison.experiment.base_html_snapshot ? (
                  <VariantPreview
                    baseHtml={comparison.experiment.base_html_snapshot}
                    variant={rightVariant}
                    targetUrl={comparison.experiment.target_url}
                    className="min-h-[500px]"
                  />
                ) : rightVariant.screenshot_url ? (
                  <div className="relative w-full">
                    <Image
                      src={rightVariant.screenshot_url}
                      alt={`Screenshot of ${rightVariant.name}`}
                      width={800}
                      height={600}
                      className="w-full h-auto"
                      unoptimized
                    />
                  </div>
                ) : (
                  <VariantDetails variant={rightVariant} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Extracted component for variant details
function VariantDetails({ variant }: { variant: Variant }) {
  return (
    <div className="p-4">
      <p className="text-sm font-medium mb-2">{variant.description}</p>
      {variant.patches.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">DOM Patches</p>
          <div className="space-y-2">
            {variant.patches.map((patch, i) => (
              <div key={`patch-${i}`} className="rounded bg-muted p-2 text-xs font-mono">
                <span className="text-primary">{patch.action}</span>
                <span className="text-muted-foreground"> @ </span>
                <span>{patch.selector}</span>
                {patch.value && (
                  <>
                    <span className="text-muted-foreground"> = </span>
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
  );
}
