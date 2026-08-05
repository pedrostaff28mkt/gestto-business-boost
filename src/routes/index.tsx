import { createFileRoute, Link } from "@tanstack/react-router";
import {
  QrCode,
  Package,
  LineChart,
  Users,
  Sparkles,
  Wallet,
  ArrowRight,
  Check,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { testimonials } from "@/lib/testimonials";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gestto — Clareza para gerir o seu negócio" },
      {
        name: "description",
        content:
          "Veja o que entra, o que sai e quanto sobra de verdade. Vendas no PIX e cartão, estoque e equipe num só lugar. 2 dias grátis, R$ 69,99 no 1º mês.",
      },
      { property: "og:title", content: "Gestto — Clareza para gerir o seu negócio" },
      {
        property: "og:description",
        content:
          "Saiba todos os dias quanto vendeu, quanto sobrou e o que precisa da sua atenção. Teste grátis por 2 dias.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const modules = [
  { icon: QrCode, title: "Vendas", text: "Receba no PIX na hora ou no cartão parcelado, com meta clara para cada vendedor." },
  { icon: Package, title: "Estoque", text: "Saiba o que está acabando, o que vence e quanto cada produto realmente custa." },
  { icon: Wallet, title: "Financeiro", text: "Contas a pagar, folha e fluxo de caixa sem planilha e sem susto no fim do mês." },
  { icon: LineChart, title: "Dashboard", text: "O lucro que sobra de verdade, já com a taxa da maquininha descontada." },
  { icon: Users, title: "Equipe", text: "Ponto pelo celular, tarefas do dia e cada pessoa vendo só o que precisa ver." },
  { icon: Sparkles, title: "IA embutida", text: "Respostas simples sobre o seu negócio e avisos do que merece atenção agora." },
];

const faqs = [
  {
    question: "Quando recebo uma venda pelo PIX ou no cartão, o dinheiro vai para mim ou para o Gestto?",
    answer:
      "O dinheiro vai direto para você. O Gestto gera o QR Code usando a sua própria chave PIX cadastrada e registra a venda no sistema para os relatórios — em nenhum momento o valor passa pela conta do Gestto. No cartão, o recebimento segue normalmente pela sua maquininha; o Gestto só calcula automaticamente a taxa descontada para mostrar seu lucro líquido real.",
  },
  {
    question: "Preciso ter CNPJ para usar o Gestto?",
    answer:
      "Não é obrigatório. O Gestto funciona bem para MEI, autônomos e pequenos negócios informais, além de empresas de médio e grande porte já formalizadas. O que você vai precisar (chave PIX, maquininha de cartão etc.) depende dos seus próprios arranjos de recebimento, não do Gestto.",
  },
  {
    question: "Posso cancelar a assinatura quando quiser?",
    answer:
      "Sim. Não existe fidelidade nem multa de cancelamento. Você pode cancelar a qualquer momento direto nas configurações da sua conta, e continua com acesso até o fim do período já pago.",
  },
  {
    question: "O Gestto funciona sem internet?",
    answer:
      "Hoje é necessário estar conectado à internet para usar o Gestto, já que os dados ficam sincronizados em tempo real entre você e sua equipe. Um modo offline com sincronização automática está no nosso roadmap.",
  },
  {
    question: "Meus dados e os da minha empresa ficam seguros? Quem pode ver essas informações?",
    answer:
      "Sim. Cada empresa só enxerga os próprios dados, e dentro da empresa cada pessoa só vê o que o dono liberou para o cargo dela — vendedor não vê o financeiro completo, por exemplo. Todas as ações ficam registradas em um log de auditoria, e seguimos as exigências da LGPD para tratamento de dados.",
  },
];


function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div
            className="flex size-8 items-center justify-center rounded-lg font-display font-bold text-primary-foreground"
            style={{ background: "var(--gradient-brand)" }}
          >
            G
          </div>
          <span className="font-display text-xl font-bold">Gestto</span>
        </div>
        <Button asChild variant="ghost">
          <Link to="/auth">Entrar</Link>
        </Button>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-8 pb-16 lg:pt-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <ShieldCheck className="size-3.5" /> Feito para o empreendedor brasileiro
            </span>
            <h1 className="mt-5 text-4xl leading-[1.05] font-bold sm:text-6xl">
              Clareza para o seu
              <br />
              negócio, todos os dias.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Você não precisa de mais números soltos. Precisa saber quanto vendeu, quanto sobrou de verdade
              e o que exige a sua atenção hoje — em português claro, na tela do celular.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link to="/auth">
                  Começar teste grátis <ArrowRight className="size-4" />
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                2 dias grátis · <span className="num">R$ 69,99</span> no 1º mês
              </p>
            </div>
          </div>

          <div className="surface p-6">
            <p className="text-sm text-muted-foreground">Faturamento hoje</p>
            <p className="num mt-1 text-4xl font-semibold">R$ 4.280,00</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-success-soft p-4">
                <p className="text-xs text-muted-foreground">Lucro líquido</p>
                <p className="num mt-1 text-xl font-semibold">R$ 1.712,40</p>
              </div>
              <div className="rounded-xl bg-warning-soft p-4">
                <p className="text-xs text-muted-foreground">Taxa maquininha</p>
                <p className="num mt-1 text-xl font-semibold">R$ 137,90</p>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {[
                ["PIX · Ana", "R$ 89,90"],
                ["Crédito 3x · Bruno", "R$ 340,00"],
                ["Débito · Ana", "R$ 52,00"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                >
                  <span className="text-muted-foreground">{label}</span>
                  <span className="num font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-14 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => (
            <div key={m.title} className="rounded-xl border border-border p-5">
              <m.icon className="size-5 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pt-4 pb-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold lg:text-3xl">Quem já enxerga o próprio negócio com clareza</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Donos que trocaram achismo por decisão tomada com número na mão.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <figure key={t.name} className="surface flex flex-col rounded-2xl p-6">
              <div className="flex items-center gap-1" aria-label={`Avaliação ${t.rating} de 5`}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="size-4 fill-warning text-warning" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-foreground">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 border-t border-border pt-4">
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.business}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t.since}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="surface p-7 text-center lg:p-10">
          <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
            Plano Gestto
          </span>
          <h2 className="mt-4 text-2xl font-bold lg:text-3xl">Um plano, tudo liberado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Acesso completo a todos os módulos — hoje e no que estiver por vir.
          </p>

          <div className="mt-6">
            <p className="num text-5xl font-bold text-primary">R$ 69,99</p>
            <p className="mt-1 text-sm text-muted-foreground">
              no primeiro mês, depois <span className="num">R$ 99,99</span>/mês
            </p>
            <p className="mt-3 text-sm font-medium text-foreground">
              Menos que um almoço executivo por mês para cuidar da empresa inteira.
            </p>
          </div>

          <ul className="mt-8 grid gap-3 text-left text-sm sm:grid-cols-2">
            {[
              "Vendas: PIX na hora e cartão parcelado, direto do celular",
              "Estoque: controle de mínimo, validade e ficha técnica de produção",
              "Equipe: convite de funcionário com permissão sob medida, ponto pelo celular",
              "Multiempresa e múltiplas filiais",
              "Auditoria completa de cada ação da equipe",
              "Financeiro: contas, folha de pagamento e fluxo de caixa",
              "CRM: histórico de clientes e fidelização",
              "IA embutida: insights automáticos e respostas sobre o seu negócio",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-success" />
                <span>{item}</span>
              </li>
            ))}
          </ul>


          <p className="mt-6 text-sm text-muted-foreground">
            Novos módulos incluídos automaticamente na sua assinatura, sem custo extra.
          </p>

          <Button asChild size="lg" className="mt-6 w-full">
            <Link to="/auth">Criar minha conta</Link>
          </Button>

          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            2 dias grátis, sem cartão · cancele quando quiser, sem multa
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold lg:text-3xl">Perguntas frequentes</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Tudo o que você precisa saber antes de começar.
          </p>

          <Accordion type="single" collapsible className="mt-8 surface divide-y divide-border overflow-hidden">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-0 px-5">
                <AccordionTrigger className="py-5 text-left text-base font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>Gestto · Clareza para gerir pequenos, médios e grandes negócios.</p>
        <nav className="mt-3 flex justify-center gap-5">
          <Link to="/termos" className="hover:text-foreground">
            Termos de Uso
          </Link>
          <Link to="/privacidade" className="hover:text-foreground">
            Política de Privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}
