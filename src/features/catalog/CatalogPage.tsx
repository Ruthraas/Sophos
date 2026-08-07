import { Link } from 'react-router'
import { Compass, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QuoteCarousel from '@/components/QuoteCarousel'
import HowItWorks from '@/components/HowItWorks'

export default function CatalogPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-14 px-4 py-12 md:px-10 md:py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-primary/80">
          Fórum de Sophos
        </p>
        <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
          Uma biblioteca que a comunidade constrói junto
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground md:text-base">
          Qualquer pessoa compartilha um livro em PDF e todo mundo lê direto
          no navegador, de graça — sem anúncios, sem paywall.
        </p>
      </section>

      <QuoteCarousel />

      <div className="flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild size="lg" className="gap-2">
          <Link to="/descobrir">
            <Compass className="size-4" /> Descubra um livro pra ler
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="gap-2">
          <Link to="/enviar">
            <Upload className="size-4" /> Compartilhe um livro
          </Link>
        </Button>
      </div>

      <HowItWorks />
    </div>
  )
}
