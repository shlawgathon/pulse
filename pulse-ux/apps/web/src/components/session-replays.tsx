"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import { SessionPlayer } from "@/components/session-player";
import type { Variant, SessionRecordingListItem, SessionRecordingDetail } from "@/types";

interface SessionReplaysProps {
  experimentId: string;
  variants: Variant[];
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function SessionReplays({ experimentId, variants }: SessionReplaysProps) {
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [variantFilter, setVariantFilter] = useState<string | null>(null);

  // Fetch recordings list
  const { data: recordings, isLoading } = useQuery({
    queryKey: ["session-recordings", experimentId, variantFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (variantFilter) params.set("variant_id", variantFilter);
      return api.get<SessionRecordingListItem[]>(`/api/v1/experiments/${experimentId}/recordings?${params}`);
    }
  });

  // Fetch selected recording details
  const { data: selectedRecording, isLoading: isLoadingRecording } = useQuery({
    queryKey: ["session-recording", experimentId, selectedRecordingId],
    queryFn: () =>
      api.get<SessionRecordingDetail>(`/api/v1/experiments/${experimentId}/recordings/${selectedRecordingId}`),
    enabled: !!selectedRecordingId
  });

  // Get variant name by ID
  const getVariantName = (variantId: string) => {
    const variant = variants.find((v) => v.id === variantId);
    return variant?.name || "Unknown";
  };

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading recordings...</div>;
  }

  if (!recordings || recordings.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg border-dashed">
        <p className="text-muted-foreground">No session recordings yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Recordings will appear when visitors interact with your experiment
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Variant Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={variantFilter === null ? "default" : "outline"}
          size="sm"
          onClick={() => setVariantFilter(null)}
        >
          All
        </Button>
        {variants.map((variant) => (
          <Button
            key={variant.id}
            variant={variantFilter === variant.id ? "default" : "outline"}
            size="sm"
            onClick={() => setVariantFilter(variant.id)}
          >
            {variant.name}
          </Button>
        ))}
      </div>

      {/* Recordings List */}
      <div className="space-y-2">
        {recordings.map((recording) => (
          <div
            key={recording.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => setSelectedRecordingId(recording.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">
                {getVariantName(recording.variant_id)} -{" "}
                <span className="text-muted-foreground font-normal">{recording.visitor_id.slice(0, 12)}...</span>
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {formatDate(recording.started_at)} - {formatDuration(recording.duration_ms)} - {recording.url}
              </p>
            </div>
            <div className="text-right ml-4">
              <p className="text-sm">{recording.events_count} events</p>
              {!recording.is_complete && <span className="text-xs text-amber-600">Incomplete</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Player Dialog */}
      <Dialog open={!!selectedRecordingId} onOpenChange={(open) => !open && setSelectedRecordingId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Session Replay</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-auto">
            {isLoadingRecording ? (
              <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                Loading recording...
              </div>
            ) : selectedRecording ? (
              <SessionPlayer events={selectedRecording.events} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
