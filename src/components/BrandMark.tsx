import { cn } from "@/lib/utils";

interface BrandMarkProps {
  variant?: "default" | "light";
  size?: "sm" | "md" | "lg";
  subtitle?: string | null;
  className?: string;
}

export function BrandLogoIcon({
  className,
  inverted = false,
}: {
  className?: string;
  inverted?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl transition-transform duration-200",
        inverted
          ? "bg-white/10 text-white ring-1 ring-white/15"
          : "bg-[#1a1715] text-[#faf7f2] ring-1 ring-black/10 dark:bg-[#f5efe6] dark:text-[#1a1715]",
        className
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-[72%]"
      >
        {/* Folha de redação com margem carmim */}
        <path
          d="M9 5.5H22.5L27 10V30.5H9V5.5Z"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
        <path
          d="M22.5 5.5V10H27"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        {/* Margem vertical carmim clássica de folha de redação */}
        <path
          d="M13 8.5V27.5"
          stroke="#C82838"
          strokeWidth="1.9"
          strokeLinecap="round"
        />
        {/* Linhas de texto */}
        <path
          d="M16 14H23.5M16 18.5H23.5M16 23H20.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeOpacity="0.82"
        />
        {/* Visto de aprovação em carmim */}
        <path
          d="M20.5 24.5L23 27L28.5 20.5"
          stroke="#E13B4B"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BrandMark({
  variant = "default",
  size = "md",
  subtitle = "Redação ENEM",
  className,
}: BrandMarkProps) {
  const isLight = variant === "light";

  const iconSizes = {
    sm: "size-8 rounded-lg",
    md: "size-10 rounded-xl",
    lg: "size-11 rounded-xl",
  };

  const titleSizes = {
    sm: "text-base",
    md: "text-[1.18rem]",
    lg: "text-2xl",
  };

  return (
    <span className={cn("inline-flex items-center gap-3 text-left", className)}>
      <BrandLogoIcon className={iconSizes[size]} inverted={isLight} />
      <span className="flex flex-col">
        <span
          className={cn(
            "font-display font-semibold leading-none tracking-[-0.02em]",
            titleSizes[size],
            isLight ? "text-[#faf7f2]" : "text-foreground"
          )}
        >
          Aprova{" "}
          <span
            className={cn(
              "italic font-bold",
              isLight ? "text-[#f25c69]" : "text-primary"
            )}
          >
            Red
          </span>
        </span>
        {subtitle && (
          <span
            className={cn(
              "mt-1 text-[11px] font-medium tracking-[0.04em] uppercase",
              isLight ? "text-white/55" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
