'use client';

/**
 * AmbientBackground - Layered ambient lighting background system
 *
 * 4-layer composition:
 * 1. Base radial gradient (dark to darker)
 * 2. Animated gradient blobs (floating, spinning, pulsing)
 * 3. Noise texture overlay (subtle grain)
 * 4. Grid pattern overlay (subtle guide lines)
 *
 * All animations defined in globals.css (Phase 1)
 */
export function AmbientBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Layer 1: Base radial gradient - deep space effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,#0a0a0f_0%,#050506_50%,#020203_100%)]" />

      {/* Layer 2: Animated gradient blobs - floating light sources */}
      {/* Primary blob - center top, largest, accent color */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[1400px] bg-accent/25 rounded-full blur-[150px] animate-blob-float" />

      {/* Secondary blob - left side, purple tint, delayed start */}
      <div className="absolute top-20 left-0 w-[600px] h-[800px] bg-purple-500/15 rounded-full blur-[120px] animate-blob-float [animation-delay:2s]" />

      {/* Tertiary blob - right side, indigo tint, further delayed */}
      <div className="absolute top-40 right-0 w-[500px] h-[700px] bg-indigo-500/12 rounded-full blur-[100px] animate-blob-float [animation-delay:4s]" />

      {/* Quaternary blob - bottom center, accent glow pulse */}
      <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-accent/10 rounded-full blur-[120px] animate-glow-pulse" />

      {/* Layer 3: Noise texture - subtle grain for depth */}
      <div className="absolute inset-0 opacity-[0.015] noise-texture" />

      {/* Layer 4: Grid pattern - subtle alignment guides */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />
    </div>
  );
}
