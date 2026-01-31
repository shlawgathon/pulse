"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ErrorAlert } from "@/components/error-alert";
import { ButtonLoading } from "@/components/loading-spinner";
import type { Site, Experiment } from "@/types";

const experimentSchema = z.object({
  site_id: z.string().min(1, "Please select a site"),
  name: z.string().min(1, "Experiment name is required"),
  description: z.string().optional(),
  target_url: z.string().url("Please enter a valid URL"),
  url_pattern: z.string().optional(),
  optimization_goal: z.string().optional(),
  num_variants: z.number().min(1).max(4),
});

type ExperimentFormData = z.infer<typeof experimentSchema>;

export default function NewExperimentPage() {
  const router = useRouter();

  const form = useForm<ExperimentFormData>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      site_id: "",
      name: "",
      description: "",
      target_url: "",
      url_pattern: "",
      optimization_goal: "",
      num_variants: 2,
    },
  });

  const { data: sites, isLoading: sitesLoading } = useQuery({
    queryKey: ["sites"],
    queryFn: () => api.get<Site[]>("/api/v1/sites"),
  });

  const createExperiment = useMutation({
    mutationFn: (data: ExperimentFormData) =>
      api.post<Experiment>("/api/v1/experiments", data),
    onSuccess: (experiment) => {
      router.push(`/experiments/${experiment.id}`);
    },
  });

  const onSubmit = (data: ExperimentFormData) => {
    createExperiment.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">
          Create Experiment
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up a new A/B test to optimize your UX
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="site_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={sitesLoading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a site" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {sites?.map((site) => (
                      <SelectItem key={site.id} value={site.id}>
                        {site.name} ({site.domain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experiment Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Homepage CTA Optimization"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="What are you trying to improve?"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/page-to-optimize"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  The page where you want to run the experiment
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="url_pattern"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL Pattern (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., /products/* or /blog/**" {...field} />
                </FormControl>
                <FormDescription>
                  Match multiple pages with wildcards. Leave empty for exact URL
                  match.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="optimization_goal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Optimization Goal</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Increase sign-ups, Improve click-through rate"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Tell the AI what you want to optimize for
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="num_variants"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Number of Variants</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  defaultValue={String(field.value)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select number of variants" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="1">1 variant</SelectItem>
                    <SelectItem value="2">2 variants</SelectItem>
                    <SelectItem value="3">3 variants</SelectItem>
                    <SelectItem value="4">4 variants</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  AI will generate this many variant suggestions (plus the
                  control)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <ErrorAlert
            error={createExperiment.error}
            fallbackMessage="Failed to create experiment"
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createExperiment.isPending}
              className="flex-1"
            >
              <ButtonLoading
                loading={createExperiment.isPending}
                loadingText="Creating..."
              >
                Create Experiment
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
