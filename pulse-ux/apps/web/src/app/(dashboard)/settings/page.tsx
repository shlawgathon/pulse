"use client";

/**
 * Settings page for user profile management.
 */
import { useState } from "react";
import { User, Building, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    // TODO: Implement save functionality
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Settings saved successfully!");
    setIsLoading(false);
  };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Profile Section */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-medium">Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <input
                type="text"
                defaultValue="Demo User"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                defaultValue="demo@example.com"
                className="w-full px-3 py-2 border rounded-md bg-background"
                disabled
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed
              </p>
            </div>
          </div>
        </section>

        {/* Organization Section */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Building className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-medium">Organization</h2>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Organization Name
            </label>
            <input
              type="text"
              defaultValue="My Organization"
              className="w-full px-3 py-2 border rounded-md bg-background"
            />
          </div>
        </section>

        {/* Password Section */}
        <section className="bg-card rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-medium">Password</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                New Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                className="w-full px-3 py-2 border rounded-md bg-background"
              />
            </div>
          </div>
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="cta-button bg-primary text-primary-foreground px-6 py-3 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              SAVING...
            </>
          ) : (
            "SAVE CHANGES"
          )}
        </button>
      </div>
    </div>
  );
}
