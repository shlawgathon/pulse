"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Site, Experiment, ExperimentCreate } from "@/types";

export default function NewExperimentPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ExperimentCreate>({
    site_id: "",
    name: "",
    description: "",
    target_url: "",
    url_pattern: "",
    optimization_goal: "",
    num_variants: 2,
  });

  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.get<Site[]>("/api/v1/sites"),
  });

  const createExperiment = useMutation({
    mutationFn: (data: ExperimentCreate) =>
      api.post<Experiment>("/api/v1/experiments", data),
    onSuccess: (experiment) => {
      router.push(`/experiments/${experiment.id}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExperiment.mutate(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Create Experiment
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Set up a new A/B test to optimize your UX
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Site Selection */}
        <div>
          <label
            htmlFor="site"
            className="block text-sm font-medium text-zinc-700"
          >
            Site
          </label>
          <select
            id="site"
            required
            disabled={sitesLoading}
            value={formData.site_id}
            onChange={(e) =>
              setFormData({ ...formData, site_id: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          >
            <option value="">Select a site</option>
            {sites?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.domain})
              </option>
            ))}
          </select>
        </div>

        {/* Experiment Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-zinc-700"
          >
            Experiment Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Homepage CTA Optimization"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-zinc-700"
          >
            Description
          </label>
          <textarea
            id="description"
            rows={3}
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="What are you trying to improve?"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
        </div>

        {/* Target URL */}
        <div>
          <label
            htmlFor="target_url"
            className="block text-sm font-medium text-zinc-700"
          >
            Target URL
          </label>
          <input
            type="url"
            id="target_url"
            required
            value={formData.target_url}
            onChange={(e) =>
              setFormData({ ...formData, target_url: e.target.value })
            }
            placeholder="https://example.com/page-to-optimize"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            The page where you want to run the experiment
          </p>
        </div>

        {/* URL Pattern */}
        <div>
          <label
            htmlFor="url_pattern"
            className="block text-sm font-medium text-zinc-700"
          >
            URL Pattern (optional)
          </label>
          <input
            type="text"
            id="url_pattern"
            value={formData.url_pattern}
            onChange={(e) =>
              setFormData({ ...formData, url_pattern: e.target.value })
            }
            placeholder="e.g., /products/* or /blog/**"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Match multiple pages with wildcards. Leave empty for exact URL match.
          </p>
        </div>

        {/* Optimization Goal */}
        <div>
          <label
            htmlFor="optimization_goal"
            className="block text-sm font-medium text-zinc-700"
          >
            Optimization Goal
          </label>
          <input
            type="text"
            id="optimization_goal"
            value={formData.optimization_goal}
            onChange={(e) =>
              setFormData({ ...formData, optimization_goal: e.target.value })
            }
            placeholder="e.g., Increase sign-ups, Improve click-through rate"
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          />
          <p className="mt-1 text-xs text-zinc-500">
            Tell the AI what you want to optimize for
          </p>
        </div>

        {/* Number of Variants */}
        <div>
          <label
            htmlFor="num_variants"
            className="block text-sm font-medium text-zinc-700"
          >
            Number of Variants
          </label>
          <select
            id="num_variants"
            value={formData.num_variants}
            onChange={(e) =>
              setFormData({ ...formData, num_variants: parseInt(e.target.value) })
            }
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500"
          >
            <option value={1}>1 variant</option>
            <option value={2}>2 variants</option>
            <option value={3}>3 variants</option>
            <option value={4}>4 variants</option>
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            AI will generate this many variant suggestions (plus the control)
          </p>
        </div>

        {/* Error Display */}
        {createExperiment.error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">
              {createExperiment.error instanceof Error
                ? createExperiment.error.message
                : "Failed to create experiment"}
            </p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createExperiment.isPending}
            className="flex-1 rounded-md bg-lime-400 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-lime-500 disabled:opacity-50"
          >
            {createExperiment.isPending ? "Creating..." : "Create Experiment"}
          </button>
        </div>
      </form>
    </div>
  );
}
