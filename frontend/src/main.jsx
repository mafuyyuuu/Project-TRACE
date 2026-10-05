import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App.jsx'
import { applyTextSize, readTextSize } from '@/utils/textSize'
import { applyBrandIcon } from '@/utils/branding'

// Set the class before React paints, including public pages and modal portals.
let savedTheme;
try {
  savedTheme = localStorage.getItem('trace_theme');
} catch {
  // A blocked storage area must not prevent the application from starting.
}
const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
document.documentElement.classList.toggle('dark', savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark));
applyBrandIcon(document.documentElement.classList.contains('dark'));
applyTextSize(readTextSize());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
