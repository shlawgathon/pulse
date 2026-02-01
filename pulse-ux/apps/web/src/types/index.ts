/**
 * Type definitions for Pulse UX Optimizer.
 * These types match the backend API schemas.
 */

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  organization_name?: string | null;
  avatar_url?: string | null;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Site types
export interface Site {
  id: string;
  name: string;
  domain: string;
  public_key: string;
  allowed_origins: string[];
  github_repo?: string | null;
  is_active: boolean;
  created_at: string;
  script_tag: string;
}

export interface SiteCreate {
  name: string;
  domain: string;
  github_repo?: string;
  github_pat?: string;
}

// Experiment types
export type ExperimentStatus = "draft" | "pending" | "active" | "paused" | "completed" | "archived" | "failed";

export interface Experiment {
  id: string;
  site_id: string;
  name: string;
  description?: string | null;
  target_url: string;
  url_pattern: string;
  status: ExperimentStatus;
  traffic_allocation: number;
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  winner_variant_id?: string | null;
  base_screenshot_url?: string | null;
  base_html_snapshot?: string | null;
}

export interface ExperimentCreate {
  site_id: string;
  name: string;
  description?: string;
  target_url: string;
  url_pattern?: string;
  optimization_goal?: string;
  num_variants?: number;
}

// Variant types
export type PatchAction = "style" | "class_add" | "class_remove" | "attribute" | "text" | "html" | "hide" | "show";

export interface DOMPatch {
  action: PatchAction;
  selector: string;
  value: string;
  property_name?: string | null;
}

export interface Variant {
  id: string;
  name: string;
  description?: string | null;
  is_control: boolean;
  patches: DOMPatch[];
  screenshot_url?: string | null;
  rendered_html?: string | null;
  impressions: number;
  conversions: number;
}

// Comparison types
export interface ComparisonData {
  experiment: Experiment;
  variants: Variant[];
  ai_analysis?: string | null;
}

// Pull Request types
export type PRStatus = "pending" | "created" | "merged" | "closed" | "failed";

export interface PullRequest {
  id: string;
  experiment_id: string;
  variant_id: string;
  site_id: string;
  github_pr_number?: number | null;
  github_pr_url?: string | null;
  branch_name: string;
  status: PRStatus;
  created_at: string;
  merged_at?: string | null;
  error_message?: string | null;
}

// Session Recording types
export interface SessionRecordingListItem {
  id: string;
  session_id: string;
  visitor_id: string;
  variant_id: string;
  url: string;
  duration_ms: number;
  events_count: number;
  started_at: string;
  is_complete: boolean;
}

export interface SessionRecordingDetail {
  id: string;
  session_id: string;
  visitor_id: string;
  variant_id: string;
  url: string;
  events: unknown[];
  duration_ms: number;
  events_count: number;
  started_at: string;
  ended_at?: string | null;
  is_complete: boolean;
}

// API response types
export interface ApiError {
  detail: string;
}
