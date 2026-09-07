const sizes = {
  sm: "h-6 w-6 text-[9px]",
  md: "h-8 w-8 text-[10px]",
  lg: "h-10 w-10 text-xs",
  xl: "h-20 w-20 text-xl",
};

export function Avatar({ name, initials, src, size = "md", className = "", styleColor }: {
  name: string;
  initials: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  styleColor?: string;
}) {
  return <span
    role="img"
    aria-label={name}
    className={`${sizes[size]} inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 bg-cover bg-center font-bold text-indigo-700 ring-2 ring-white ${className}`}
    style={src ? { backgroundImage: `url(${src})` } : styleColor ? { backgroundColor: styleColor, color: "white" } : undefined}
  >{src ? null : initials}</span>;
}
