import React, { useId } from "react";

type BrandMarkProps = {
  className?: string;
  monochrome?: boolean;
  title?: string;
};

/** The FinStrive folded-S mark, kept as SVG so it stays crisp at favicon size. */
export const BrandMark = ({ className = "h-8 w-8", monochrome = false, title }: BrandMarkProps) => {
  const gradientId = `finstrive-${useId().replace(/:/g, "")}`;
  const fill = monochrome ? "currentColor" : `url(#${gradientId})`;

  return (
    <svg
      viewBox="0 0 64 86"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="none"
    >
      {!monochrome && (
        <defs>
          <linearGradient id={gradientId} x1="7" y1="4" x2="55" y2="68" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFC247" />
            <stop offset="0.48" stopColor="#F59E0B" />
            <stop offset="1" stopColor="#D97706" />
          </linearGradient>
        </defs>
      )}
      <path d="M54 2 12 27.1c-4.3 2.6-7 7.3-7 12.4v7.8c0 5 2.6 9.7 6.9 12.3L24 67v-13L13.8 47.8c-2.2-1.3-2.2-4.5 0-5.8L50 20.4c2.5-1.5 4-4.2 4-7.1V2Z" fill={fill} />
      <path d="m25 31 11.7-7 15.4 9.2c4.3 2.6 6.9 7.2 6.9 12.2v2.1c0 5.1-2.7 9.8-7 12.4L10 84V68l40.2-24c2.2-1.3 2.2-4.5 0-5.8L39 31.5 25 40l-12-7.2L25 31Z" fill={fill} />
    </svg>
  );
};

type BrandLockupProps = {
  className?: string;
  compact?: boolean;
};

export const BrandLockup = ({ className = "", compact = false }: BrandLockupProps) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <BrandMark className={compact ? "h-7 w-7" : "h-9 w-9"} title="FinStrive" />
    <span className="flex flex-col leading-none">
      <span className={`${compact ? "text-[15px]" : "text-[19px]"} font-display font-semibold tracking-[-0.025em] text-term-text`}>
        FinStrive
      </span>
      {!compact && (
        <span className="mt-1 font-mono text-[7px] uppercase tracking-[0.32em] text-term-dim">
          Discipline compounds
        </span>
      )}
    </span>
  </span>
);
