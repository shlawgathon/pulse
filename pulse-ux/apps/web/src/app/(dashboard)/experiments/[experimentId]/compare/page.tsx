"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageLoading } from "@/components/loading-spinner";
import { VariantPreview } from "@/components/variant-preview";
import { formatConversionRate } from "@/lib/utils";
import type { ComparisonData, Variant } from "@/types";
import { Send, MessageSquare, Loader2 } from "lucide-react";

// Storage key for persisting comparison state
const STORAGE_KEY_PREFIX = "pulse-compare-state-";

interface CompareState {
  selectedVariants: [string | null, string | null];
  syncScroll: boolean;
  scrollPositions: { left: number; right: number };
  chatMessages: ChatMessage[];
  timestamp: number;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function CompareVariantsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const experimentId = params.experimentId as string;
  const storageKey = `${STORAGE_KEY_PREFIX}${experimentId}`;

  // Load persisted state
  const loadPersistedState = (): Partial<CompareState> => {
    if (typeof window === "undefined") return {};
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CompareState;
        // Only use state from last 24 hours
        if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          return parsed;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return {};
  };

  const persistedState = useMemo(loadPersistedState, [storageKey]);

  const [syncScroll, setSyncScroll] = useState(persistedState.syncScroll ?? true);
  const [userSelectedVariants, setUserSelectedVariants] = useState<[string | null, string | null]>(
    persistedState.selectedVariants ?? [null, null]
  );
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(persistedState.chatMessages ?? []);
  const [chatInput, setChatInput] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(false);

  const leftIframeRef = useRef<HTMLIFrameElement>(null);
  const rightIframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
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

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const state: CompareState = {
      selectedVariants: userSelectedVariants,
      syncScroll,
      scrollPositions: { left: 0, right: 0 },
      chatMessages,
      timestamp: Date.now()
    };
    localStorage.setItem(storageKey, JSON.stringify(state));
  }, [userSelectedVariants, syncScroll, chatMessages, storageKey]);

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

  // Synchronized scrolling between iframes using postMessage
  useEffect(() => {
    if (!syncScroll) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "pulse-scroll") return;
      if (isScrolling.current) return;

      isScrolling.current = true;
      const { source, scrollTop, scrollLeft } = event.data;

      const targetIframe = source === "left" ? rightIframeRef.current : leftIframeRef.current;
      if (targetIframe?.contentWindow) {
        targetIframe.contentWindow.postMessage(
          {
            type: "pulse-scroll-to",
            scrollTop,
            scrollLeft
          },
          "*"
        );
      }

      requestAnimationFrame(() => {
        isScrolling.current = false;
      });
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [syncScroll]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

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

  const handleChatSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim() || isChatSending) return;

      const userMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: chatInput.trim(),
        timestamp: Date.now()
      };

      setChatMessages((prev) => [...prev, userMessage]);
      setChatInput("");
      setIsChatSending(true);

      try {
        // TODO: Connect to LLM API for modifications
        // For now, simulate a response
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const assistantMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `I'll help you with: "${userMessage.content}". This feature is coming soon - I'll be able to suggest DOM patches to modify the variants based on your feedback.`,
          timestamp: Date.now()
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
      } catch {
        const errorMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: Date.now()
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsChatSending(false);
      }
    },
    [chatInput, isChatSending]
  );

  const handleClearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

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
    <div className="p-6 h-[calc(100vh-4rem)] flex flex-col">
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

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        {/* Comparison Grid */}
        <div className={`grid grid-cols-2 gap-4 ${chatExpanded ? "flex-1" : "flex-[2]"} min-h-0`}>
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

                <div className="flex-1 overflow-hidden rounded-lg border bg-card">
                  {comparison.experiment.base_html_snapshot ? (
                    <VariantPreview
                      ref={leftIframeRef}
                      baseHtml={comparison.experiment.base_html_snapshot}
                      variant={leftVariant}
                      targetUrl={comparison.experiment.target_url}
                      className="min-h-[400px]"
                      enableScrollSync
                      scrollSyncId="left"
                    />
                  ) : leftVariant.screenshot_url ? (
                    <div className="relative w-full h-full overflow-auto">
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

                <div className="flex-1 overflow-hidden rounded-lg border bg-card">
                  {comparison.experiment.base_html_snapshot ? (
                    <VariantPreview
                      ref={rightIframeRef}
                      baseHtml={comparison.experiment.base_html_snapshot}
                      variant={rightVariant}
                      targetUrl={comparison.experiment.target_url}
                      className="min-h-[400px]"
                      enableScrollSync
                      scrollSyncId="right"
                    />
                  ) : rightVariant.screenshot_url ? (
                    <div className="relative w-full h-full overflow-auto">
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

        {/* Chat Section */}
        <div
          className={`flex-shrink-0 border rounded-lg bg-card transition-all duration-300 ${chatExpanded ? "flex-1 min-h-[200px]" : "h-14"}`}
        >
          {/* Chat Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b cursor-pointer hover:bg-muted/50"
            onClick={() => setChatExpanded(!chatExpanded)}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Modification Chat</span>
              {chatMessages.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {chatMessages.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {chatMessages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearChat();
                  }}
                >
                  Clear
                </Button>
              )}
              <span className="text-xs text-muted-foreground">
                {chatExpanded ? "Click to collapse" : "Click to expand"}
              </span>
            </div>
          </div>

          {/* Chat Content */}
          {chatExpanded && (
            <div className="flex flex-col h-[calc(100%-48px)]">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    <p>Describe modifications you&apos;d like to make to the variants.</p>
                    <p className="text-xs mt-1">
                      e.g., &quot;Make the CTA button larger&quot; or &quot;Change the headline to be more urgent&quot;
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleChatSubmit} className="flex-shrink-0 border-t p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Describe your modification..."
                    className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={isChatSending}
                  />
                  <Button type="submit" size="sm" disabled={!chatInput.trim() || isChatSending}>
                    {isChatSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </div>
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
