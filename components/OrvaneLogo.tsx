import Image from 'next/image';

interface OrvaneLogoProps {
  width?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function OrvaneLogo({ width = 110, style, className }: OrvaneLogoProps) {
  return (
    <Image
      src="/orvane-logo-emptybackground.png"
      alt="Orvane"
      width={width}
      height={width}
      style={{ objectFit: 'contain', width, height: 'auto', display: 'block', ...style }}
      className={className}
      priority
    />
  );
}
