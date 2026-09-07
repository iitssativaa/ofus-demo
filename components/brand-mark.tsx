export function BrandMark({ className = "" }: { className?: string }) {
  return <span aria-label="OfUs" className={`app-wordmark inline-flex items-baseline whitespace-nowrap text-white ${className}`}><span aria-hidden="true" className="app-wordmark-of">Of</span><span aria-hidden="true" className="app-wordmark-us">Us</span><span aria-hidden="true" className="app-wordmark-point" /></span>;
}
