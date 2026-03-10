import Image from 'next/image';

interface OrvaneLogoProps {
  size?: number;
  /** 'default' uses orvane-logo.png; 'empty-bg' uses the transparent-background variant */
  variant?: 'default' | 'empty-bg';
  style?: React.CSSProperties;
  className?: string;
}

export default function OrvaneLogo({
  size = 120,
  variant = 'default',
  style,
  className,
}: OrvaneLogoProps) {
  const src =
    variant === 'empty-bg'
      ? '/orvane-logo-emptybackground.png'
      : '/orvane-logo.png';

  return (
    <Image
      src={src}
      alt="Orvane"
      width={size}
      height={Math.round(size * 0.38)}
      style={{ objectFit: 'contain', display: 'block', ...style }}
      className={className}
      priority
    />
  );
}
