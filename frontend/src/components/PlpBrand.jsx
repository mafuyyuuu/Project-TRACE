import plpLogo from '@/assets/plp-login-logo.png'

// Unchanged PLP export supplied by the user; shared by all public account pages.
export default function PlpBrand() {
  return (
    <img
      src={plpLogo}
      alt="Pamantasan ng Lungsod ng Pasig logo"
      width={500}
      height={500}
      className="h-20 w-20 shrink-0 object-contain"
    />
  )
}
