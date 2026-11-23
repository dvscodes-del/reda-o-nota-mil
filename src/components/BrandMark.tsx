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
        "relative inline-flex shrink-0 items-center justify-center rounded-xl transition-transform duration-200",
        inverted
          ? "bg-white text-primary shadow-sm"
          : "bg-primary text-primary-foreground shadow-sm shadow-primary/25",
        className
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-[60%]"
      >
        {/* Traço minimalista de ponta de caneta + aprovação */}
        <path
          d="M7 23.5L11.2 9.5C11.5 8.5 12.4 7.8 13.5 7.8H14.5C15.6 7.8 16.5 8.5 16.8 9.5L21 23.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.6 17.5H18.4"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
        <path
          d="M21 15.2L23.2 17.4L27.5 12"
          stroke="currentColor"
          strokeWidth="2.5"
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
    md: "size-9 rounded-xl",
    lg: "size-11 rounded-2xl",
  };

  const titleSizes = {
    sm: "text-base",
    md: "text-[1.12rem]",
    lg: "text-[1.4rem]",
  };

  return (
    <span className={cn("inline-flex items-center gap-2.5 text-left", className)}>
      <BrandLogoIcon className={iconSizes[size]} inverted={isLight} />
      <span className="flex flex-col">
        <span
          className={cn(
            "font-heading font-extrabold leading-none tracking-[-0.03em]",
            titleSizes[size],
            isLight ? "text-white" : "text-foreground"
          )}
        >
          Aprova{" "}
          <span className={isLight ? "text-white/85 font-semibold" : "text-primary"}>
            Red
          </span>
        </span>
        {subtitle && (
          <span
            className={cn(
              "mt-1 text-[11px] font-medium leading-none",
              isLight ? "text-white/70" : "text-muted-foreground"
            )}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
