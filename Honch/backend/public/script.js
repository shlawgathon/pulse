!function () {
  "use strict";
  const script = document.currentScript;
  const dataPrefix = "data-";
  const getAttribute = script.getAttribute.bind(script);

  function isBotDetected() {
    try {
      if (
        window.navigator.webdriver === true ||
        window.callPhantom ||
        window._phantom ||
        window.__nightmare
      )
        return true;
      const userAgent = window.navigator.userAgent?.toLowerCase() || "";
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
      return seleniumGlobals.some((global) => window[global] !== undefined);
    } catch (e) {
      return false;
    }
  }

  function isLocalhost() {
    const hostname = window.location.hostname.toLowerCase();
    return (
      ["localhost", "127.0.0.1", "::1"].includes(hostname) ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".localhost") ||
      /^127(\.[0-9]+){0,3}$/.test(hostname)
    );
  }

  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + 24 * days * 60 * 60 * 1e3);
      expires = "; expires=" + date.toUTCString();
    }
    let cookieString = name + "=" + (value || "") + expires + "; path=/";
    const domain = getAttribute(dataPrefix + "domain");
    if (domain && !isLocalhost() && window.location.protocol !== "file:") {
      cookieString += "; domain=." + domain.replace(/^\./, "");
    }
    document.cookie = cookieString;
  }

  function getCookie(name) {
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

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getVisitorId() {
    let visitorId = getCookie("honch_visitor_id") || getCookie("nexus_visitor_id");
    if (!visitorId) {
      visitorId = generateUUID();
      setCookie("honch_visitor_id", visitorId, 365);
    }
    return visitorId;
  }

  function getSessionId() {
    let sessionId = getCookie("honch_session_id") || getCookie("nexus_session_id");
    if (!sessionId) {
      sessionId = generateUUID();
      setCookie("honch_session_id", sessionId, 1 / 48);
    }
    return sessionId;
  }

  const websiteId = getAttribute(dataPrefix + "website-id");
  const domain = getAttribute(dataPrefix + "domain");
  const debug = getAttribute(dataPrefix + "debug") === "true";
  const apiEndpoint = getAttribute(dataPrefix + "api-endpoint") || "https://api.honch.io/api/events";
  let trackingEnabled = true,
    disableReason = "";
  if (!websiteId || !domain) {
    trackingEnabled = false;
    disableReason = "Missing website ID or domain";
  }
  if (trackingEnabled && isBotDetected()) {
    trackingEnabled = false;
    disableReason = "Bot detected";
  }
  if (trackingEnabled && isLocalhost() && !debug) {
    trackingEnabled = false;
    disableReason = "Localhost detected";
  }
  if (trackingEnabled && window !== window.parent && !debug) {
    trackingEnabled = false;
    disableReason = "Inside iframe";
  }

  function collectEventData() {
    return {
      websiteId: websiteId,
      domain: domain,
      href: window.location.href,
      referrer: document.referrer || null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };
  }

  function sendEvent(eventData, callback) {
    if (localStorage.getItem("honch_ignore") === "true") {
      debug && console.log("Honch: Tracking disabled via localStorage");
      callback && callback({ status: 200 });
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", apiEndpoint, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
          debug && console.log("Event sent successfully");
          setCookie("honch_session_id", getSessionId(), 1 / 48);
        } else {
          debug && console.error("Error sending event:", xhr.status);
        }
        callback && callback({ status: xhr.status });
      }
    };
    xhr.send(JSON.stringify(eventData));
  }

  function trackPageview(callback) {
    if (!trackingEnabled) {
      callback && callback({ status: 200 });
      return;
    }
    const eventData = collectEventData();
    eventData.eventType = "pageview";
    eventData.eventName = "pageview";
    sendEvent(eventData, callback);
  }

  function trackCustomEvent(eventName, extraData, callback) {
    if (!trackingEnabled) {
      callback && callback({ status: 200 });
      return;
    }
    const eventData = collectEventData();
    eventData.eventType = "custom";
    eventData.eventName = eventName;
    eventData.extraData = extraData || {};
    sendEvent(eventData, callback);
  }

  function trackExternalLink(linkElement) {
    if (!linkElement || !linkElement.href) return;
    try {
      const url = new URL(linkElement.href, window.location.origin);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (window.location.hostname === url.hostname) return;
      trackCustomEvent("external_link", {
        url: linkElement.href,
        text: linkElement.textContent.trim(),
      });
    } catch (e) {
      // Invalid URL, ignore
    }
  }

  function detectPaymentCompletions() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      // Stripe
      const stripeSessionId = urlParams.get("session_id");
      if (stripeSessionId && stripeSessionId.startsWith("cs_")) {
        const key = "honch_stripe_payment_" + stripeSessionId;
        if (!sessionStorage.getItem(key)) {
          trackCustomEvent("payment", {
            provider: "stripe",
            session_id: stripeSessionId,
          });
          sessionStorage.setItem(key, "1");
        }
      }
      // Polar
      const polarCheckoutId = urlParams.get("checkout_id");
      if (polarCheckoutId) {
        const key = "honch_polar_payment_" + polarCheckoutId;
        if (!sessionStorage.getItem(key)) {
          trackCustomEvent("payment", {
            provider: "polar",
            checkout_id: polarCheckoutId,
          });
          sessionStorage.setItem(key, "1");
        }
      }
      // LemonSqueezy
      const lemonOrderId = urlParams.get("order_id");
      if (lemonOrderId) {
        const key = "honch_lemonsqueezy_payment_" + lemonOrderId;
        if (!sessionStorage.getItem(key)) {
          trackCustomEvent("payment", {
            provider: "lemonsqueezy",
            order_id: lemonOrderId,
          });
          sessionStorage.setItem(key, "1");
        }
      }
    } catch (e) {
      debug && console.error("Error detecting payment completions:", e);
    }
  }

  function honch(eventName, extraData, callback) {
    if (!trackingEnabled) {
      debug &&
        console.log(`Honch: Event '${eventName}' ignored - ${disableReason}`);
      callback && callback({ status: 200 });
      return;
    }
    if (!eventName) {
      console.warn("Honch: Missing event name");
      return;
    }
    trackCustomEvent(eventName, extraData, callback);
  }

  let eventQueue = [];
  if (window.honch && window.honch.q && Array.isArray(window.honch.q)) {
    eventQueue = window.honch.q.map((call) => Array.from(call));
  }

  function processQueue() {
    while (eventQueue.length > 0) {
      const call = eventQueue.shift();
      if (Array.isArray(call) && call.length > 0) {
        try {
          honch.apply(null, call);
        } catch (e) {
          debug &&
            console.error("Honch: Error processing queued call:", e, call);
        }
      }
    }
  }

  window.honch = honch;
  window.honch.q && delete window.honch.q;
  processQueue();
  window.addEventListener("click", function (e) {
    trackExternalLink(e.target.closest("a"));
  });
  window.addEventListener("keydown", function (e) {
    ("Enter" === e.key || " " === e.key) &&
      trackExternalLink(e.target.closest("a"));
  });
  detectPaymentCompletions();
  let lastPath = window.location.pathname;
  const origPushState = window.history.pushState;
  window.history.pushState = function () {
    origPushState.apply(this, arguments);
    if (lastPath !== window.location.pathname) {
      lastPath = window.location.pathname;
      trackPageview();
    }
  };
  window.addEventListener("popstate", function () {
    if (lastPath !== window.location.pathname) {
      lastPath = window.location.pathname;
      trackPageview();
    }
  });
  trackPageview();
}(); 