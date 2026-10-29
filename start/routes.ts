/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| Every authenticated route reads and writes through services that scope
| by the signed-in user; ids in URLs are never trusted on their own.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

// Shared summaries are public, read-only and addressed by an unguessable token.
router.get('s/:token', [controllers.Workouts, 'shared']).as('workouts.shared')

router
  .group(() => {
    router.get('/', [controllers.Dashboard, 'index']).as('dashboard')
    router.post('logout', [controllers.Session, 'destroy'])

    // Workouts
    router.get('workouts/start', [controllers.Workouts, 'create']).as('workouts.create')
    router.post('workouts', [controllers.Workouts, 'store']).as('workouts.store')
    router
      .get('workouts/:id', [controllers.Workouts, 'show'])
      .as('workouts.show')
      .where('id', router.matchers.number())
    router.get('workouts/:id/summary', [controllers.Workouts, 'summary']).as('workouts.summary')
    router.post('workouts/:id/pause', [controllers.Workouts, 'pause']).as('workouts.pause')
    router.post('workouts/:id/resume', [controllers.Workouts, 'resume']).as('workouts.resume')
    router.post('workouts/:id/finish', [controllers.Workouts, 'finish']).as('workouts.finish')
    router.post('workouts/:id/cancel', [controllers.Workouts, 'cancel']).as('workouts.cancel')
    router.post('workouts/:id/narrative', [controllers.Workouts, 'narrate']).as('workouts.narrate')
    router.post('workouts/:id/share', [controllers.Workouts, 'share']).as('workouts.share')
    router.delete('workouts/:id/share', [controllers.Workouts, 'unshare']).as('workouts.unshare')

    router
      .post('workouts/:sessionId/exercises', [controllers.SessionExercises, 'store'])
      .as('session_exercises.store')
    router
      .put('workouts/:sessionId/exercises/order', [controllers.SessionExercises, 'reorder'])
      .as('session_exercises.reorder')
    router
      .patch('session-exercises/:id', [controllers.SessionExercises, 'update'])
      .as('session_exercises.update')
    router
      .delete('session-exercises/:id', [controllers.SessionExercises, 'destroy'])
      .as('session_exercises.destroy')

    router
      .post('session-exercises/:sessionExerciseId/sets', [controllers.WorkoutSets, 'store'])
      .as('workout_sets.store')
    router.patch('sets/:id', [controllers.WorkoutSets, 'update']).as('workout_sets.update')
    router.delete('sets/:id', [controllers.WorkoutSets, 'destroy']).as('workout_sets.destroy')
    router.post('sets/:id/repeat', [controllers.WorkoutSets, 'repeat']).as('workout_sets.repeat')

    // Natural-language entry: interpret → confirm (nothing is saved before confirming)
    router
      .post('session-exercises/:sessionExerciseId/interpret', [
        controllers.Interpretations,
        'store',
      ])
      .as('interpretations.store')
    router
      .post('interpretations/:id/confirm', [controllers.Interpretations, 'confirm'])
      .as('interpretations.confirm')
    router
      .post('interpretations/:id/reject', [controllers.Interpretations, 'reject'])
      .as('interpretations.reject')

    // History
    router.get('history', [controllers.History, 'index']).as('history.index')
    router.get('history/compare', [controllers.History, 'compare']).as('history.compare')

    // Library
    router.get('exercises', [controllers.Exercises, 'index']).as('exercises.index')
    router.post('exercises', [controllers.Exercises, 'store']).as('exercises.store')
    router.get('exercises/:id', [controllers.Exercises, 'show']).as('exercises.show')
    router.put('exercises/:id', [controllers.Exercises, 'update']).as('exercises.update')

    router.get('routines', [controllers.Routines, 'index']).as('routines.index')
    router.get('routines/new', [controllers.Routines, 'create']).as('routines.create')
    router.post('routines', [controllers.Routines, 'store']).as('routines.store')
    router.get('routines/:id/edit', [controllers.Routines, 'edit']).as('routines.edit')
    router.put('routines/:id', [controllers.Routines, 'update']).as('routines.update')
    router.delete('routines/:id', [controllers.Routines, 'destroy']).as('routines.destroy')
    router
      .post('routines/from-session/:sessionId', [controllers.Routines, 'fromSession'])
      .as('routines.from_session')

    // Body tracking
    router.get('body', [controllers.BodyMeasurements, 'index']).as('body.index')
    router.post('body', [controllers.BodyMeasurements, 'store']).as('body.store')
    router.put('body/:id', [controllers.BodyMeasurements, 'update']).as('body.update')
    router.delete('body/:id', [controllers.BodyMeasurements, 'destroy']).as('body.destroy')

    // Settings
    router.get('settings', [controllers.Settings, 'show']).as('settings.show')
    router.put('settings/profile', [controllers.Settings, 'updateProfile']).as('settings.profile')
    router
      .put('settings/preferences', [controllers.Settings, 'updatePreferences'])
      .as('settings.preferences')
    router.get('settings/export', [controllers.Settings, 'export']).as('settings.export')
    router
      .delete('settings/account', [controllers.Settings, 'destroyAccount'])
      .as('settings.destroy_account')

    router.get('settings/import', [controllers.Imports, 'index']).as('imports.index')
    router.post('settings/import/preview', [controllers.Imports, 'preview']).as('imports.preview')
    router.post('settings/import', [controllers.Imports, 'store']).as('imports.store')
    router.post('settings/import/:id/revert', [controllers.Imports, 'revert']).as('imports.revert')
  })
  .use(middleware.auth())
