export function BrandMark({ className = "" }: { className?: string }) {
  return <span className={`ofus-brand ${className}`} aria-label="OfUs"><svg viewBox="-5 -5 78 63" aria-hidden="true"><circle cx="34" cy="26.5" r="24" fill="none" stroke="currentColor" strokeWidth="7.5" /></svg><span>OfUs</span></span>;
}
