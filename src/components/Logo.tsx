import React from "react";
import { useCompanyLogo } from "@/hooks/useCompanyLogo";

interface LogoProps {
  size?: number;
  className?: string;
  fallbackText?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 36, className = "", fallbackText = "A7" }) => {
  const { logo } = useCompanyLogo();

  if (logo) {
    return (
      <img
        src={logo}
        alt="Logo"
        style={{ height: size, maxWidth: size * 5, width: "auto" }}
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold tracking-tight ${className}`}
    >
      <span style={{ fontSize: size * 0.4 }}>{fallbackText}</span>
    </div>
  );
};

export default Logo;
