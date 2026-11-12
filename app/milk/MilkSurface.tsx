/** The surface of the milk: two offset waves filled with the colour of the field below. */
const wave = "M0 40Q180 4 360 40T720 40T1080 40T1440 40T1800 40T2160 40T2520 40T2880 40V80H0Z";

export default function MilkSurface({ className = "" }: { className?: string }) {
  return (
    <span className={`milk-surface ${className}`} aria-hidden="true">
      <svg viewBox="0 0 2880 80" preserveAspectRatio="none"><path d={wave} fill="currentColor" /></svg>
      <svg viewBox="0 0 2880 80" preserveAspectRatio="none"><path d={wave} fill="currentColor" transform="translate(-180 -10)" /></svg>
    </span>
  );
}
