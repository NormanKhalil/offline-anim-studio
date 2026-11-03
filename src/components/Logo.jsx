import { Clapperboard } from 'lucide-react';

export default function Logo({ size = 'md' }) {
  const big = size === 'lg';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`gradient-bg inline-flex items-center justify-center rounded-xl text-white ${big ? 'h-11 w-11' : 'h-9 w-9'}`}>
        <Clapperboard size={big ? 24 : 20} aria-hidden="true" />
      </span>
      <span className={`font-bold tracking-tight ${big ? 'text-2xl' : 'text-lg'}`}>
        Offline<span className="gradient-text">AnimStudio</span>
      </span>
    </span>
  );
}
