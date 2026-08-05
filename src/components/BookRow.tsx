import type { ReactNode } from 'react'

export default function BookRow({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h2>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {children}
      </div>
    </section>
  )
}
