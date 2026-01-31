"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { Site } from "@/types";

const siteSchema = z.object({
  name: z.string().min(1, "Site name is required"),
  domain: z.string().min(1, "Domain is required"),
  github_repo: z.string().optional(),
  github_pat: z.string().optional(),
});

type SiteFormData = z.infer<typeof siteSchema>;

export default function NewSitePage() {
  const router = useRouter();

  const form = useForm<SiteFormData>({
    resolver: zodResolver(siteSchema),
    defaultValues: {
      name: "",
      domain: "",
      github_repo: "",
      github_pat: "",
    },
  });

  const createSite = useMutation({
    mutationFn: (data: SiteFormData) => {
      // Clean up empty optional fields
      const payload = {
        name: data.name,
        domain: data.domain,
        ...(data.github_repo && { github_repo: data.github_repo }),
        ...(data.github_pat && { github_pat: data.github_pat }),
      };
      return api.post<Site>("/api/v1/sites", payload);
    },
    onSuccess: (site) => {
      router.push(`/sites/${site.id}`);
    },
  });

  const onSubmit = (data: SiteFormData) => {
    createSite.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Add Site</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Register a website to start running A/B tests
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Site Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., My Company Website" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., example.com" {...field} />
                </FormControl>
                <FormDescription>
                  The domain where the actuator script will be installed
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* GitHub Integration (Optional) */}
          <div className="pt-4 border-t border-border">
            <h2 className="text-sm font-medium text-foreground mb-4">
              GitHub Integration (Optional)
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Connect a GitHub repository to automatically generate Pull Requests
              for winning variants.
            </p>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="github_repo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repository</FormLabel>
                    <FormControl>
                      <Input placeholder="owner/repository" {...field} />
                    </FormControl>
                    <FormDescription>
                      Format: owner/repository (e.g., acme/website)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="github_pat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Access Token</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Generate a token with &quot;repo&quot; scope at{" "}
                      <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        github.com/settings/tokens
                      </a>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <ErrorAlert
            error={createSite.error}
            fallbackMessage="Failed to create site"
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
              disabled={createSite.isPending}
              className="flex-1"
            >
              <ButtonLoading loading={createSite.isPending} loadingText="Creating...">
                Add Site
              </ButtonLoading>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
