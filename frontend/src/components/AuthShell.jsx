import { Link } from 'react-router-dom'
import plpLogo from '@/assets/plp_logo.png'

/**
 * The grey-and-green split screen shared by the public auth pages, so the
 * recovery screens are visibly part of the same system as Login. Purely
 * presentational — it holds no state and makes no API calls.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row font-body relative overflow-hidden bg-white">
      {/* Left Column (Light Spec) */}
      <div className="md:w-1/2 bg-[#f8f9fa] p-8 sm:p-12 md:p-24 flex flex-col justify-between shrink-0">
        <div>
          <Link to="/">
            <img src={plpLogo} alt="PLP Logo" className="w-16 h-16 rounded-full object-cover shadow-md" />
          </Link>
        </div>

        <div className="my-auto py-12 md:py-0">
          <span className="text-2xl font-black text-gray-900 block mb-2 tracking-tight">Welcome to</span>
          <h1 className="text-6xl sm:text-7xl md:text-[10rem] font-display font-black text-[#15803d] tracking-tighter leading-none mb-4">TRACE</h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-[#15803d] leading-tight max-w-md">
            An AI-Assisted Registrar Document Workflow System
          </h2>
        </div>

        <div>
          <p className="text-sm font-bold text-gray-900 max-w-sm leading-relaxed">
            Empowering the PLP community with transparent document requests and intelligent, data-driven administrative processing.
          </p>
        </div>
      </div>

      {/* Right Column (Pine Spec) */}
      <div className="md:w-1/2 bg-[#15803d] p-8 sm:p-12 md:p-24 flex flex-col justify-center text-white relative">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl sm:text-4xl font-display font-black mb-3 tracking-tight">{title}</h2>
          {subtitle && (
            <p className="text-sm font-medium text-white/80 leading-relaxed mb-8">{subtitle}</p>
          )}
          {children}
          {footer && <div className="mt-8 text-center">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
