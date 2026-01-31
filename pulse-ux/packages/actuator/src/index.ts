/**
 * Pulse UX Optimizer - Actuator Script
 *
 * This script is injected into customer websites to:
 * 1. Fetch active experiments for the current page
 * 2. Assign visitors to variant groups (sticky bucketing)
 * 3. Apply DOM patches to show the assigned variant
 * 4. Track impressions and conversions
 *
 * The script is designed to be:
 * - Lightweight (~5KB minified)
 * - Non-blocking (async initialization)
 * - Flicker-free (patches applied before paint when possible)
 */

interface PulseConfig {
  publicKey: string;
  apiUrl?: string;
  debug?: boolean;
}

interface DOMPatch {
  action: string;
  selector: string;
  value: string;
  property_name?: string | null;
}

interface VariantAssignment {
  experiment_id: string;
  variant_id: string;
  is_control: boolean;
  patches: DOMPatch[];
}

interface AssignmentResponse {
  visitor_id: string;
  assignments: VariantAssignment[];
}

// Configuration
const DEFAULT_API_URL = "https://api.pulse-ux.com";
const VISITOR_ID_KEY = "pulse_visitor_id";
const STORAGE_PREFIX = "pulse_";

// Global state
let config: PulseConfig | null = null;
let visitorId: string | null = null;
let assignments: VariantAssignment[] = [];
let initialized = false;

/**
 * Generate a unique visitor ID
 */
function generateVisitorId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${randomPart}`;
}

/**
 * Get or create visitor ID from localStorage
 */
function getVisitorId(): string {
  if (visitorId) return visitorId;

  try {
    visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = generateVisitorId();
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
  } catch {
    // localStorage not available, use session-only ID
    visitorId = generateVisitorId();
  }

  return visitorId;
}

/**
 * Get cached assignments from localStorage
 */
function getCachedAssignments(url: string): VariantAssignment[] | null {
  try {
    const cacheKey = `${STORAGE_PREFIX}assignments_${btoa(url).slice(0, 32)}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      // Cache for 5 minutes
      if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.assignments;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

/**
 * Cache assignments in localStorage
 */
function cacheAssignments(url: string, assignments: VariantAssignment[]): void {
  try {
    const cacheKey = `${STORAGE_PREFIX}assignments_${btoa(url).slice(0, 32)}`;
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        assignments,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Ignore cache errors
  }
}

/**
 * Log debug messages
 */
function debug(...args: unknown[]): void {
  if (config?.debug) {
    console.log("[Pulse UX]", ...args);
  }
}

/**
 * Apply a single DOM patch
 */
function applyPatch(patch: DOMPatch): boolean {
  try {
    const elements = document.querySelectorAll(patch.selector);
    if (elements.length === 0) {
      debug(`No elements found for selector: ${patch.selector}`);
      return false;
    }

    elements.forEach((element) => {
      const el = element as HTMLElement;

      switch (patch.action) {
        case "style":
          if (patch.property_name) {
            el.style.setProperty(patch.property_name, patch.value);
          }
          break;

        case "class_add":
          el.classList.add(...patch.value.split(" ").filter(Boolean));
          break;

        case "class_remove":
          el.classList.remove(...patch.value.split(" ").filter(Boolean));
          break;

        case "attribute":
          if (patch.property_name) {
            el.setAttribute(patch.property_name, patch.value);
          }
          break;

        case "text":
          el.textContent = patch.value;
          break;

        case "html":
          el.innerHTML = patch.value;
          break;

        case "hide":
          el.style.display = "none";
          break;

        case "show":
          el.style.display = "";
          break;

        default:
          debug(`Unknown patch action: ${patch.action}`);
      }
    });

    debug(`Applied patch: ${patch.action} on ${patch.selector}`);
    return true;
  } catch (error) {
    debug(`Error applying patch:`, error);
    return false;
  }
}

/**
 * Apply all patches for assigned variants
 */
function applyPatches(): void {
  if (assignments.length === 0) {
    debug("No assignments to apply");
    return;
  }

  assignments.forEach((assignment) => {
    if (assignment.is_control) {
      debug(`Variant ${assignment.variant_id} is control, no patches`);
      return;
    }

    debug(
      `Applying ${assignment.patches.length} patches for variant ${assignment.variant_id}`
    );
    assignment.patches.forEach(applyPatch);
  });
}

/**
 * Fetch variant assignments from the API
 */
