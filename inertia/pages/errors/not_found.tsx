import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { FormaMark } from '~/components/logo'
import { Button } from '~/components/ui/button'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <Head title="No encontrado" />
      <div>
        <FormaMark className="mx-auto size-10" />
        <p className="num mt-6 text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Esta página no existe</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Revisa la dirección o vuelve al inicio.
        </p>
        <Button variant="EXEC" asChild className="mt-6">
          <Link route="dashboard">Ir al inicio</Link>
        </Button>
      </div>
    </main>
  )
}
