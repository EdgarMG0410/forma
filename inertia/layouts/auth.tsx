import { type ReactNode } from 'react'
import Logo from '~/components/logo'
import FlashToasts from '~/components/flash_toasts'
import ThemeToggle from '~/components/theme_toggle'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle className="lg:hidden" />
        </div>
        <div className="mx-auto my-auto w-full max-w-sm py-10">{children}</div>
      </div>
      <aside className="relative hidden flex-col justify-between overflow-hidden border-l border-border bg-card p-10 lg:flex">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <div>
          <p className="text-4xl leading-tight font-semibold tracking-tight text-balance">
            Train. Track. <span className="text-primary-ink">Progress.</span>
          </p>
          <p className="mt-4 max-w-sm text-sm text-pretty text-muted-foreground">
            Forma sabe qué te toca, con cuánto peso y cuántas repeticiones — a partir de lo que
            realmente levantaste.
          </p>
        </div>
        <ul className="grid gap-3 text-sm">
          {[
            ['Registro en segundos', 'Peso y reps precargados; un toque y sigues.'],
            ['Progresión con criterio', 'Sube carga solo cuando tus series lo justifican.'],
            ['Tu historial, intacto', 'Corrige cualquier serie sin perder el registro original.'],
          ].map(([title, body]) => (
            <li key={title} className="rounded-xl border border-border bg-background p-4">
              <div className="font-medium">{title}</div>
              <div className="mt-0.5 text-muted-foreground">{body}</div>
            </li>
          ))}
        </ul>
      </aside>
      <FlashToasts />
    </div>
  )
}
