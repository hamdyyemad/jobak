/**
 * Soft accent glow.
 *
 * Built from radial-gradients rather than a `blur-3xl` filter: a blurred 500px box
 * has to be re-rasterised through the filter pipeline whenever anything near it
 * repaints, whereas a gradient is painted once and composited for free.
 */
export function GradientOrb() {
  return (
    <>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--accent) 26%, transparent), color-mix(in oklab, var(--accent) 12%, transparent) 55%, transparent 80%)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side at 70% 30%, color-mix(in oklab, var(--accent-bright) 18%, transparent), transparent 70%)",
        }}
      />
    </>
  );
}
