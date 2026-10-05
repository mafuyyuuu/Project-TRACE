import { TRACE_BRANDING } from '@/utils/branding'

export default function TraceBrand({ large = false }) {
  return (
    <span className="inline-flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
      <svg
        role="img"
        aria-label="TRACE logo"
        viewBox={TRACE_BRANDING.viewBox}
        preserveAspectRatio="xMidYMid meet"
        className={large ? 'h-16 w-20 shrink-0' : 'h-9 w-12 shrink-0 sm:h-10 sm:w-14'}
      >
        <image href={TRACE_BRANDING.light} width={TRACE_BRANDING.width} height={TRACE_BRANDING.height} className="block dark:hidden" />
        <image href={TRACE_BRANDING.dark} width={TRACE_BRANDING.width} height={TRACE_BRANDING.height} className="hidden dark:block" />
      </svg>
      <span className={`font-display font-black text-[#15803d] dark:text-green-300 tracking-widest uppercase ${large ? 'text-xl' : 'text-base sm:text-lg'}`}>TRACE</span>
    </span>
  )
}
