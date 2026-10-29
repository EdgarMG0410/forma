import { Head } from '@inertiajs/react'
import { Link } from '@adonisjs/inertia/react'
import { FormaMark } from '~/components/logo'
import { Button } from '~/components/ui/button'

export default function ServerError() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <Head title="Error" />
      <div>
        <FormaMark className="mx-auto size-10" />
        <p className="num mt-6 text-sm text-muted-foreground">500</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tus datos están a salvo. Intenta de nuevo en un momento.
        </p>
        <Button asChild className="mt-6">
          <Link route="dashboard">Ir al inicio</Link>
        </Button>
      </div>
    </main>
  )
}
