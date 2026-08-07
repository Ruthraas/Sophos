import { Fragment } from 'react'
import { BookOpen, Bookmark, Compass, Upload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface Step {
  icon: LucideIcon
  title: string
  description: string
}

const STEPS: Step[] = [
  {
    icon: Upload,
    title: 'Compartilhe um PDF',
    description: 'Suba um livro que você tem — ele fica disponível pra todo mundo.',
  },
  {
    icon: Compass,
    title: 'A comunidade descobre',
    description: 'Todo livro compartilhado aparece em Descobrir, organizado por categoria.',
  },
  {
    icon: BookOpen,
    title: 'Leia no navegador',
    description: 'Sem baixar nada — direto na tela, em modo PDF ou texto corrido.',
  },
  {
    icon: Bookmark,
    title: 'Guarde na sua biblioteca',
    description: 'Salve o que quiser ler depois em Seus livros.',
  },
]

function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M4 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function HowItWorks() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex items-center justify-center gap-4">
        <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary/40" />
        <h2 className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-primary/80">
          Como funciona
        </h2>
        <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary/40" />
      </div>
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-start">
        {STEPS.map((step, i) => (
          <Fragment key={step.title}>
            <div className="group relative flex flex-1 flex-col items-center gap-3 overflow-hidden rounded-xl border bg-card px-5 py-7 text-center transition-transform duration-300 hover:-translate-y-1">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
              <span
                aria-hidden
                className="font-display text-3xl font-semibold text-primary/15 transition-colors duration-300 group-hover:text-primary/25"
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="-mt-2 flex size-11 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex shrink-0 items-center justify-center py-1 text-primary/50 md:py-0 md:pt-14">
                <Arrow className="size-5 rotate-90 md:rotate-0" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  )
}
