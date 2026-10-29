import type { SessionExerciseStatus } from './enums.js'

export type FlowExercise = {
  id: number
  orderIndex: number
  status: SessionExerciseStatus
  targetSets: number
  loggedSets: number
}

export type NextStep =
  | { kind: 'set'; sessionExerciseId: number; setNumber: number; totalSets: number }
  | { kind: 'done' }

/**
 * Which exercise and set come next. The exercise in progress keeps focus
 * until its target sets are logged or it is closed; then the first pending
 * exercise in order. An exercise can go past its target (the user added a
 * set) — `focusId` keeps it selected while the user is still on it.
 */
export function nextStep(exercises: FlowExercise[], focusId?: number | null): NextStep {
  const ordered = [...exercises].sort((a, b) => a.orderIndex - b.orderIndex)
  const open = (e: FlowExercise) => e.status === 'pending' || e.status === 'in_progress'

  const focused = focusId ? ordered.find((e) => e.id === focusId && open(e)) : undefined
  if (focused && focused.loggedSets < focused.targetSets) return stepFor(focused)

  const inProgress = ordered.find((e) => e.status === 'in_progress' && e.loggedSets < e.targetSets)
  if (inProgress) return stepFor(inProgress)

  const pending = ordered.find((e) => open(e) && e.loggedSets < e.targetSets)
  if (pending) return stepFor(pending)

  return { kind: 'done' }
}

function stepFor(e: FlowExercise): NextStep {
  return {
    kind: 'set',
    sessionExerciseId: e.id,
    setNumber: e.loggedSets + 1,
    totalSets: Math.max(e.targetSets, e.loggedSets + 1),
  }
}

/**
 * Status an exercise should have after its sets changed.
 */
export function exerciseStatusAfterChange(
  current: SessionExerciseStatus,
  loggedSets: number,
  targetSets: number
): SessionExerciseStatus {
  if (current === 'skipped') return current
  if (loggedSets === 0) return 'pending'
  if (loggedSets >= targetSets) return 'completed'
  return 'in_progress'
}

export function sessionProgress(exercises: FlowExercise[]) {
  const counted = exercises.filter((e) => e.status !== 'skipped')
  const target = counted.reduce((sum, e) => sum + Math.max(e.targetSets, e.loggedSets), 0)
  const logged = counted.reduce((sum, e) => sum + e.loggedSets, 0)
  return {
    loggedSets: logged,
    targetSets: target,
    ratio: target === 0 ? 0 : Math.min(1, logged / target),
    completedExercises: exercises.filter((e) => e.status === 'completed').length,
    totalExercises: counted.length,
  }
}

/**
 * Active time, excluding pauses. `pausedSeconds` holds closed pauses; an
 * open pause is counted up to `now`.
 */
export function activeSeconds(input: {
  startedAt: Date | null
  endedAt: Date | null
  pausedAt: Date | null
  pausedSeconds: number
  now: Date
}): number | null {
  if (!input.startedAt) return null
  const end = input.endedAt ?? input.now
  const openPause =
    input.pausedAt && !input.endedAt ? (input.now.getTime() - input.pausedAt.getTime()) / 1000 : 0
  const total = (end.getTime() - input.startedAt.getTime()) / 1000 - input.pausedSeconds - openPause
  return Math.max(0, Math.round(total))
}
