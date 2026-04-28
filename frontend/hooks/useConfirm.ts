import { useState, useCallback } from 'react'

export function useConfirm() {
  const [pending, setPending] = useState<(() => void) | null>(null)

  const confirm = useCallback((message: string, action: () => void) => {
    if (window.confirm(message)) action()
  }, [])

  return { confirm }
}
