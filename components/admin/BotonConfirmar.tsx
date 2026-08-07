'use client'

export default function BotonConfirmar({
  mensaje,
  className,
  children,
}: {
  mensaje: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      type="submit"
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault()
      }}
      className={className}
    >
      {children}
    </button>
  )
}
