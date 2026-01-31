"use client";

import { useEffect, useRef, useMemo } from "react";
import type { DOMPatch, Variant } from "@/types";

/**
 * Generates JavaScript code that applies DOM patches to an HTML document.
 * This code runs inside the iframe to modify the rendered page.
 */
function generatePatchScript(patches: DOMPatch[]): string {
  const patchCode = patches.map((patch, index) => {
    const escapedSelector = patch.selector.replace(/'/g, "\\'");
    const escapedValue = (patch.value || "").replace(/'/g, "\\'").replace(/\n/g, "\\n");
    const escapedProperty = (patch.property_name || "").replace(/'/g, "\\'");

    switch (patch.action) {
      case "style":
        return `
          // Patch ${index + 1}: style
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              el.style['${escapedProperty}'] = '${escapedValue}';
            }
          })();
        `;

      case "class_add":
        return `
          // Patch ${index + 1}: class_add
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              '${escapedValue}'.split(' ').forEach(c => c && el.classList.add(c));
            }
          })();
        `;

      case "class_remove":
        return `
          // Patch ${index + 1}: class_remove
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              '${escapedValue}'.split(' ').forEach(c => c && el.classList.remove(c));
            }
          })();
        `;

      case "attribute":
        return `
          // Patch ${index + 1}: attribute
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              el.setAttribute('${escapedProperty}', '${escapedValue}');
            }
          })();
        `;

      case "text":
        return `
          // Patch ${index + 1}: text
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              el.textContent = '${escapedValue}';
            }
          })();
        `;

      case "html":
        return `
          // Patch ${index + 1}: html
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              el.innerHTML = '${escapedValue}';
            }
          })();
        `;

      case "hide":
        return `
          // Patch ${index + 1}: hide
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              el.style.display = 'none';
            }
          })();
        `;

      case "show":
        return `
          // Patch ${index + 1}: show
          (function() {
            const el = document.querySelector('${escapedSelector}');
            if (el) {
              el.style.display = '';
            }
          })();
        `;

      default:
        return `// Unknown patch action: ${patch.action}`;
    }
  });

  return `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        console.log('[Pulse UX] Applying ${patches.length} patches for variant preview');
        ${patchCode.join("\n")}
        console.log('[Pulse UX] Patches applied successfully');
      });
    </script>
  `;
}

/**
 * Injects a <base> tag to fix relative URLs in the HTML.
 * This ensures CSS, images, and other resources load from the original domain.
 */
function injectBaseTag(html: string, targetUrl?: string): string {
  if (!targetUrl) return html;

  try {
    const url = new URL(targetUrl);
    const baseTag = `<base href="${url.origin}/" />`;

    // If there's already a <base> tag, replace it
    if (/<base[^>]*>/i.test(html)) {
      return html.replace(/<base[^>]*>/i, baseTag);
    }

    // Try to inject after <head>
    if (html.includes("<head>")) {
      return html.replace("<head>", `<head>\n    ${baseTag}`);
    }

    // Try to inject before first link/script/style
    const firstResourceMatch = html.match(/<(link|script|style)/i);
    if (firstResourceMatch && firstResourceMatch.index !== undefined) {
      return html.slice(0, firstResourceMatch.index) + baseTag + "\n" + html.slice(firstResourceMatch.index);
    }

    // Fallback: prepend
    return baseTag + "\n" + html;
  } catch {
    return html;
  }
}

/**
 * Injects dark mode support into the HTML.
 * Many sites use class="dark" on html/body or prefers-color-scheme.
 */
function injectDarkMode(html: string): string {
  // Add dark class to <html> tag if it exists
  if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html([^>]*)>/i, (match, attrs) => {
      // If already has class, add dark to it
      if (/class\s*=\s*["'][^"']*["']/i.test(attrs)) {
        return match.replace(/class\s*=\s*["']([^"']*)["']/i, 'class="$1 dark"');
      }
      // Otherwise add class="dark"
      return `<html${attrs} class="dark">`;
    });
  }

  // Add dark class to <body> tag if it exists
  if (/<body[^>]*>/i.test(html)) {
    html = html.replace(/<body([^>]*)>/i, (match, attrs) => {
      if (/class\s*=\s*["'][^"']*["']/i.test(attrs)) {
        return match.replace(/class\s*=\s*["']([^"']*)["']/i, 'class="$1 dark"');
      }
      return `<body${attrs} class="dark">`;
    });
  }

  // Inject color-scheme: dark to force dark mode for native elements
  const darkModeStyle = `
    <style>
      :root { color-scheme: dark; }
      html, body { background-color: #0a0a0a !important; }
    </style>
  `;

  // Try to inject at end of <head>
  if (html.includes("</head>")) {
    html = html.replace("</head>", `${darkModeStyle}</head>`);
  }

  return html;
}

/**
 * Injects the patch script into the HTML just before </body>.
 */
function injectPatchScript(html: string, patches: DOMPatch[], targetUrl?: string): string {
  // First inject base tag to fix relative URLs
  let processedHtml = injectBaseTag(html, targetUrl);

  // Inject dark mode support
  processedHtml = injectDarkMode(processedHtml);

  if (patches.length === 0) {
    return processedHtml;
  }

  const patchScript = generatePatchScript(patches);

  // Try to inject before </body>
  if (processedHtml.includes("</body>")) {
    return processedHtml.replace("</body>", `${patchScript}</body>`);
  }

  // If no </body>, try before </html>
  if (processedHtml.includes("</html>")) {
    return processedHtml.replace("</html>", `${patchScript}</html>`);
  }

  // Fallback: append to the end
  return processedHtml + patchScript;
}

interface VariantPreviewProps {
  baseHtml: string;
  variant: Variant;
  targetUrl?: string;
  className?: string;
}

/**
 * VariantPreview renders the base HTML with DOM patches applied in a sandboxed iframe.
 * This allows users to see a live preview of how each variant would look.
 */
export function VariantPreview({ baseHtml, variant, targetUrl, className = "" }: VariantPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Memoize the patched HTML to avoid recalculating on every render
  const patchedHtml = useMemo(() => {
    return injectPatchScript(baseHtml, variant.patches, targetUrl);
  }, [baseHtml, variant.patches, targetUrl]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // Use srcdoc for security (sandboxed content)
    iframe.srcdoc = patchedHtml;
  }, [patchedHtml]);

  return (
    <iframe
      ref={iframeRef}
      title={`Preview of ${variant.name}`}
      className={`w-full h-full border-0 bg-white ${className}`}
      sandbox="allow-scripts allow-same-origin"
      loading="lazy"
    />
  );
}

/**
 * Simple fallback component when no HTML is available
 */
export function VariantPreviewFallback({ variant }: { variant: Variant }) {
  return (
    <div className="p-4 text-center text-muted-foreground">
      <p className="mb-2">No HTML preview available</p>
      <p className="text-sm">{variant.description || "No description"}</p>
      {variant.patches.length > 0 && (
        <p className="text-xs mt-2">
          {variant.patches.length} patch{variant.patches.length !== 1 ? "es" : ""} defined
        </p>
      )}
    </div>
  );
}
