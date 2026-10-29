import { useMemo, useState } from 'react'
import { router } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, CalendarDays, ChevronLeft, ChevronRight, GitCompare, X } from 'lucide-react'
import AppLayout from '~/layouts/app'
import PageHeader from '~/components/page_header'
import EmptyState from '~/components/empty_state'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { compact, date } from '~/lib/format'
import { cn } from '~/lib/utils'
import type { HistoryRow, PaginationMeta } from '~/types/views'

type Props = {
  history: { unit: string; meta: PaginationMeta; data: HistoryRow[] }
  calendar: {
    month: string
    sessions: Array<{
      id: number
      name: string
      status: string
      date: string
      dataQuality: string
      source: string
    }>
  }
  filters: {
    from: string | null
    to: string | null
    exercise: number | null
    muscle: string | null
  }
  exercises: Array<{ id: number; name: string }>
  muscles: Array<{ slug: string; name: string }>
}

const ALL = '__all'

export default function HistoryPage({ history, calendar, filters, exercises, muscles }: Props) {
  const [selected, setSelected] = useState<number[]>([])
  const [sorting, setSorting] = useState<SortingState>([])
  const apply = (next: Partial<Props['filters']> & { month?: string; page?: number }) => {
    const query = { ...filters, month: calendar.month, ...next }
    router.get(
      '/history',
      Object.fromEntries(
        Object.entries(query).filter(([, v]) => v !== null && v !== undefined && v !== '')
      ),
      { preserveScroll: true, preserveState: true, replace: true }
    )
  }
  const hasFilters = !!(filters.from || filters.to || filters.exercise || filters.muscle)
  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id].slice(-2)))

  const columns = useMemo<ColumnDef<HistoryRow>[]>(
    () => [
      {
        id: 'select',
        header: () => <span className="sr-only">Comparar</span>,
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Seleccionar ${row.original.name} para comparar`}
            checked={selected.includes(row.original.id)}
            onChange={() => toggle(row.original.id)}
            className="size-4 accent-[var(--primary)]"
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'workoutDate',
        header: 'Fecha',
        cell: ({ row }) => (
          <span className="num whitespace-nowrap">
            {date(row.original.workoutDate, { day: 'numeric', month: 'short', year: '2-digit' })}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: 'Sesión',
        cell: ({ row }) => (
          <div className="min-w-0">
            <Link
              route="workouts.summary"
              routeParams={{ id: row.original.id }}
              className="font-medium hover:underline"
            >
              {row.original.name}
            </Link>
            <p className="max-w-md truncate text-xs text-muted-foreground">
              {row.original.exerciseNames}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'sets',
        header: 'Series',
        cell: ({ getValue }) => <span className="num">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'reps',
        header: 'Reps',
        cell: ({ getValue }) => <span className="num">{getValue<number>()}</span>,
      },
      {
        accessorKey: 'volume',
        header: `Volumen (${history.unit})`,
        cell: ({ getValue }) => <span className="num">{compact(getValue<number>())}</span>,
      },
      {
        id: 'flags',
        header: '',
        enableSorting: false,
        cell: ({ row }) => <Flags row={row.original} />,
      },
    ],
    [selected, history.unit]
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 is not compiler-safe; this page doesn't rely on memoisation
  const table = useReactTable({
    data: history.data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <>
      <PageHeader
        title="Historial"
        description={`${history.meta.total} sesiones registradas`}
        actions={
          selected.length === 2 ? (
            <Button variant="EXEC" asChild>
              <Link route="history.compare" qs={{ a: selected[0], b: selected[1] }}>
                <GitCompare className="size-4" /> Comparar
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Selecciona dos sesiones para compararlas
            </span>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <MonthCalendar
          month={calendar.month}
          sessions={calendar.sessions}
          onMonth={(month) => apply({ month })}
        />

        <div className="min-w-0">
          {/* Filters */}
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Input
              type="date"
              aria-label="Desde"
              value={filters.from ?? ''}
              onChange={(e) => apply({ from: e.target.value || null, page: 1 })}
              className="h-10"
            />
            <Input
              type="date"
              aria-label="Hasta"
              value={filters.to ?? ''}
              onChange={(e) => apply({ to: e.target.value || null, page: 1 })}
              className="h-10"
            />
            <Select
              value={filters.exercise ? String(filters.exercise) : ALL}
              onValueChange={(v) => apply({ exercise: v === ALL ? null : Number(v), page: 1 })}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Ejercicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los ejercicios</SelectItem>
                {exercises.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.muscle ?? ALL}
              onValueChange={(v) => apply({ muscle: v === ALL ? null : v, page: 1 })}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Músculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos los músculos</SelectItem>
                {muscles.map((m) => (
                  <SelectItem key={m.slug} value={m.slug}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasFilters && (
            <Button
              variant="GHOST"
              size="SM"
              className="mb-3"
              onClick={() =>
                router.get('/history', { month: calendar.month }, { preserveScroll: true })
              }
            >
              <X className="size-4" /> Quitar filtros
            </Button>
          )}

          {history.data.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={hasFilters ? 'Nada con esos filtros' : 'Aún no hay sesiones'}
            >
              {hasFilters
                ? 'Prueba con otro rango o ejercicio.'
                : 'Termina un entrenamiento o importa tu historial desde Ajustes.'}
            </EmptyState>
          ) : (
            <>
              {/* Mobile: cards */}
              <ul className="grid gap-2 md:hidden">
                {history.data.map((row) => (
                  <li
                    key={row.id}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border border-border bg-card p-3',
                      selected.includes(row.id) && 'border-primary/50'
                    )}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${row.name}`}
                      checked={selected.includes(row.id)}
                      onChange={() => toggle(row.id)}
                      className="size-4 accent-[var(--primary)]"
                    />
                    <Link
                      route="workouts.summary"
                      routeParams={{ id: row.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{row.name}</span>
                        <span className="num shrink-0 text-xs text-muted-foreground">
                          {date(row.workoutDate)}
                        </span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{row.exerciseNames}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs">
                        <span className="num">{row.sets} series</span>
                        <span className="num">
                          {compact(row.volume)} {history.unit}
                        </span>
                        <Flags row={row} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Desktop: sortable table */}
              <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    {table.getHeaderGroups().map((group) => (
                      <tr key={group.id}>
                        {group.headers.map((header) => (
                          <th
                            key={header.id}
                            className="px-3 py-2.5 text-left text-xs font-medium text-muted-foreground"
                          >
                            {header.column.getCanSort() ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 hover:text-foreground"
                                onClick={header.column.getToggleSortingHandler()}
                              >
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                <ArrowUpDown className="size-3" />
                              </button>
                            ) : (
                              flexRender(header.column.columnDef.header, header.getContext())
                            )}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-t border-border',
                          selected.includes(row.original.id) && 'bg-primary/5'
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-2.5 align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {history.meta.lastPage > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <Button
                    variant="OUTLINE"
                    size="SM"
                    disabled={history.meta.currentPage <= 1}
                    onClick={() => apply({ page: history.meta.currentPage - 1 })}
                  >
                    <ChevronLeft className="size-4" /> Anterior
                  </Button>
                  <span className="num text-muted-foreground">
                    {history.meta.currentPage} / {history.meta.lastPage}
                  </span>
                  <Button
                    variant="OUTLINE"
                    size="SM"
                    disabled={history.meta.currentPage >= history.meta.lastPage}
                    onClick={() => apply({ page: history.meta.currentPage + 1 })}
                  >
                    Siguiente <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}

HistoryPage.layout = [AppLayout]

function Flags({ row }: { row: HistoryRow }) {
  return (
    <span className="flex flex-wrap gap-1">
      {row.status !== 'completed' && <Badge>En curso</Badge>}
      {row.source === 'import' && <Badge variant="OFFLINE">Importada</Badge>}
      {row.dataQuality !== 'complete' && <Badge variant="OFFLINE">Parcial</Badge>}
      {row.incompleteSets > 0 && <Badge variant="OFFLINE">{row.incompleteSets} sin datos</Badge>}
      {row.dateConfidence !== 'exact' && <Badge variant="OFFLINE">Fecha aprox.</Badge>}
    </span>
  )
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function MonthCalendar({
  month,
  sessions,
  onMonth,
}: {
  month: string
  sessions: Props['calendar']['sessions']
  onMonth: (m: string) => void
}) {
  const [year, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, m - 1, 1))
  const days = new Date(Date.UTC(year, m, 0)).getUTCDate()
  const offset = (first.getUTCDay() + 6) % 7
  const byDay = new Map<number, Props['calendar']['sessions']>()
  for (const s of sessions) {
    const d = Number(s.date.slice(8, 10))
    byDay.set(d, [...(byDay.get(d) ?? []), s])
  }
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(year, m - 1 + delta, 1))
    onMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  const today = new Date().toISOString().slice(0, 10)

  return (
    <section className="h-fit rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Button size="ICON" variant="GHOST" onClick={() => shift(-1)} aria-label="Mes anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="text-sm font-semibold first-letter:uppercase">
          {first.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
        </h2>
        <Button size="ICON" variant="GHOST" onClick={() => shift(1)} aria-label="Mes siguiente">
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1
          const list = byDay.get(day)
          const iso = `${month}-${String(day).padStart(2, '0')}`
          const content = (
            <span
              className={cn(
                'num relative grid aspect-square place-items-center rounded-lg text-xs',
                list ? 'bg-primary font-semibold text-primary-foreground' : 'text-foreground',
                iso === today && !list && 'ring-1 ring-border'
              )}
            >
              {day}
              {list && list.length > 1 && (
                <span className="absolute right-1 bottom-0.5 text-[9px]">{list.length}</span>
              )}
            </span>
          )
          return list ? (
            <Link
              key={day}
              route="workouts.summary"
              routeParams={{ id: list[0].id }}
              title={list.map((s) => s.name).join(', ')}
            >
              {content}
            </Link>
          ) : (
            <div key={day}>{content}</div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {sessions.length} {sessions.length === 1 ? 'sesión' : 'sesiones'} este mes
      </p>
    </section>
  )
}
