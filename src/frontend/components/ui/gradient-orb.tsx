export function GradientOrb() {
  return (
    <>
      <div className="w-full h-full rounded-full bg-gradient-to-br from-accent/30 via-accent/20 to-transparent blur-3xl animate-pulse" />
      <div className="absolute inset-0 w-full h-full rounded-full bg-gradient-to-tr from-accent-bright/20 via-transparent to-accent/10 blur-2xl" />
    </>
  );
}
