import { Head } from '@inertiajs/react'
import { Form, Link } from '@adonisjs/inertia/react'
import AuthLayout from '~/layouts/auth'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

export default function Signup() {
  return (
    <>
      <Head title="Crear cuenta" />
      <h1 className="text-2xl font-semibold tracking-tight">Crea tu cuenta</h1>
      <p className="mt-1 text-sm text-muted-foreground">Tus entrenamientos, tus datos. Nada más.</p>

      <Form route="new_account.store" className="mt-8 grid gap-4">
        {({ errors, processing }) => (
          <>
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nombre</Label>
              <Input id="fullName" name="fullName" autoComplete="name" className="h-11" />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
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
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                className="h-11"
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="passwordConfirmation">Confirma la contraseña</Label>
              <Input
                id="passwordConfirmation"
                name="passwordConfirmation"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.passwordConfirmation}
                className="h-11"
              />
              {errors.passwordConfirmation && (
                <p className="text-sm text-destructive">{errors.passwordConfirmation}</p>
              )}
            </div>
            <Button
              variant="EXEC"
              type="submit"
              size="LG"
              className="mt-2 h-11"
              disabled={processing}
            >
              {processing ? 'Creando…' : 'Crear cuenta'}
            </Button>
          </>
        )}
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link
          route="session.create"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Inicia sesión
        </Link>
      </p>
    </>
  )
}

Signup.layout = [AuthLayout]
