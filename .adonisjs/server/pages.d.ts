import '@adonisjs/inertia/types'

import type React from 'react'
import type { Prettify } from '@adonisjs/core/types/common'

type ExtractProps<T> =
  T extends React.FC<infer Props>
    ? Prettify<Omit<Props, 'children'>>
    : T extends React.Component<infer Props>
      ? Prettify<Omit<Props, 'children'>>
      : never

declare module '@adonisjs/inertia/types' {
  export interface InertiaPages {
    'auth/login': ExtractProps<(typeof import('../../inertia/pages/auth/login.tsx'))['default']>
    'auth/signup': ExtractProps<(typeof import('../../inertia/pages/auth/signup.tsx'))['default']>
    'body/index': ExtractProps<(typeof import('../../inertia/pages/body/index.tsx'))['default']>
    'dashboard': ExtractProps<(typeof import('../../inertia/pages/dashboard.tsx'))['default']>
    'errors/not_found': ExtractProps<(typeof import('../../inertia/pages/errors/not_found.tsx'))['default']>
    'errors/server_error': ExtractProps<(typeof import('../../inertia/pages/errors/server_error.tsx'))['default']>
    'exercises/index': ExtractProps<(typeof import('../../inertia/pages/exercises/index.tsx'))['default']>
    'exercises/show': ExtractProps<(typeof import('../../inertia/pages/exercises/show.tsx'))['default']>
    'history/compare': ExtractProps<(typeof import('../../inertia/pages/history/compare.tsx'))['default']>
    'history/index': ExtractProps<(typeof import('../../inertia/pages/history/index.tsx'))['default']>
    'routines/form': ExtractProps<(typeof import('../../inertia/pages/routines/form.tsx'))['default']>
    'routines/index': ExtractProps<(typeof import('../../inertia/pages/routines/index.tsx'))['default']>
    'settings/import': ExtractProps<(typeof import('../../inertia/pages/settings/import.tsx'))['default']>
    'settings/index': ExtractProps<(typeof import('../../inertia/pages/settings/index.tsx'))['default']>
    'workouts/live': ExtractProps<(typeof import('../../inertia/pages/workouts/live.tsx'))['default']>
    'workouts/start': ExtractProps<(typeof import('../../inertia/pages/workouts/start.tsx'))['default']>
    'workouts/summary': ExtractProps<(typeof import('../../inertia/pages/workouts/summary.tsx'))['default']>
  }
}
