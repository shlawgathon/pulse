import * as rrweb from 'rrweb';

export interface HonchAnalyticsOptions {
  websiteId: string;
  domain: string;
  debug?: boolean;
  autoTrack?: boolean; // automatically send pageviews and wire History API
  enableRecording?: boolean; // enable session recording
}

export type HonchEventPayload = Record<string, unknown>;

export interface SendResult {
  status: number;
}

function isLocalhost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    ["localhost", "127.0.0.1", "::1"].includes(lower) ||
    lower.endsWith(".local") ||
    lower.endsWith(".localhost") ||
    /^127(\.[0-9]+){0,3}$/.test(lower)
  );
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const cookies = document.cookie.split(";");
  for (let cookie of cookies) {
    while (cookie.charAt(0) === " ") {
      cookie = cookie.substring(1);
    }
    if (cookie.indexOf(nameEQ) === 0) {
      return cookie.substring(nameEQ.length);
    }
  }
  return null;
}

function setCookie(name: string, value: string, days?: number, domain?: string): void {
  if (typeof document === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + 24 * days * 60 * 60 * 1e3);
    expires = "; expires=" + date.toUTCString();
  }
  let cookieString = name + "=" + (value || "") + expires + "; path=/";
  if (domain && !isLocalhost(window.location.hostname) && window.location.protocol !== "file:") {
    cookieString += "; domain=." + domain.replace(/^\./, "");
  }
  document.cookie = cookieString;
}

function getVisitorId(domain?: string): string {
  let visitorId = getCookie("honch_visitor_id") || getCookie("nexus_visitor_id");
  if (!visitorId) {
    visitorId = generateUUID();
    setCookie("honch_visitor_id", visitorId, 365, domain);
  }
  return visitorId;
}

function getSessionId(domain?: string): string {
  if (typeof sessionStorage === "undefined") return "";
  let sessionId = sessionStorage.getItem("honch_session_id");
  if (!sessionId) {
    sessionId = generateUUID();
    sessionStorage.setItem("honch_session_id", sessionId);
  }
  return sessionId;
}

function isBotDetected(): boolean {
  try {
    // @ts-ignore - webdriver may not exist on Navigator type
    if (
      typeof window !== "undefined" &&
      (window.navigator.webdriver === true ||
        // @ts-ignore legacy bot indicators
        (window as any).callPhantom ||
        (window as any)._phantom ||
        (window as any).__nightmare)
    ) {
      return true;
    }
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent?.toLowerCase() || "" : "";
    const botPatterns = [
      "headlesschrome",
      "phantomjs",
      "selenium",
      "webdriver",
      "puppeteer",
      "playwright",
      "python",
      "curl",
      "wget",
      "java/",
      "go-http",
      "node.js",
      "axios",
      "postman",
    ];
    if (botPatterns.some((pattern) => userAgent.includes(pattern))) return true;
    const seleniumGlobals = [
      "__webdriver_evaluate",
      "__selenium_evaluate",
      "__webdriver_script_function",
      "_selenium",
      "calledSelenium",
    ];
    return typeof window !== "undefined" && seleniumGlobals.some((global) => (window as any)[global] !== undefined);
  } catch {
    return false;
  }
}

export interface EventDataBase {
  websiteId: string;
  domain: string;
  href: string;
  referrer: string | null;
  viewport: { width: number; height: number };
  visitorId: string;
  sessionId: string;
  userAgent: string;
  timestamp: string;
  eventType?: "pageview" | "custom";
  eventName?: string;
  extraData?: HonchEventPayload;
  userId?: string;
  traits?: Record<string, unknown>;
}



