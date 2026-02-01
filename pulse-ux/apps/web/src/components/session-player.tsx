"use client";

import { useEffect, useRef } from "react";
import type { eventWithTime } from "@rrweb/types";

interface SessionPlayerProps {
  events: unknown[];
}

export function SessionPlayer({ events }: SessionPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || events.length === 0) return;

    // Dynamically import rrweb-player
    const loadPlayer = async () => {
      try {
        const [{ default: rrwebPlayer }] = await Promise.all([
          import("rrweb-player"),
          // @ts-expect-error - CSS import
          import("rrweb-player/dist/style.css")
        ]);

        // Clear previous player
        if (containerRef.current) {
          containerRef.current.innerHTML = "";

          playerRef.current = new rrwebPlayer({
            target: containerRef.current,
            props: {
              events: events as eventWithTime[],
              showController: true,
              autoPlay: false,
              width: 800,
              height: 500
            }
          });
        }
      } catch (error) {
        console.error("Failed to load rrweb-player:", error);
      }
    };

    loadPlayer();

    return () => {
      playerRef.current = null;
    };
  }, [events]);

  if (events.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No events to replay</div>;
  }

  return <div ref={containerRef} className="w-full h-full flex items-center justify-center" />;
}
