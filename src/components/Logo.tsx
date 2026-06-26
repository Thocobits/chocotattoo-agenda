import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: { width: 130, height: 52 },
  md: { width: 180, height: 72 },
  lg: { width: 300, height: 120 },
};

export function Logo({ size = "md", className = "" }: LogoProps) {
  const { width, height } = sizes[size];

  return (
    <Image
      src="/logo.png"
      alt="Família Chocotattoo"
      width={width}
      height={height}
      unoptimized
      className={`object-contain max-w-full h-auto ${className}`}
      priority
    />
  );
}