export class HonchAnalytics {
  private websiteId: string;
  private domain: string;
  private debug: boolean;
  private trackingEnabled: boolean;
  private disableReason: string;
  private recordingEnabled: boolean;
  private eventsBuffer: any[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private BATCH_SIZE = 50;
  private FLUSH_INTERVAL = 10000; // 10 seconds

  constructor(options: HonchAnalyticsOptions) {
    this.websiteId = options.websiteId;
    this.domain = options.domain;
    this.debug = !!options.debug;
    this.recordingEnabled = !!options.enableRecording;

    this.trackingEnabled = true;
    this.disableReason = "";

    if (!this.websiteId || !this.domain) {
      this.trackingEnabled = false;
      this.disableReason = "Missing website ID or domain";
    }
    if (this.trackingEnabled && isBotDetected()) {
      this.trackingEnabled = false;
      this.disableReason = "Bot detected";
    }
    if (this.trackingEnabled && typeof window !== "undefined" && isLocalhost(window.location.hostname) && !this.debug) {
      this.trackingEnabled = false;
      this.disableReason = "Localhost detected";
    }
    if (this.trackingEnabled && typeof window !== "undefined" && window !== window.parent && !this.debug) {
      this.trackingEnabled = false;
      this.disableReason = "Inside iframe";
    }

    if (options.autoTrack !== false && typeof window !== "undefined") {
      // SPA navigation tracking
      this.installHistoryListeners();
      // initial pageview
      this.trackPageview().catch(() => { });
      // external link tracking
      this.installExternalLinkListeners();
      // payment completion detection
      this.detectPaymentCompletions();
    }

    if (this.trackingEnabled && this.recordingEnabled && typeof window !== "undefined") {
      this.startRecording();
    }
  }

  private startRecording() {
    rrweb.record({
      emit: (event) => {
        this.eventsBuffer.push(event);
        if (this.eventsBuffer.length >= this.BATCH_SIZE) {
          this.flushEvents();
        }
      },
      inlineStylesheet: true,
      recordCanvas: true,
    });

    this.flushTimer = setInterval(() => this.flushEvents(), this.FLUSH_INTERVAL);

    // Flush on unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushEvents(true);
      });
    }
  }

  private async flushEvents(isUnload = false) {
    if (this.eventsBuffer.length === 0) return;

    const eventsToSend = [...this.eventsBuffer];
    this.eventsBuffer = [];
    const sessionId = getSessionId(this.domain);

    const payload = {
      sessionId: sessionId,
      events: eventsToSend,
    };

    if (isUnload && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const success = navigator.sendBeacon(`http://localhost:3000/recordings`, blob);
      if (success) return;
    }

    try {
      await fetch(`http://localhost:3000/recordings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        keepalive: isUnload,
      });
    } catch (error) {
      if (this.debug) console.error('Honch: Failed to send recording events', error);
      // Restore events to buffer if failed and not unloading
      if (!isUnload) {
        this.eventsBuffer = [...eventsToSend, ...this.eventsBuffer];
      }
    }
  }

  private collectEventData(): EventDataBase {
    return {
      websiteId: this.websiteId,
      domain: this.domain,
      href: typeof window !== "undefined" ? window.location.href : "",
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      viewport: {
        width: typeof window !== "undefined" ? window.innerWidth : 0,
        height: typeof window !== "undefined" ? window.innerHeight : 0,
      },
      visitorId: getVisitorId(this.domain),
      sessionId: getSessionId(this.domain),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      timestamp: new Date().toISOString(),
    };
  }

  private async sendEvent(eventData: EventDataBase): Promise<SendResult> {
    if (typeof localStorage !== "undefined" && localStorage.getItem("honch_ignore") === "true") {
      if (this.debug) console.log("Honch: Tracking disabled via localStorage");
      return { status: 200 };
    }
    try {
      const response = await fetch("http://localhost:3000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
        keepalive: true,
      });
      if (response.ok) {
        // Session extension handled by local activity
      } else if (this.debug) {
        console.error("Honch: Error sending event:", response.status);
      }
      return { status: response.status };
    } catch (e) {
      if (this.debug) console.error("Honch: Network error sending event", e);
      return { status: 0 };
    }
  }

  async trackPageview(): Promise<SendResult> {
    if (!this.trackingEnabled) return { status: 200 };
    const eventData: EventDataBase = {
      ...this.collectEventData(),
      eventType: "pageview",
      eventName: "pageview",
    };
    return this.sendEvent(eventData);
  }

  async track(eventName: string, extraData?: HonchEventPayload): Promise<SendResult> {
    if (!this.trackingEnabled) return { status: 200 };
    if (!eventName) {
      if (this.debug) console.warn("Honch: Missing event name");
      return { status: 0 };
    }
    const eventData: EventDataBase = {
      ...this.collectEventData(),
      eventType: "custom",
      eventName,
      extraData: extraData || {},
    };
    return this.sendEvent(eventData);
  }

  async identify(userId: string, traits?: Record<string, unknown>): Promise<SendResult> {
    if (!this.trackingEnabled) return { status: 200 };
    if (!userId) {
      if (this.debug) console.warn("Honch: Missing userId");
      return { status: 0 };
    }
    const eventData: EventDataBase = {
      ...this.collectEventData(),
      eventType: "custom",
      eventName: "identify",
      userId,
      traits,
    };
    return this.sendEvent(eventData);
  }

  private installHistoryListeners(): void {
    if (typeof window === "undefined") return;
    let lastPath = window.location.pathname;
    const origPushState = window.history.pushState;
    window.history.pushState = function (...args) {
      // @ts-ignore preserve this value
      const result = origPushState.apply(this, args as any);
      if (lastPath !== window.location.pathname) {
        lastPath = window.location.pathname;
        // fire and forget
        void thisInstance.trackPageview();
      }
      return result;
    } as typeof window.history.pushState;
    const thisInstance = this;
    window.addEventListener("popstate", function () {
      if (lastPath !== window.location.pathname) {
        lastPath = window.location.pathname;
        void thisInstance.trackPageview();
      }
    });
  }

  private installExternalLinkListeners(): void {
    if (typeof window === "undefined") return;
    const handler = (el: Element | null) => {
      const link = el as HTMLAnchorElement | null;
      if (!link || !link.href) return;
      try {
        const url = new URL(link.href, window.location.origin);
        if (url.protocol !== "http:" && url.protocol !== "https:") return;
        if (window.location.hostname === url.hostname) return;
        void this.track("external_link", {
          url: link.href,
          text: (link.textContent || "").trim(),
        });
      } catch {
        // ignore invalid urls
      }
    };
    window.addEventListener("click", (e) => handler((e.target as Element | null)?.closest?.("a") || null));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") handler((e.target as Element | null)?.closest?.("a") || null);
    });
  }

  private detectPaymentCompletions(): void {
    if (typeof window === "undefined") return;
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const stripeSessionId = urlParams.get("session_id");
      if (stripeSessionId && stripeSessionId.startsWith("cs_")) {
        const key = "honch_stripe_payment_" + stripeSessionId;
        if (!sessionStorage.getItem(key)) {
          void this.track("payment", { provider: "stripe", session_id: stripeSessionId });
          sessionStorage.setItem(key, "1");
        }
      }
      const polarCheckoutId = urlParams.get("checkout_id");
      if (polarCheckoutId) {
        const key = "honch_polar_payment_" + polarCheckoutId;
        if (!sessionStorage.getItem(key)) {
          void this.track("payment", { provider: "polar", checkout_id: polarCheckoutId });
          sessionStorage.setItem(key, "1");
        }
      }
      const lemonOrderId = urlParams.get("order_id");
      if (lemonOrderId) {
        const key = "honch_lemonsqueezy_payment_" + lemonOrderId;
        if (!sessionStorage.getItem(key)) {
          void this.track("payment", { provider: "lemonsqueezy", order_id: lemonOrderId });
          sessionStorage.setItem(key, "1");
        }
      }
    } catch (e) {
      if (this.debug) console.error("Honch: Error detecting payment completions", e);
    }
  }
}

export function createHonchAnalytics(options: HonchAnalyticsOptions): HonchAnalytics {
  return new HonchAnalytics(options);
}

export default HonchAnalytics;


