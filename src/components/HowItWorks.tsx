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
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
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
      <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
        Como funciona
      </h2>
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-start">
        {STEPS.map((step, i) => (
          <Fragment key={step.title}>
            <div className="flex flex-1 flex-col items-center gap-3 rounded-xl border bg-card px-5 py-6 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <step.icon className="size-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex shrink-0 items-center justify-center py-1 text-primary/50 md:py-0 md:pt-10">
                <Arrow className="size-5 rotate-90 md:rotate-0" />
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  )
}
