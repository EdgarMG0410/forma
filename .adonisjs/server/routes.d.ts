import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'workouts.shared': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'workouts.create': { paramsTuple?: []; params?: {} }
    'workouts.store': { paramsTuple?: []; params?: {} }
    'workouts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.pause': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.resume': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.finish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.narrate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.share': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.unshare': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'session_exercises.store': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'session_exercises.reorder': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'session_exercises.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'session_exercises.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workout_sets.store': { paramsTuple: [ParamValue]; params: {'sessionExerciseId': ParamValue} }
    'workout_sets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workout_sets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workout_sets.repeat': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interpretations.store': { paramsTuple: [ParamValue]; params: {'sessionExerciseId': ParamValue} }
    'interpretations.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interpretations.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'history.index': { paramsTuple?: []; params?: {} }
    'history.compare': { paramsTuple?: []; params?: {} }
    'exercises.index': { paramsTuple?: []; params?: {} }
    'exercises.store': { paramsTuple?: []; params?: {} }
    'exercises.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'exercises.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.index': { paramsTuple?: []; params?: {} }
    'routines.create': { paramsTuple?: []; params?: {} }
    'routines.store': { paramsTuple?: []; params?: {} }
    'routines.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.from_session': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'body.index': { paramsTuple?: []; params?: {} }
    'body.store': { paramsTuple?: []; params?: {} }
    'body.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'body.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.show': { paramsTuple?: []; params?: {} }
    'settings.profile': { paramsTuple?: []; params?: {} }
    'settings.preferences': { paramsTuple?: []; params?: {} }
    'settings.export': { paramsTuple?: []; params?: {} }
    'settings.destroy_account': { paramsTuple?: []; params?: {} }
    'imports.index': { paramsTuple?: []; params?: {} }
    'imports.preview': { paramsTuple?: []; params?: {} }
    'imports.store': { paramsTuple?: []; params?: {} }
    'imports.revert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'workouts.shared': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'workouts.create': { paramsTuple?: []; params?: {} }
    'workouts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'history.index': { paramsTuple?: []; params?: {} }
    'history.compare': { paramsTuple?: []; params?: {} }
    'exercises.index': { paramsTuple?: []; params?: {} }
    'exercises.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.index': { paramsTuple?: []; params?: {} }
    'routines.create': { paramsTuple?: []; params?: {} }
    'routines.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'body.index': { paramsTuple?: []; params?: {} }
    'settings.show': { paramsTuple?: []; params?: {} }
    'settings.export': { paramsTuple?: []; params?: {} }
    'imports.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'new_account.create': { paramsTuple?: []; params?: {} }
    'session.create': { paramsTuple?: []; params?: {} }
    'workouts.shared': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'dashboard': { paramsTuple?: []; params?: {} }
    'workouts.create': { paramsTuple?: []; params?: {} }
    'workouts.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.summary': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'history.index': { paramsTuple?: []; params?: {} }
    'history.compare': { paramsTuple?: []; params?: {} }
    'exercises.index': { paramsTuple?: []; params?: {} }
    'exercises.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.index': { paramsTuple?: []; params?: {} }
    'routines.create': { paramsTuple?: []; params?: {} }
    'routines.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'body.index': { paramsTuple?: []; params?: {} }
    'settings.show': { paramsTuple?: []; params?: {} }
    'settings.export': { paramsTuple?: []; params?: {} }
    'imports.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'session.destroy': { paramsTuple?: []; params?: {} }
    'workouts.store': { paramsTuple?: []; params?: {} }
    'workouts.pause': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.resume': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.finish': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.cancel': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.narrate': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workouts.share': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'session_exercises.store': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'workout_sets.store': { paramsTuple: [ParamValue]; params: {'sessionExerciseId': ParamValue} }
    'workout_sets.repeat': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interpretations.store': { paramsTuple: [ParamValue]; params: {'sessionExerciseId': ParamValue} }
    'interpretations.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'interpretations.reject': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'exercises.store': { paramsTuple?: []; params?: {} }
    'routines.store': { paramsTuple?: []; params?: {} }
    'routines.from_session': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'body.store': { paramsTuple?: []; params?: {} }
    'imports.preview': { paramsTuple?: []; params?: {} }
    'imports.store': { paramsTuple?: []; params?: {} }
    'imports.revert': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  DELETE: {
    'workouts.unshare': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'session_exercises.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workout_sets.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'body.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.destroy_account': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'session_exercises.reorder': { paramsTuple: [ParamValue]; params: {'sessionId': ParamValue} }
    'exercises.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'routines.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'body.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'settings.profile': { paramsTuple?: []; params?: {} }
    'settings.preferences': { paramsTuple?: []; params?: {} }
  }
  PATCH: {
    'session_exercises.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'workout_sets.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}