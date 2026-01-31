"use client";

/**
 * Settings page for user profile management.
 * Uses react-hook-form with zod validation.
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { User, Building, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ButtonLoading } from "@/components/loading-spinner";

const settingsSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email(),
    organization_name: z.string().optional(),
    current_password: z.string().optional(),
    new_password: z.string().optional(),
    confirm_password: z.string().optional()
  })
  .refine(
    (data) => {
      if (data.new_password && data.new_password !== data.confirm_password) {
        return false;
      }
      return true;
    },
    {
      message: "Passwords do not match",
      path: ["confirm_password"]
    }
  )
  .refine(
    (data) => {
      if (data.new_password && !data.current_password) {
        return false;
      }
      return true;
    },
    {
      message: "Current password is required to set a new password",
      path: ["current_password"]
    }
  );

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: "Demo User",
      email: "demo@example.com",
      organization_name: "My Organization",
      current_password: "",
      new_password: "",
      confirm_password: ""
    }
  });

  const onSubmit = async (data: SettingsFormData) => {
    // TODO: Implement save functionality
    console.log("Form data:", data);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Settings saved successfully!");
    // Reset password fields after save
    form.resetField("current_password");
    form.resetField("new_password");
    form.resetField("confirm_password");
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Profile Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-base font-medium">
                <User className="h-5 w-5 text-muted-foreground" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" disabled {...field} />
                    </FormControl>
                    <FormDescription>Email cannot be changed</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Organization Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-base font-medium">
                <Building className="h-5 w-5 text-muted-foreground" />
                Organization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="organization_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-base font-medium">
                <Lock className="h-5 w-5 text-muted-foreground" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="current_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button type="submit" disabled={form.formState.isSubmitting} className="cta-button">
            <ButtonLoading loading={form.formState.isSubmitting} loadingText="SAVING...">
              SAVE CHANGES
            </ButtonLoading>
          </Button>
        </form>
      </Form>
    </div>
  );
}
