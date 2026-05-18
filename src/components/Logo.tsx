import React from "react";

interface LogoProps {
  size?: number;
  withText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 36, withText = false, className = "" }) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <defs>
          <linearGradient id="a7-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--crm-purple))" />
          </linearGradient>
        </defs>
        {/* Rounded square base */}
        <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#a7-grad)" />
        {/* Subtle inner highlight */}
        <rect x="2" y="2" width="44" height="22" rx="12" fill="white" fillOpacity="0.08" />
        {/* Stylized "A7" mark */}
        <path
          d="M14 34 L20 14 L24 14 L30 34"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <line x1="16.5" y1="27.5" x2="27.5" y2="27.5" stroke="white" strokeWidth="2.6" strokeLinecap="round" />
        <path
          d="M31 15 L38 15 L33 34"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      {withText && (
        <div className="flex flex-col leading-none">
          <span className="text-base font-bold tracking-tight text-foreground">CRM A7</span>
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Saúde &amp; Estética</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
