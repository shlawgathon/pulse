"use client";

/**
 * Sites listing page.
 */
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Globe, Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { Site } from "@/types";

function SiteCard({ site }: { site: Site }) {
  const [copied, setCopied] = useState(false);

  const copyScriptTag = async () => {
    await navigator.clipboard.writeText(site.script_tag);
    setCopied(true);
    toast.success("Script tag copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card rounded-lg border p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium">{site.name}</h3>
            <p className="text-sm text-muted-foreground">{site.domain}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${site.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
        >
          {site.is_active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="bg-muted rounded-md p-3 mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Script Tag</span>
          <button
            onClick={copyScriptTag}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>
        </div>
        <code className="text-xs text-muted-foreground break-all">
          {site.script_tag}
        </code>
      </div>

      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>Added {new Date(site.created_at).toLocaleDateString()}</span>
        <Link
          href={`/sites/${site.id}`}
          className="text-primary hover:underline"
        >
          View details →
        </Link>
      </div>
    </div>
  );
}

export default function SitesPage() {
  const { data: sites, isLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.get<Site[]>("/api/v1/sites"),
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Sites</h1>
        <Link
          href="/sites/new"
          className="cta-button inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          ADD SITE
        </Link>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-card rounded-lg border p-4 animate-pulse"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-muted rounded-lg" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-32" />
                </div>
              </div>
              <div className="h-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : sites && sites.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {sites.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-lg border p-12 text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No sites yet</h3>
          <p className="text-muted-foreground mb-6">
            Add your first site to start running experiments.
          </p>
          <Link
            href="/sites/new"
            className="cta-button inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            ADD YOUR FIRST SITE
          </Link>
        </div>
      )}
    </div>
  );
}
