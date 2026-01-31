"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { VariantPreview, VariantPreviewFallback } from "@/components/variant-preview";
import type { PreviewResponse, PreviewStatus, Variant } from "@/types";
import { ExternalLink, Loader2, Play, Monitor } from "lucide-react";

interface DaytonaVariantPreviewProps {
    experimentId: string;
    variant: Variant;
    baseHtml: string | null;
    className?: string;
}

/**
 * DaytonaVariantPreview provides live interactive previews using Daytona sandboxes.
 * Falls back to static iframe preview if Daytona is unavailable.
 */
export function DaytonaVariantPreview({
    experimentId,
    variant,
    baseHtml,
    className = "",
}: DaytonaVariantPreviewProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [showLivePreview, setShowLivePreview] = useState(false);

    // Check if Daytona is available
    const { data: previewStatus } = useQuery({
        queryKey: ["preview-status"],
        queryFn: () => api.get<PreviewStatus>("/api/v1/experiments/preview/status"),
        staleTime: 60000, // Cache for 1 minute
    });

    // Create preview mutation
    const createPreview = useMutation({
        mutationFn: () =>
            api.post<PreviewResponse>(
                `/api/v1/experiments/${experimentId}/variants/${variant.id}/preview`,
                { ttl_seconds: 3600 }
            ),
        onSuccess: (data) => {
            setPreviewUrl(data.preview_url);
            setShowLivePreview(true);
        },
    });

    const handleLaunchPreview = () => {
        createPreview.mutate();
    };

    const isDaytonaAvailable = previewStatus?.available ?? false;

    // If showing live preview with URL
    if (showLivePreview && previewUrl) {
        return (
            <div className={`flex flex-col h-full ${className}`}>
                <div className="flex-shrink-0 flex items-center justify-between p-2 bg-emerald-50 dark:bg-emerald-950 border-b">
                    <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                        <Monitor className="h-4 w-4" />
                        <span>Live Preview</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 flex items-center gap-1"
                        >
                            Open in new tab
                            <ExternalLink className="h-3 w-3" />
                        </a>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowLivePreview(false)}
                            className="text-xs h-6"
                        >
                            Static Preview
                        </Button>
                    </div>
                </div>
                <iframe
                    src={previewUrl}
                    title={`Live Preview of ${variant.name}`}
                    className="flex-1 w-full border-0 bg-white"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
            </div>
        );
    }

    // Static preview with optional launch button
    return (
        <div className={`flex flex-col h-full ${className}`}>
            {isDaytonaAvailable && (
                <div className="flex-shrink-0 flex items-center justify-between p-2 bg-muted/50 border-b">
                    <span className="text-xs text-muted-foreground">Static Preview</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLaunchPreview}
                        disabled={createPreview.isPending}
                        className="text-xs h-6 gap-1"
                    >
                        {createPreview.isPending ? (
                            <>
                                <Loader2 className="h-3 w-3 animate-spin" />
                                Launching...
                            </>
                        ) : (
                            <>
                                <Play className="h-3 w-3" />
                                Live Preview
                            </>
                        )}
                    </Button>
                </div>
            )}
            <div className="flex-1 overflow-auto">
                {baseHtml ? (
                    <VariantPreview
                        baseHtml={baseHtml}
                        variant={variant}
                        className="min-h-[500px]"
                    />
                ) : (
                    <VariantPreviewFallback variant={variant} />
                )}
            </div>
        </div>
    );
}
