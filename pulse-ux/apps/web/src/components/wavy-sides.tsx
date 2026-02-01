"use client";

export function WavySides() {
  return (
    <>
      <div className="fixed left-0 top-0 bottom-0 w-[100px] pointer-events-none z-0 opacity-30 mix-blend-screen overflow-hidden">
        <div className="absolute inset-y-0 left-[-50px] w-[150px] bg-gradient-to-r from-primary/20 to-transparent blur-[40px] animate-pulse-slow" />
        <svg
          className="absolute left-0 top-0 h-full w-full text-primary/20"
          preserveAspectRatio="none"
          viewBox="0 0 100 1000"
        >
          <path
            d="M0 0 Q 50 250 10 500 T 0 1000"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="animate-wave-y"
          />
          <path
            d="M20 0 Q 70 250 30 500 T 20 1000"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="animate-wave-y-slow opacity-50"
          />
        </svg>
      </div>

      <div className="fixed right-0 top-0 bottom-0 w-[100px] pointer-events-none z-0 opacity-30 mix-blend-screen overflow-hidden">
        <div className="absolute inset-y-0 right-[-50px] w-[150px] bg-gradient-to-l from-primary/20 to-transparent blur-[40px] animate-pulse-slow" />
        <svg
          className="absolute right-0 top-0 h-full w-full text-primary/20 transform scale-x-[-1]"
          preserveAspectRatio="none"
          viewBox="0 0 100 1000"
        >
          <path
            d="M0 0 Q 50 250 10 500 T 0 1000"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            className="animate-wave-y"
          />
        </svg>
      </div>

      <style jsx global>{`
        @keyframes wave-y {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-20px);
          }
          100% {
            transform: translateY(0);
          }
        }
        @keyframes wave-y-slow {
          0% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(30px);
          }
          100% {
            transform: translateY(0);
          }
        }
        .animate-wave-y {
          animation: wave-y 10s ease-in-out infinite;
        }
        .animate-wave-y-slow {
          animation: wave-y-slow 15s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
