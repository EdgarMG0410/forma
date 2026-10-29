import { type ReactNode } from 'react'
import Logo from '~/components/logo'
import FlashToasts from '~/components/flash_toasts'

const BOOT_LINES = [
  ['Registro en segundos', 'Peso y reps precargados; un toque y sigues.'],
  ['Progresión con criterio', 'Sube carga solo cuando tus series lo justifican.'],
  ['Historial intacto', 'Corrige cualquier serie sin perder el registro original.'],
]

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
      </div>
      <aside className="scanlines relative hidden flex-col justify-between border-l border-[var(--border)] bg-[var(--surface)] p-10 lg:flex">
        <p className="term-label">Forma // sistema de entrenamiento v1.0</p>
        <div>
          <p className="glow-green flicker text-3xl leading-tight font-bold tracking-[0.12em] text-[var(--color-green)] uppercase">
            Train.
            <br />
            Track.
            <br />
            Progress.
          </p>
          <p className="mt-5 max-w-sm text-[0.8rem] text-pretty text-[var(--text-muted)]">
            Forma sabe qué te toca, con cuánto peso y cuántas repeticiones, a partir de lo que
            realmente levantaste.
          </p>
        </div>
        <ul className="grid gap-2 text-[0.75rem]">
          {BOOT_LINES.map(([title, body]) => (
            <li key={title} className="border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="tracking-widest text-[var(--color-green)] uppercase">
                <span aria-hidden="true">[OK]</span> {title}
              </div>
              <div className="mt-1 text-[var(--text-muted)]">{body}</div>
            </li>
          ))}
        </ul>
      </aside>
      <FlashToasts />
    </div>
  )
}