async function fetchAssignments(): Promise<VariantAssignment[]> {
  if (!config) throw new Error("Pulse not initialized");

  const apiUrl = config.apiUrl || DEFAULT_API_URL;
  const currentUrl = window.location.href;
  const vid = getVisitorId();

  // Check cache first
  const cached = getCachedAssignments(currentUrl);
  if (cached) {
    debug("Using cached assignments");
    return cached;
  }

  try {
    const response = await fetch(`${apiUrl}/api/v1/actuator/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Public-Key": config.publicKey,
      },
      body: JSON.stringify({
        visitor_id: vid,
        url: currentUrl,
        user_agent: navigator.userAgent,
        referrer: document.referrer || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data: AssignmentResponse = await response.json();

    // Update visitor ID if server assigned a different one
    if (data.visitor_id && data.visitor_id !== vid) {
      visitorId = data.visitor_id;
      try {
        localStorage.setItem(VISITOR_ID_KEY, visitorId);
      } catch {
        // Ignore storage errors
      }
    }

    // Cache assignments
    cacheAssignments(currentUrl, data.assignments);

    return data.assignments;
  } catch (error) {
    debug("Failed to fetch assignments:", error);
    return [];
  }
}

/**
 * Track an impression for assigned variants
 */
function trackImpressions(): void {
  if (!config || assignments.length === 0) return;

  const apiUrl = config.apiUrl || DEFAULT_API_URL;
  const vid = getVisitorId();

  assignments.forEach((assignment) => {
    // Use sendBeacon for reliable tracking
    const data = JSON.stringify({
      visitor_id: vid,
      experiment_id: assignment.experiment_id,
      variant_id: assignment.variant_id,
    });

    try {
      navigator.sendBeacon(
        `${apiUrl}/api/v1/actuator/track/impression`,
        new Blob([data], { type: "application/json" })
      );
      debug(`Tracked impression for variant ${assignment.variant_id}`);
    } catch {
      // Fallback to fetch
      fetch(`${apiUrl}/api/v1/actuator/track/impression`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": config.publicKey,
        },
        body: data,
        keepalive: true,
      }).catch(() => {
        debug("Failed to track impression");
      });
    }
  });
}

/**
 * Track a conversion event
 */
function trackConversion(eventName?: string, metadata?: Record<string, unknown>): void {
  if (!config || assignments.length === 0) return;

  const apiUrl = config.apiUrl || DEFAULT_API_URL;
  const vid = getVisitorId();

  assignments.forEach((assignment) => {
    const data = JSON.stringify({
      visitor_id: vid,
      experiment_id: assignment.experiment_id,
      variant_id: assignment.variant_id,
      event_name: eventName || "conversion",
      metadata,
    });

    try {
      navigator.sendBeacon(
        `${apiUrl}/api/v1/actuator/track/conversion`,
        new Blob([data], { type: "application/json" })
      );
      debug(`Tracked conversion for variant ${assignment.variant_id}`);
    } catch {
      fetch(`${apiUrl}/api/v1/actuator/track/conversion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": config.publicKey,
        },
        body: data,
        keepalive: true,
      }).catch(() => {
        debug("Failed to track conversion");
      });
    }
  });
}

/**
 * Initialize Pulse UX
 */
async function init(userConfig: PulseConfig): Promise<void> {
  if (initialized) {
    debug("Already initialized");
    return;
  }

  if (!userConfig.publicKey) {
    console.error("[Pulse UX] publicKey is required");
    return;
  }

  config = userConfig;
  debug("Initializing with config:", config);

  try {
    // Fetch assignments
    assignments = await fetchAssignments();
    debug(`Received ${assignments.length} assignments`);

    // Apply patches
    if (document.readyState === "loading") {
      // Wait for DOM to be ready
      document.addEventListener("DOMContentLoaded", () => {
        applyPatches();
        trackImpressions();
      });
    } else {
      // DOM is already ready
      applyPatches();
      trackImpressions();
    }

    initialized = true;
  } catch (error) {
    console.error("[Pulse UX] Initialization failed:", error);
  }
}

/**
 * Re-apply patches (useful for SPAs)
 */
function refresh(): void {
  if (!initialized) {
    debug("Not initialized, cannot refresh");
    return;
  }
  applyPatches();
}

/**
 * Get current visitor ID
 */
function getVisitor(): string {
  return getVisitorId();
}

/**
 * Get current assignments
 */
function getAssignments(): VariantAssignment[] {
  return [...assignments];
}

// Expose public API
const PulseUX = {
  init,
  refresh,
  trackConversion,
  getVisitor,
  getAssignments,
};

// Auto-initialize if config is provided via data attribute
(function autoInit() {
  const script = document.currentScript as HTMLScriptElement | null;
  if (script) {
    const publicKey = script.dataset.publicKey;
    const apiUrl = script.dataset.apiUrl;
    const debug = script.dataset.debug === "true";

    if (publicKey) {
      // Initialize after current script execution
      setTimeout(() => {
        PulseUX.init({ publicKey, apiUrl, debug });
      }, 0);
    }
  }
})();

// Expose to window
declare global {
  interface Window {
    PulseUX: typeof PulseUX;
  }
}

window.PulseUX = PulseUX;

export { PulseUX };
export type { PulseConfig, DOMPatch, VariantAssignment };
