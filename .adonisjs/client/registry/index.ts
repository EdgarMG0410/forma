/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'new_account.create': {
    methods: ["GET","HEAD"],
    pattern: '/signup',
    tokens: [[0,"signup"]],
    types: placeholder as Registry['new_account.create']['types'],
  },
  'new_account.store': {
    methods: ["POST"],
    pattern: '/signup',
    tokens: [[0,"signup"]],
    types: placeholder as Registry['new_account.store']['types'],
  },
  'session.create': {
    methods: ["GET","HEAD"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['session.create']['types'],
  },
  'session.store': {
    methods: ["POST"],
    pattern: '/login',
    tokens: [[0,"login"]],
    types: placeholder as Registry['session.store']['types'],
  },
  'workouts.shared': {
    methods: ["GET","HEAD"],
    pattern: '/s/:token',
    tokens: [[0,"s"],[1,"token"]],
    types: placeholder as Registry['workouts.shared']['types'],
  },
  'dashboard': {
    methods: ["GET","HEAD"],
    pattern: '/',
    tokens: [[0,"/"]],
    types: placeholder as Registry['dashboard']['types'],
  },
  'session.destroy': {
    methods: ["POST"],
    pattern: '/logout',
    tokens: [[0,"logout"]],
    types: placeholder as Registry['session.destroy']['types'],
  },
  'workouts.create': {
    methods: ["GET","HEAD"],
    pattern: '/workouts/start',
    tokens: [[0,"workouts"],[0,"start"]],
    types: placeholder as Registry['workouts.create']['types'],
  },
  'workouts.store': {
    methods: ["POST"],
    pattern: '/workouts',
    tokens: [[0,"workouts"]],
    types: placeholder as Registry['workouts.store']['types'],
  },
  'workouts.show': {
    methods: ["GET","HEAD"],
    pattern: '/workouts/:id',
    tokens: [[0,"workouts"],[1,"id"]],
    types: placeholder as Registry['workouts.show']['types'],
  },
  'workouts.summary': {
    methods: ["GET","HEAD"],
    pattern: '/workouts/:id/summary',
    tokens: [[0,"workouts"],[1,"id"],[0,"summary"]],
    types: placeholder as Registry['workouts.summary']['types'],
  },
  'workouts.pause': {
    methods: ["POST"],
    pattern: '/workouts/:id/pause',
    tokens: [[0,"workouts"],[1,"id"],[0,"pause"]],
    types: placeholder as Registry['workouts.pause']['types'],
  },
  'workouts.resume': {
    methods: ["POST"],
    pattern: '/workouts/:id/resume',
    tokens: [[0,"workouts"],[1,"id"],[0,"resume"]],
    types: placeholder as Registry['workouts.resume']['types'],
  },
  'workouts.finish': {
    methods: ["POST"],
    pattern: '/workouts/:id/finish',
    tokens: [[0,"workouts"],[1,"id"],[0,"finish"]],
    types: placeholder as Registry['workouts.finish']['types'],
  },
  'workouts.cancel': {
    methods: ["POST"],
    pattern: '/workouts/:id/cancel',
    tokens: [[0,"workouts"],[1,"id"],[0,"cancel"]],
    types: placeholder as Registry['workouts.cancel']['types'],
  },
  'workouts.narrate': {
    methods: ["POST"],
    pattern: '/workouts/:id/narrative',
    tokens: [[0,"workouts"],[1,"id"],[0,"narrative"]],
    types: placeholder as Registry['workouts.narrate']['types'],
  },
  'workouts.share': {
    methods: ["POST"],
    pattern: '/workouts/:id/share',
    tokens: [[0,"workouts"],[1,"id"],[0,"share"]],
    types: placeholder as Registry['workouts.share']['types'],
  },
  'workouts.unshare': {
    methods: ["DELETE"],
    pattern: '/workouts/:id/share',
    tokens: [[0,"workouts"],[1,"id"],[0,"share"]],
    types: placeholder as Registry['workouts.unshare']['types'],
  },
  'session_exercises.store': {
    methods: ["POST"],
    pattern: '/workouts/:sessionId/exercises',
    tokens: [[0,"workouts"],[1,"sessionId"],[0,"exercises"]],
    types: placeholder as Registry['session_exercises.store']['types'],
  },
  'session_exercises.reorder': {
    methods: ["PUT"],
    pattern: '/workouts/:sessionId/exercises/order',
    tokens: [[0,"workouts"],[1,"sessionId"],[0,"exercises"],[0,"order"]],
    types: placeholder as Registry['session_exercises.reorder']['types'],
  },
  'session_exercises.update': {
    methods: ["PATCH"],
    pattern: '/session-exercises/:id',
    tokens: [[0,"session-exercises"],[1,"id"]],
    types: placeholder as Registry['session_exercises.update']['types'],
  },
  'session_exercises.destroy': {
    methods: ["DELETE"],
    pattern: '/session-exercises/:id',
    tokens: [[0,"session-exercises"],[1,"id"]],
    types: placeholder as Registry['session_exercises.destroy']['types'],
  },
  'workout_sets.store': {
    methods: ["POST"],
    pattern: '/session-exercises/:sessionExerciseId/sets',
    tokens: [[0,"session-exercises"],[1,"sessionExerciseId"],[0,"sets"]],
    types: placeholder as Registry['workout_sets.store']['types'],
  },
  'workout_sets.update': {
    methods: ["PATCH"],
    pattern: '/sets/:id',
    tokens: [[0,"sets"],[1,"id"]],
    types: placeholder as Registry['workout_sets.update']['types'],
  },
  'workout_sets.destroy': {
    methods: ["DELETE"],
    pattern: '/sets/:id',
    tokens: [[0,"sets"],[1,"id"]],
    types: placeholder as Registry['workout_sets.destroy']['types'],
  },
  'workout_sets.repeat': {
    methods: ["POST"],
    pattern: '/sets/:id/repeat',
    tokens: [[0,"sets"],[1,"id"],[0,"repeat"]],
    types: placeholder as Registry['workout_sets.repeat']['types'],
  },
  'interpretations.store': {
    methods: ["POST"],
    pattern: '/session-exercises/:sessionExerciseId/interpret',
    tokens: [[0,"session-exercises"],[1,"sessionExerciseId"],[0,"interpret"]],
    types: placeholder as Registry['interpretations.store']['types'],
  },
  'interpretations.confirm': {
    methods: ["POST"],
    pattern: '/interpretations/:id/confirm',
    tokens: [[0,"interpretations"],[1,"id"],[0,"confirm"]],
    types: placeholder as Registry['interpretations.confirm']['types'],
  },
  'interpretations.reject': {
    methods: ["POST"],
    pattern: '/interpretations/:id/reject',
    tokens: [[0,"interpretations"],[1,"id"],[0,"reject"]],
    types: placeholder as Registry['interpretations.reject']['types'],
  },
  'history.index': {
    methods: ["GET","HEAD"],
    pattern: '/history',
    tokens: [[0,"history"]],
    types: placeholder as Registry['history.index']['types'],
  },
  'history.compare': {
    methods: ["GET","HEAD"],
    pattern: '/history/compare',
    tokens: [[0,"history"],[0,"compare"]],
    types: placeholder as Registry['history.compare']['types'],
  },
  'exercises.index': {
    methods: ["GET","HEAD"],
    pattern: '/exercises',
    tokens: [[0,"exercises"]],
    types: placeholder as Registry['exercises.index']['types'],
  },
  'exercises.store': {
    methods: ["POST"],
    pattern: '/exercises',
    tokens: [[0,"exercises"]],
    types: placeholder as Registry['exercises.store']['types'],
  },
  'exercises.show': {
    methods: ["GET","HEAD"],
    pattern: '/exercises/:id',
    tokens: [[0,"exercises"],[1,"id"]],
    types: placeholder as Registry['exercises.show']['types'],
  },
  'exercises.update': {
    methods: ["PUT"],
    pattern: '/exercises/:id',
    tokens: [[0,"exercises"],[1,"id"]],
    types: placeholder as Registry['exercises.update']['types'],
  },
  'routines.index': {
    methods: ["GET","HEAD"],
    pattern: '/routines',
    tokens: [[0,"routines"]],
    types: placeholder as Registry['routines.index']['types'],
  },
  'routines.create': {
    methods: ["GET","HEAD"],
    pattern: '/routines/new',
    tokens: [[0,"routines"],[0,"new"]],
    types: placeholder as Registry['routines.create']['types'],
  },
  'routines.store': {
    methods: ["POST"],
    pattern: '/routines',
    tokens: [[0,"routines"]],
    types: placeholder as Registry['routines.store']['types'],
  },
  'routines.edit': {
    methods: ["GET","HEAD"],
    pattern: '/routines/:id/edit',
    tokens: [[0,"routines"],[1,"id"],[0,"edit"]],
    types: placeholder as Registry['routines.edit']['types'],
  },
  'routines.update': {
    methods: ["PUT"],
    pattern: '/routines/:id',
    tokens: [[0,"routines"],[1,"id"]],
    types: placeholder as Registry['routines.update']['types'],
  },
  'routines.destroy': {
    methods: ["DELETE"],
    pattern: '/routines/:id',
    tokens: [[0,"routines"],[1,"id"]],
    types: placeholder as Registry['routines.destroy']['types'],
  },
  'routines.from_session': {
    methods: ["POST"],
    pattern: '/routines/from-session/:sessionId',
    tokens: [[0,"routines"],[0,"from-session"],[1,"sessionId"]],
    types: placeholder as Registry['routines.from_session']['types'],
  },
  'body.index': {
    methods: ["GET","HEAD"],
    pattern: '/body',
    tokens: [[0,"body"]],
    types: placeholder as Registry['body.index']['types'],
  },
  'body.store': {
    methods: ["POST"],
    pattern: '/body',
    tokens: [[0,"body"]],
    types: placeholder as Registry['body.store']['types'],
  },
  'body.update': {
    methods: ["PUT"],
    pattern: '/body/:id',
    tokens: [[0,"body"],[1,"id"]],
    types: placeholder as Registry['body.update']['types'],
  },
  'body.destroy': {
    methods: ["DELETE"],
    pattern: '/body/:id',
    tokens: [[0,"body"],[1,"id"]],
    types: placeholder as Registry['body.destroy']['types'],
  },
  'settings.show': {
    methods: ["GET","HEAD"],
    pattern: '/settings',
    tokens: [[0,"settings"]],
    types: placeholder as Registry['settings.show']['types'],
  },
  'settings.profile': {
    methods: ["PUT"],
    pattern: '/settings/profile',
    tokens: [[0,"settings"],[0,"profile"]],
    types: placeholder as Registry['settings.profile']['types'],
  },
  'settings.preferences': {
    methods: ["PUT"],
    pattern: '/settings/preferences',
    tokens: [[0,"settings"],[0,"preferences"]],
    types: placeholder as Registry['settings.preferences']['types'],
  },
  'settings.export': {
    methods: ["GET","HEAD"],
    pattern: '/settings/export',
    tokens: [[0,"settings"],[0,"export"]],
    types: placeholder as Registry['settings.export']['types'],
  },
  'settings.destroy_account': {
    methods: ["DELETE"],
    pattern: '/settings/account',
    tokens: [[0,"settings"],[0,"account"]],
    types: placeholder as Registry['settings.destroy_account']['types'],
  },
  'imports.index': {
    methods: ["GET","HEAD"],
    pattern: '/settings/import',
    tokens: [[0,"settings"],[0,"import"]],
    types: placeholder as Registry['imports.index']['types'],
  },
  'imports.preview': {
    methods: ["POST"],
    pattern: '/settings/import/preview',
    tokens: [[0,"settings"],[0,"import"],[0,"preview"]],
    types: placeholder as Registry['imports.preview']['types'],
  },
  'imports.store': {
    methods: ["POST"],
    pattern: '/settings/import',
    tokens: [[0,"settings"],[0,"import"]],
    types: placeholder as Registry['imports.store']['types'],
  },
  'imports.revert': {
    methods: ["POST"],
    pattern: '/settings/import/:id/revert',
    tokens: [[0,"settings"],[0,"import"],[1,"id"],[0,"revert"]],
    types: placeholder as Registry['imports.revert']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
