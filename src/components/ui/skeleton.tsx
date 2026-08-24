type SkeletonProps = {
  className?: string;
  label: string;
};

export function Skeleton({ className, label }: SkeletonProps) {
  return (
    <div
      aria-label={label}
      className={["ui-skeleton", className].filter(Boolean).join(" ")}
      role="status"
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}