import './css/app.css'
import { client } from './client'
import { createRoot } from 'react-dom/client'
import { TuyauProvider } from '@adonisjs/inertia/react'
import { resolvePageComponent } from '@adonisjs/inertia/helpers'
import { createInertiaApp, type ResolvedComponent } from '@inertiajs/react'
import { TooltipProvider } from '~/components/ui/tooltip'
import { registerServiceWorker } from '~/lib/pwa'

createInertiaApp({
  title: (title) => (title ? `${title} · Forma` : 'Forma — Train. Track. Progress.'),
  resolve: async (name) => {
    const page = await resolvePageComponent(
      `./pages/${name}.tsx`,
      import.meta.glob<{ default: ResolvedComponent }>('./pages/**/*.tsx')
    )
    return page.default
  },
  setup({ el, App, props }) {
    createRoot(el).render(
      <TuyauProvider client={client}>
        <TooltipProvider delayDuration={300}>
          <App {...props} />
        </TooltipProvider>
      </TuyauProvider>
    )
  },
  progress: {
    color: 'oklch(0.88 0.21 128)',
    delay: 150,
  },
})

registerServiceWorker()
