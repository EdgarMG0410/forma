import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import AuthLayout from '~/layouts/auth'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export default function Login() {
  return (
    <>
      <Head title="Iniciar sesión" />
      <h1 className="text-2xl font-semibold tracking-tight">Bienvenido de vuelta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Entra para continuar tu entrenamiento.</p>

      <Form route="session.store" className="mt-8 grid gap-4">
        {({ errors, processing }) => (
          <>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="tu@correo.com"
                aria-invalid={!!errors.email}
                className="h-11"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                className="h-11"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <Button
              variant="EXEC"
              type="submit"
              size="LG"
              className="mt-2 h-11"
              disabled={processing}
            >
              {processing ? 'Entrando…' : 'Entrar'}
            </Button>
          </>
        )}
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Nuevo en Forma?{' '}
        <Link
          route="new_account.create"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Crea tu cuenta
        </Link>
      </p>
    </>
  )
}

Login.layout = [AuthLayout]
