import { Pencil, RotateCcw } from 'lucide-react'
import type { SetDTO } from '@domain/dto'
import { Badge } from '~/components/ui/badge'
import { num } from '~/lib/format'
import { cn } from '~/lib/utils'

export default function SetRow({
  set,
  onEdit,
  onRepeat,
  highlight = false,
}: {
  set: SetDTO
  onEdit?: () => void
  onRepeat?: () => void
  highlight?: boolean
}) {
  return (
    <li className={cn('flex items-center gap-3 rounded-lg px-2 py-2', highlight && 'bg-primary/5')}>
      <span className="num grid size-7 shrink-0 place-items-center rounded-md bg-muted text-xs font-semibold text-muted-foreground">
        {set.setNumber}
      </span>
      <span className="num flex-1 text-base font-semibold">
        {set.weightValue === null ? '—' : num(set.weightValue)}
        <span className="text-sm font-normal text-muted-foreground"> {set.weightUnit ?? ''}</span>
        <span className="mx-1.5 text-muted-foreground">×</span>
        {set.repetitions ?? '—'}
        {set.rir !== null && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">RIR {num(set.rir)}</span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {set.setType !== 'working' && (
          <Badge variant="secondary" className="text-[10px]">
            {set.setType === 'warmup' ? 'Calent.' : 'Drop'}
          </Badge>
        )}
        {set.weightBasis === 'per_hand' && (
          <Badge variant="outline" className="text-[10px]">
            por mano
          </Badge>
        )}
        {set.userCorrected && (
          <Badge variant="outline" className="text-[10px]">
            corregida
          </Badge>
        )}
        {set.source === 'import' && (
          <Badge variant="outline" className="text-[10px]">
            importada
          </Badge>
        )}
        {onRepeat && (
          <button
            type="button"
            onClick={onRepeat}
            className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Repetir serie ${set.setNumber}`}
          >
            <RotateCcw className="size-4" />
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="grid size-9 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={`Corregir serie ${set.setNumber}`}
          >
            <Pencil className="size-4" />
          </button>
        )}
      </span>
    </li>
  )
}
