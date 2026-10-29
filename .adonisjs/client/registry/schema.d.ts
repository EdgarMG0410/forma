/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'new_account.create': {
    methods: ["GET","HEAD"]
    pattern: '/signup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['create']>>>
    }
  }
  'new_account.store': {
    methods: ["POST"]
    pattern: '/signup'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').signupValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').signupValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/new_account_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session.create': {
    methods: ["GET","HEAD"]
    pattern: '/login'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['create']>>>
    }
  }
  'session.store': {
    methods: ["POST"]
    pattern: '/login'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/user').loginValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/user').loginValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workouts.shared': {
    methods: ["GET","HEAD"]
    pattern: '/s/:token'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { token: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['shared']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['shared']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['shared']>>>
    }
  }
  'dashboard': {
    methods: ["GET","HEAD"]
    pattern: '/'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/dashboard_controller').default['index']>>>
    }
  }
  'session.destroy': {
    methods: ["POST"]
    pattern: '/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_controller').default['destroy']>>>
    }
  }
  'workouts.create': {
    methods: ["GET","HEAD"]
    pattern: '/workouts/start'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['create']>>>
    }
  }
  'workouts.store': {
    methods: ["POST"]
    pattern: '/workouts'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').startWorkoutValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').startWorkoutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workouts.show': {
    methods: ["GET","HEAD"]
    pattern: '/workouts/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['show']>>>
    }
  }
  'workouts.summary': {
    methods: ["GET","HEAD"]
    pattern: '/workouts/:id/summary'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['summary']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['summary']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['summary']>>>
    }
  }
  'workouts.pause': {
    methods: ["POST"]
    pattern: '/workouts/:id/pause'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['pause']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['pause']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['pause']>>>
    }
  }
  'workouts.resume': {
    methods: ["POST"]
    pattern: '/workouts/:id/resume'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['resume']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['resume']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['resume']>>>
    }
  }
  'workouts.finish': {
    methods: ["POST"]
    pattern: '/workouts/:id/finish'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').finishWorkoutValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').finishWorkoutValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['finish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['finish']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['finish']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workouts.cancel': {
    methods: ["POST"]
    pattern: '/workouts/:id/cancel'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['cancel']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['cancel']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['cancel']>>>
    }
  }
  'workouts.narrate': {
    methods: ["POST"]
    pattern: '/workouts/:id/narrative'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['narrate']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['narrate']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['narrate']>>>
    }
  }
  'workouts.share': {
    methods: ["POST"]
    pattern: '/workouts/:id/share'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['share']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['share']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['share']>>>
    }
  }
  'workouts.unshare': {
    methods: ["DELETE"]
    pattern: '/workouts/:id/share'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['unshare']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['unshare']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workouts_controller').default['unshare']>>>
    }
  }
  'session_exercises.store': {
    methods: ["POST"]
    pattern: '/workouts/:sessionId/exercises'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').addSessionExerciseValidator)>>
      paramsTuple: [ParamValue]
      params: { sessionId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').addSessionExerciseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session_exercises.reorder': {
    methods: ["PUT"]
    pattern: '/workouts/:sessionId/exercises/order'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').reorderValidator)>>
      paramsTuple: [ParamValue]
      params: { sessionId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').reorderValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['reorder']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['reorder']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['reorder']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session_exercises.update': {
    methods: ["PATCH"]
    pattern: '/session-exercises/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').updateSessionExerciseValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').updateSessionExerciseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'session_exercises.destroy': {
    methods: ["DELETE"]
    pattern: '/session-exercises/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/session_exercises_controller').default['destroy']>>>
    }
  }
  'workout_sets.store': {
    methods: ["POST"]
    pattern: '/session-exercises/:sessionExerciseId/sets'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').logSetValidator)>>
      paramsTuple: [ParamValue]
      params: { sessionExerciseId: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').logSetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workout_sets.update': {
    methods: ["PATCH"]
    pattern: '/sets/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').updateSetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').updateSetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'workout_sets.destroy': {
    methods: ["DELETE"]
    pattern: '/sets/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['destroy']>>>
    }
  }
  'workout_sets.repeat': {
    methods: ["POST"]
    pattern: '/sets/:id/repeat'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/workout').repeatSetValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/workout').repeatSetValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['repeat']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['repeat']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/workout_sets_controller').default['repeat']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'interpretations.store': {
    methods: ["POST"]
    pattern: '/session-exercises/:sessionExerciseId/interpret'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { sessionExerciseId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['store']>>>
    }
  }
  'interpretations.confirm': {
    methods: ["POST"]
    pattern: '/interpretations/:id/confirm'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['confirm']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['confirm']>>>
    }
  }
  'interpretations.reject': {
    methods: ["POST"]
    pattern: '/interpretations/:id/reject'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['reject']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['reject']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/interpretations_controller').default['reject']>>>
    }
  }
  'history.index': {
    methods: ["GET","HEAD"]
    pattern: '/history'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/history_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/history_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/history_controller').default['index']>>>
    }
  }
  'history.compare': {
    methods: ["GET","HEAD"]
    pattern: '/history/compare'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/history_controller').default['compare']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/history_controller').default['compare']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/history_controller').default['compare']>>>
    }
  }
  'exercises.index': {
    methods: ["GET","HEAD"]
    pattern: '/exercises'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['index']>>>
    }
  }
  'exercises.store': {
    methods: ["POST"]
    pattern: '/exercises'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').exerciseValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/library').exerciseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'exercises.show': {
    methods: ["GET","HEAD"]
    pattern: '/exercises/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['show']>>>
    }
  }
  'exercises.update': {
    methods: ["PUT"]
    pattern: '/exercises/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').exerciseValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/library').exerciseValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/exercises_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'routines.index': {
    methods: ["GET","HEAD"]
    pattern: '/routines'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['index']>>>
    }
  }
  'routines.create': {
    methods: ["GET","HEAD"]
    pattern: '/routines/new'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['create']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['create']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['create']>>>
    }
  }
  'routines.store': {
    methods: ["POST"]
    pattern: '/routines'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').routineValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/library').routineValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'routines.edit': {
    methods: ["GET","HEAD"]
    pattern: '/routines/:id/edit'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['edit']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['edit']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['edit']>>>
    }
  }
  'routines.update': {
    methods: ["PUT"]
    pattern: '/routines/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').routineValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/library').routineValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'routines.destroy': {
    methods: ["DELETE"]
    pattern: '/routines/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['destroy']>>>
    }
  }
  'routines.from_session': {
    methods: ["POST"]
    pattern: '/routines/from-session/:sessionId'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { sessionId: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['fromSession']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['fromSession']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/routines_controller').default['fromSession']>>>
    }
  }
  'body.index': {
    methods: ["GET","HEAD"]
    pattern: '/body'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['index']>>>
    }
  }
  'body.store': {
    methods: ["POST"]
    pattern: '/body'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').bodyMeasurementValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/library').bodyMeasurementValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['store']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'body.update': {
    methods: ["PUT"]
    pattern: '/body/:id'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').bodyMeasurementValidator)>>
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/library').bodyMeasurementValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'body.destroy': {
    methods: ["DELETE"]
    pattern: '/body/:id'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/body_measurements_controller').default['destroy']>>>
    }
  }
  'settings.show': {
    methods: ["GET","HEAD"]
    pattern: '/settings'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['show']>>>
    }
  }
  'settings.profile': {
    methods: ["PUT"]
    pattern: '/settings/profile'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').profileValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/library').profileValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateProfile']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updateProfile']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.preferences': {
    methods: ["PUT"]
    pattern: '/settings/preferences'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').preferencesValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/library').preferencesValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updatePreferences']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updatePreferences']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['updatePreferences']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'settings.export': {
    methods: ["GET","HEAD"]
    pattern: '/settings/export'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['export']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['export']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['export']>>>
    }
  }
  'settings.destroy_account': {
    methods: ["DELETE"]
    pattern: '/settings/account'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/library').deleteAccountValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/library').deleteAccountValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['destroyAccount']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['destroyAccount']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/settings_controller').default['destroyAccount']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'imports.index': {
    methods: ["GET","HEAD"]
    pattern: '/settings/import'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['index']>>>
    }
  }
  'imports.preview': {
    methods: ["POST"]
    pattern: '/settings/import/preview'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['preview']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['preview']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['preview']>>>
    }
  }
  'imports.store': {
    methods: ["POST"]
    pattern: '/settings/import'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['store']>>>
    }
  }
  'imports.revert': {
    methods: ["POST"]
    pattern: '/settings/import/:id/revert'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['revert']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['revert']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/imports_controller').default['revert']>>>
    }
  }
}

export namespace Route {
  export type Request<Name extends keyof typeof routes> = RouteWithRegistry.Request<typeof routes, Name>
  export type Response<Name extends keyof typeof routes> = RouteWithRegistry.Response<typeof routes, Name>
  export type Params<Name extends keyof typeof routes> = RouteWithRegistry.Params<typeof routes, Name>
  export type Body<Name extends keyof typeof routes> = RouteWithRegistry.Body<typeof routes, Name>
  export type Query<Name extends keyof typeof routes> = RouteWithRegistry.Query<typeof routes, Name>
  export type Error<Name extends keyof typeof routes> = RouteWithRegistry.Error<typeof routes, Name>
}

export namespace Path {
  export type Request<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Request<typeof routes, M, P>
  export type Response<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Response<typeof routes, M, P>
  export type Params<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Params<typeof routes, M, P>
  export type Body<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Body<typeof routes, M, P>
  export type Query<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Query<typeof routes, M, P>
  export type Error<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Error<typeof routes, M, P>
}
