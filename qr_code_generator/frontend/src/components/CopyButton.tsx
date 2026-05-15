import { useState } from 'react'
import { Button } from './Button'

type Props = {
  value: string
  label?: string
}

export function CopyButton({ value, label = 'Copy' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleClick}
      aria-live="polite"
    >
      {copied ? 'Copied!' : label}
    </Button>
  )
}
