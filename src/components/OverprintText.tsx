interface Props {
  children: React.ReactNode;
  offsetColorClass?: string;
  className?: string;
}

export function OverprintText({
  children,
  offsetColorClass = "text-riso-red",
  className = "",
}: Props) {
  return (
    <span className="relative inline-block">
      <span
        aria-hidden
        className={`absolute inset-0 translate-x-[3px] translate-y-[3px] mix-blend-multiply select-none ${offsetColorClass}`}
      >
        {children}
      </span>
      <span className={`relative ${className}`}>{children}</span>
    </span>
  );
}
