import { useEffect } from 'react'
import { toast } from 'sonner'
import { router, usePage } from '@inertiajs/react'
import { Toaster } from '~/components/ui/sonner'

export default function FlashToasts() {
  const { flash } = usePage()

  useEffect(() => {
    return router.on('start', () => toast.dismiss('flash'))
  }, [])

  useEffect(() => {
    if (flash.error) toast.error(flash.error, { id: 'flash' })
    if (flash.success) toast.success(flash.success, { id: 'flash' })
  }, [flash])

  return <Toaster position="top-center" />
}
