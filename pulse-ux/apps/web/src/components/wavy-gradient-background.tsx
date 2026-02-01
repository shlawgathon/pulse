
"use client";

import { useEffect, useRef, useState } from "react";

export function WavyGradientBackground() {
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Set initial dimensions
        setDimensions({
            width: window.innerWidth,
            height: window.innerHeight,
        });

        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        const handleMouseMove = (event: MouseEvent) => {
            setMousePosition({
                x: (event.clientX / dimensions.width) * 2 - 1,
                y: (event.clientY / dimensions.height) * 2 - 1,
            });
        };

        window.addEventListener("resize", handleResize);
        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("mousemove", handleMouseMove);
        };
    }, [dimensions.width, dimensions.height]); // Re-run effect if dimensions change to update mouse position calculation

    // Don't render interactive parts until we have dimensions (client-side)
    if (dimensions.width === 0) return <div className="fixed inset-0 bg-black z-0" />;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 z-0 overflow-hidden bg-black pointer-events-none"
            aria-hidden="true"
        >
            {/* Base gradient - Deep dark space */}
            <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black z-0" />

            {/* Animated Gradient Blobs */}
            <div className="relative w-full h-full opacity-60 mix-blend-screen">
                {/* Lime Orb (Primary) */}
                <div
                    className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[100px] animate-blob"
                    style={{
                        transform: `translate(${mousePosition.x * -20}px, ${mousePosition.y * -20}px)`,
                        transition: "transform 0.2s ease-out",
                    }}
                />

                {/* Cyan/Blue Orb (Complementary) */}
                <div
                    className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-500/20 rounded-full blur-[120px] animate-blob animation-delay-2000"
                    style={{
                        transform: `translate(${mousePosition.x * 20}px, ${mousePosition.y * 20}px)`,
                        transition: "transform 0.2s ease-out",
                    }}
                />

                {/* Violet/Purple Orb (Vibe) */}
                <div
                    className="absolute bottom-[-20%] left-[20%] w-[60vw] h-[60vw] bg-purple-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000"
                    style={{
                        transform: `translate(${mousePosition.x * -10}px, ${mousePosition.y * 10}px)`,
                        transition: "transform 0.2s ease-out",
                    }}
                />

                {/* Interactive Highlight Blob that follows mouse closely */}
                <div
                    className="absolute w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] pointer-events-none"
                    style={{
                        left: "50%",
                        top: "50%",
                        transform: `translate(calc(-50 % + ${mousePosition.x * dimensions.width * 0.5}px), calc(-50 % + ${mousePosition.y * dimensions.height * 0.5}px))`,
                        transition: "transform 0.1s ease-out",
                    }}
                />
            </div>

            {/* Wavy Overlay (keeping the texture but subtle) */}
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay" />

            <style jsx global>{`
@keyframes blob {
    0 % { transform: translate(0px, 0px) scale(1); }
    33 % { transform: translate(30px, -50px) scale(1.1); }
    66 % { transform: translate(-20px, 20px) scale(0.9); }
    100 % { transform: translate(0px, 0px) scale(1); }
}
        .animate - blob {
    animation: blob 10s infinite alternate cubic - bezier(0.4, 0, 0.2, 1);
}
        .animation - delay - 2000 {
    animation - delay: 2s;
}
        .animation - delay - 4000 {
    animation - delay: 4s;
}
`}</style>
        </div>
    );
}
