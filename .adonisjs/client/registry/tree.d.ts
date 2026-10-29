/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  newAccount: {
    create: typeof routes['new_account.create']
    store: typeof routes['new_account.store']
  }
  session: {
    create: typeof routes['session.create']
    store: typeof routes['session.store']
    destroy: typeof routes['session.destroy']
  }
  workouts: {
    shared: typeof routes['workouts.shared']
    create: typeof routes['workouts.create']
    store: typeof routes['workouts.store']
    show: typeof routes['workouts.show']
    summary: typeof routes['workouts.summary']
    pause: typeof routes['workouts.pause']
    resume: typeof routes['workouts.resume']
    finish: typeof routes['workouts.finish']
    cancel: typeof routes['workouts.cancel']
    narrate: typeof routes['workouts.narrate']
    share: typeof routes['workouts.share']
    unshare: typeof routes['workouts.unshare']
  }
  dashboard: typeof routes['dashboard']
  sessionExercises: {
    store: typeof routes['session_exercises.store']
    reorder: typeof routes['session_exercises.reorder']
    update: typeof routes['session_exercises.update']
    destroy: typeof routes['session_exercises.destroy']
  }
  workoutSets: {
    store: typeof routes['workout_sets.store']
    update: typeof routes['workout_sets.update']
    destroy: typeof routes['workout_sets.destroy']
    repeat: typeof routes['workout_sets.repeat']
  }
  interpretations: {
    store: typeof routes['interpretations.store']
    confirm: typeof routes['interpretations.confirm']
    reject: typeof routes['interpretations.reject']
  }
  history: {
    index: typeof routes['history.index']
    compare: typeof routes['history.compare']
  }
  exercises: {
    index: typeof routes['exercises.index']
    store: typeof routes['exercises.store']
    show: typeof routes['exercises.show']
    update: typeof routes['exercises.update']
  }
  routines: {
    index: typeof routes['routines.index']
    create: typeof routes['routines.create']
    store: typeof routes['routines.store']
    edit: typeof routes['routines.edit']
    update: typeof routes['routines.update']
    destroy: typeof routes['routines.destroy']
    fromSession: typeof routes['routines.from_session']
  }
  body: {
    index: typeof routes['body.index']
    store: typeof routes['body.store']
    update: typeof routes['body.update']
    destroy: typeof routes['body.destroy']
  }
  settings: {
    show: typeof routes['settings.show']
    profile: typeof routes['settings.profile']
    preferences: typeof routes['settings.preferences']
    export: typeof routes['settings.export']
    destroyAccount: typeof routes['settings.destroy_account']
  }
  imports: {
    index: typeof routes['imports.index']
    preview: typeof routes['imports.preview']
    store: typeof routes['imports.store']
    revert: typeof routes['imports.revert']
  }
}
