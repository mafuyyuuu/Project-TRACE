/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { getSystemSettings } from '../services/api'

const SettingsContext = createContext()

export function SettingsProvider({ children }) {
  // Load settings from localStorage or defaults as fast cache
  const [systemName, setSystemName] = useState(() => localStorage.getItem('trace_system_name') || 'TRACE')
  const [systemLogo, setSystemLogo] = useState(() => localStorage.getItem('trace_system_logo') || 'MK')
  const [organization, setOrganization] = useState(() => localStorage.getItem('trace_organization') || 'PLP Registrar')
  const [theme, setTheme] = useState(() => localStorage.getItem('trace_theme') || 'light')
  const [accent, setAccent] = useState(() => localStorage.getItem('trace_accent') || 'pine')
  const [font, setFont] = useState(() => localStorage.getItem('trace_font') || 'inter')
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('trace_font_size') || 'base')
  const [reduceAnimations, setReduceAnimations] = useState(() => localStorage.getItem('trace_reduce_animations') === 'true')
  const [colorBlindMode, setColorBlindMode] = useState(() => localStorage.getItem('trace_color_blind_mode') === 'true')
  
  // Custom uploaded images
  const [profilePic, setProfilePic] = useState(() => localStorage.getItem('trace_profile_pic') || null)
  const [systemLogoPic, setSystemLogoPic] = useState(() => localStorage.getItem('trace_system_logo_pic') || null)

  // Fetch settings from DB on mount to synchronize across all users
  useEffect(() => {
    async function loadGlobalSettings() {
      try {
        const settings = await getSystemSettings()
        if (settings.system_name) {
          setSystemName(settings.system_name)
          localStorage.setItem('trace_system_name', settings.system_name)
        }
        if (settings.system_logo_initials) {
          setSystemLogo(settings.system_logo_initials)
          localStorage.setItem('trace_system_logo', settings.system_logo_initials)
        }
        if (settings.organization_name) {
          setOrganization(settings.organization_name)
          localStorage.setItem('trace_organization', settings.organization_name)
        }
        if (settings.system_logo_pic !== undefined) {
          setSystemLogoPic(settings.system_logo_pic || null)
          if (settings.system_logo_pic) {
            localStorage.setItem('trace_system_logo_pic', settings.system_logo_pic)
          } else {
            localStorage.removeItem('trace_system_logo_pic')
          }
        }
      } catch (err) {
        console.warn('Failed to load global settings from server, using local fallbacks.', err)
      }
    }
    loadGlobalSettings()
  }, [])

  // Apply settings to document element
  useEffect(() => {
    const root = document.documentElement

    // 1. System Info Cache
    localStorage.setItem('trace_system_name', systemName)
    localStorage.setItem('trace_system_logo', systemLogo)
    localStorage.setItem('trace_organization', organization)

    // 2. Theme
    root.classList.remove('theme-light', 'theme-dark', 'theme-forest')
    root.classList.add(`theme-${theme}`)
    localStorage.setItem('trace_theme', theme)

    // 3. Accent
    root.classList.remove('accent-pine', 'accent-blue', 'accent-campfire', 'accent-dusk', 'accent-berry')
    root.classList.add(`accent-${accent}`)
    localStorage.setItem('trace_accent', accent)

    // 4. Font
    root.classList.remove('font-inter', 'font-poppins', 'font-jetbrains')
    root.classList.add(`font-${font}`)
    localStorage.setItem('trace_font', font)

    // 5. Font Size
    root.classList.remove('size-sm', 'size-base', 'size-lg', 'size-xl')
    root.classList.add(`size-${fontSize}`)
    localStorage.setItem('trace_font_size', fontSize)

    // 6. Reduce Animations
    if (reduceAnimations) {
      root.classList.add('reduce-animations')
    } else {
      root.classList.remove('reduce-animations')
    }
    localStorage.setItem('trace_reduce_animations', String(reduceAnimations))

    // 7. Color Blind Mode
    if (colorBlindMode) {
      root.classList.add('colorblind-mode')
    } else {
      root.classList.remove('colorblind-mode')
    }
    localStorage.setItem('trace_color_blind_mode', String(colorBlindMode))

    // 8. Photo Cache
    if (profilePic) {
      localStorage.setItem('trace_profile_pic', profilePic)
    } else {
      localStorage.removeItem('trace_profile_pic')
    }

    if (systemLogoPic) {
      localStorage.setItem('trace_system_logo_pic', systemLogoPic)
    } else {
      localStorage.removeItem('trace_system_logo_pic')
    }

  }, [systemName, systemLogo, organization, theme, accent, font, fontSize, reduceAnimations, colorBlindMode, profilePic, systemLogoPic])

  const value = {
    systemName,
    setSystemName,
    systemLogo,
    setSystemLogo,
    organization,
    setOrganization,
    theme,
    setTheme,
    accent,
    setAccent,
    font,
    setFont,
    fontSize,
    setFontSize,
    reduceAnimations,
    setReduceAnimations,
    colorBlindMode,
    setColorBlindMode,
    profilePic,
    setProfilePic,
    systemLogoPic,
    setSystemLogoPic
  }

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
