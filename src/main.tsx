import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/presets.css'
import './styles/intro.css'
// Saved theme, motion curves and the launch animation: before the app's modules are evaluated.
import './lib/earlyStart.ts'
import App from './App.tsx'
import { initBackHandling } from './lib/back.ts'
import { afterFirstPaint, shouldShowIntro } from './lib/intro.ts'
import { initInstallPrompt, registerOfflineWorker } from './lib/pwa.ts'
import { startScrollFade } from './lib/scrollFade.ts'

// Back handling (Android button, browser Back), the install prompt and the offline worker.
initBackHandling()
initInstallPrompt()
registerOfflineWorker()
startScrollFade()

const render = () =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

// With the launch animation on screen, let its first frame paint before the heavy first render.
if (shouldShowIntro()) void afterFirstPaint().then(render)
else render()
