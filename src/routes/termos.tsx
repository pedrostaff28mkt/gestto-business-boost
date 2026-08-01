import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, Section } from "@/components/legal-layout";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Gestto" },
      {
        name: "description",
        content:
          "Termos de Uso do Gestto: assinatura mensal, teste grátis, cancelamento, responsabilidades e uso da plataforma de gestão.",
      },
      { property: "og:title", content: "Termos de Uso — Gestto" },
      { property: "og:description", content: "Condições de uso, assinatura e cancelamento do Gestto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <LegalLayout title="Termos de Uso" updated="1 de agosto de 2026">
      <p>
        Estes Termos de Uso regulam o acesso e a utilização da plataforma Gestto, um software de gestão
        empresarial oferecido no modelo de assinatura (SaaS). Ao criar uma conta, aceitar um convite de equipe
        ou utilizar qualquer módulo do Gestto, você declara ter lido e concordado com estas condições.
      </p>

      <Section title="1. Quem pode usar">
        <p>
          O Gestto é destinado a pessoas físicas e jurídicas que atuam na gestão de um negócio. O titular da
          conta (Dono/Admin) é responsável pelas informações cadastradas da empresa e pelas pessoas que
          convidar, definindo o papel e as permissões de cada uma.
        </p>
      </Section>

      <Section title="2. Conta, convites e segurança">
        <p>
          As credenciais de acesso são pessoais e não devem ser compartilhadas. Links de convite geram acesso à
          empresa com o papel e as permissões definidas pelo administrador e possuem prazo de validade. O
          titular pode revogar convites e desativar membros a qualquer momento.
        </p>
      </Section>

      <Section title="3. Teste grátis e assinatura">
        <p>
          O Gestto oferece 2 (dois) dias de teste grátis, sem necessidade de cartão. Após o teste, o uso pleno
          da plataforma depende de assinatura mensal no valor de R$ 99,99, com valor promocional de R$ 69,99 no
          primeiro mês. Durante o teste ou em caso de inadimplência, a interface permanece visível, mas ações de
          escrita podem ficar bloqueadas.
        </p>
      </Section>

      <Section title="4. Cancelamento e reembolso">
        <p>
          A assinatura pode ser cancelada a qualquer momento, sem multa. O cancelamento encerra as cobranças
          futuras e o acesso permanece disponível até o fim do período já pago. Valores de períodos já usufruídos
          não são reembolsados, salvo determinação legal aplicável.
        </p>
      </Section>

      <Section title="5. Uso adequado">
        <p>
          É proibido utilizar o Gestto para atividades ilícitas, inserir dados de terceiros sem autorização,
          tentar burlar limites técnicos, realizar engenharia reversa ou comprometer a segurança e a
          disponibilidade do serviço.
        </p>
      </Section>

      <Section title="6. Dados do cliente e disponibilidade">
        <p>
          Os dados lançados na plataforma pertencem à empresa cliente. Envidamos esforços razoáveis para manter
          o serviço disponível, mas podem ocorrer interrupções para manutenção, atualizações ou por falhas de
          terceiros. Recomendamos exportações periódicas dos relatórios relevantes.
        </p>
      </Section>

      <Section title="7. Limitação de responsabilidade">
        <p>
          O Gestto é uma ferramenta de apoio à gestão. Cálculos de margem, simulações tributárias e insights
          gerados por inteligência artificial são estimativas e não substituem a orientação de contador ou
          advogado. As decisões de negócio e as obrigações fiscais permanecem sob responsabilidade do cliente.
        </p>
      </Section>

      <Section title="8. Alterações e contato">
        <p>
          Podemos atualizar estes Termos para refletir melhorias no serviço ou exigências legais, comunicando as
          mudanças relevantes pela própria plataforma. Dúvidas podem ser enviadas pelos canais de suporte
          informados no aplicativo. Aplica-se a legislação brasileira.
        </p>
      </Section>
    </LegalLayout>
  );
}
