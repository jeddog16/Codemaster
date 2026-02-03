function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* base */}
      <div className="absolute inset-0 bg-black" />

      {/* animated glow layer */}
      <div className="absolute -inset-[20%] aurora" />

      {/* optional vignette to focus center */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.35)_55%,rgba(0,0,0,0.85)_100%)]" />
    </div>
  );
}
