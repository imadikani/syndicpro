import Image from 'next/image';

interface OrvaneLogoProps {
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

// logo_only.png: 676×511 → aspect ratio ≈ 1.323 wide : 1 tall
export default function OrvaneLogo({ size = 120, style, className }: OrvaneLogoProps) {
  return (
    <Image
      src="/logo_only.png"
      alt="Orvane"
      width={size}
      height={Math.round(size / 1.323)}
      style={{ objectFit: 'contain', display: 'block', ...style }}
      className={className}
      priority
    />
  );
}
