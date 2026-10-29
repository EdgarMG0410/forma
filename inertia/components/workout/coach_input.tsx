import { useState } from 'react'
import { usePage } from '@inertiajs/react'
import { useRouter } from '@adonisjs/inertia/react'
import { Check, CircleAlert, MessageSquareText, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { num } from '~/lib/format'

const visit = { preserveScroll: true, preserveState: true }

/**
 * Natural-language set entry ("hice 9 con 120"). The server answers with a
 * proposal that must be confirmed; ambiguous messages ask for clarification
 * instead of guessing.
 */
export default function CoachInput({
  sessionExerciseId,
}: {
  sessionId: number
  sessionExerciseId: number
}) {
  const router = useRouter()
  const { flash } = usePage()
  const [message, setMessage] = useState('')
  const [open, setOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [dismissed, setDismissed] = useState<number | null>(null)
  const interpretation =
    flash.interpretation &&
    flash.interpretation.sessionExerciseId === sessionExerciseId &&
    flash.interpretation.id !== dismissed
      ? flash.interpretation
      : null

  const send = () => {
    if (!message.trim()) return
    setProcessing(true)
    router.post(
      { route: 'interpretations.store', routeParams: { sessionExerciseId } },
      { message },
      { ...visit, onFinish: () => setProcessing(false), onSuccess: () => setMessage('') }
    )
  }

  if (!open && !interpretation) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <MessageSquareText className="size-3.5" /> Escribir la serie («hice 9 con 120»)
      </button>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      {interpretation ? (
        interpretation.status === 'pending' && interpretation.proposal ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex-1 text-sm">
              «{interpretation.input}» →{' '}
              <span className="num font-semibold">
                {interpretation.proposal.weightValue === null
                  ? 'sin peso'
                  : `${num(interpretation.proposal.weightValue)} ${interpretation.proposal.weightUnit}`}{' '}
                × {interpretation.proposal.repetitions}
              </span>
              {interpretation.proposal.setType !== 'working' && (
                <span className="text-muted-foreground">
                  {' '}
                  · {interpretation.proposal.setType === 'warmup' ? 'calentamiento' : 'drop set'}
                </span>
              )}
              {interpretation.interpreter === 'llm' && (
                <span className="ml-1 text-xs text-muted-foreground">(IA)</span>
              )}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  router.post(
                    { route: 'interpretations.reject', routeParams: { id: interpretation.id } },
                    {},
                    { ...visit, onSuccess: () => setDismissed(interpretation.id) }
                  )
                }
              >
                <X className="size-4" /> Descartar
              </Button>
              <Button
                size="sm"
                disabled={processing}
                onClick={() => {
                  setProcessing(true)
                  router.post(
                    { route: 'interpretations.confirm', routeParams: { id: interpretation.id } },
                    {},
                    {
                      ...visit,
                      only: ['session', 'liveSession'],
                      onSuccess: () => setDismissed(interpretation.id),
                      onFinish: () => setProcessing(false),
                    }
                  )
                }}
              >
                <Check className="size-4" /> Registrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 text-sm">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-warning" />
            <p className="flex-1">
              No guardé nada: {interpretation.clarification ?? 'no entendí el mensaje.'}{' '}
              <span className="text-muted-foreground">Prueba con «9 con 120 lb».</span>
            </p>
            <button
              type="button"
              onClick={() => setDismissed(interpretation.id)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      ) : null}
      <form
        className={interpretation ? 'mt-3 flex gap-2' : 'flex gap-2'}
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <Input
          autoFocus
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="hice 9 con 120 · mismo peso, 8 · otra igual"
          className="h-10"
          maxLength={280}
          enterKeyHint="send"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={processing || !message.trim()}
          className="h-10"
        >
          Interpretar
        </Button>
      </form>
    </section>
  )
}
