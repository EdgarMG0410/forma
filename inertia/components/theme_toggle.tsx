import { Moon, Sun } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { useTheme } from '~/hooks/use_theme'

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggle}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}
