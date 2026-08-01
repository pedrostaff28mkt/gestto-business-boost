import { createFileRoute } from "@tanstack/react-router";
import { LegalLayout, Section } from "@/components/legal-layout";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — Gestto" },
      {
        name: "description",
        content:
          "Como o Gestto trata dados pessoais conforme a LGPD: dados coletados, finalidades, retenção, direitos do titular e segurança.",
      },
      { property: "og:title", content: "Política de Privacidade — Gestto" },
      { property: "og:description", content: "Tratamento de dados, LGPD e direitos do titular no Gestto." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
  return (
    <LegalLayout title="Política de Privacidade" updated="1 de agosto de 2026">
      <p>
        Esta Política explica como o Gestto coleta, utiliza, armazena e protege dados pessoais, em conformidade
        com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD). Ela é mantida pela empresa
        responsável pelo Gestto e vale para todos os módulos da plataforma.
      </p>

      <Section title="1. Dados que tratamos">
        <p>
          <strong>Dados de conta:</strong> nome, e-mail, senha (armazenada de forma criptografada), papel na
          empresa e permissões por módulo.
        </p>
        <p>
          <strong>Dados da empresa:</strong> razão social, nome fantasia, documento, filiais, chave PIX e taxas
          de maquininha cadastradas pelo administrador.
        </p>
        <p>
          <strong>Dados operacionais:</strong> produtos, estoque, vendas, valores, lançamentos financeiros,
          clientes cadastrados pelo próprio cliente e registros de auditoria das ações realizadas.
        </p>
        <p>
          <strong>Dados técnicos:</strong> registros de acesso e identificadores necessários à segurança e ao
          funcionamento do serviço.
        </p>
      </Section>

      <Section title="2. Finalidades e base legal">
        <p>
          Tratamos os dados para executar o contrato de assinatura (fornecer os módulos contratados), cumprir
          obrigações legais e regulatórias, prevenir fraudes, garantir a segurança da informação e melhorar a
          plataforma. As bases legais aplicáveis são principalmente a execução de contrato, o cumprimento de
          obrigação legal e o legítimo interesse.
        </p>
      </Section>

      <Section title="3. Papéis: controlador e operador">
        <p>
          Em relação aos dados de cadastro dos usuários da plataforma, atuamos como controlador. Em relação aos
          dados inseridos pelo cliente sobre seus próprios clientes, funcionários e operações, a empresa cliente
          é a controladora e o Gestto atua como operador, tratando os dados conforme as instruções recebidas.
        </p>
      </Section>

      <Section title="4. Compartilhamento">
        <p>
          Não vendemos dados pessoais. Compartilhamos informações apenas com fornecedores necessários à operação
          do serviço (hospedagem em nuvem, banco de dados, autenticação, processamento de pagamentos e
          comunicação), sempre com obrigações de confidencialidade, ou quando exigido por autoridade competente.
        </p>
      </Section>

      <Section title="5. Segurança">
        <p>
          Adotamos medidas técnicas e administrativas como criptografia em trânsito, senhas com hash, isolamento
          de dados por empresa (cada empresa acessa somente os seus registros), controle de acesso por papel e
          permissão, e registro de auditoria das ações dos usuários.
        </p>
      </Section>

      <Section title="6. Retenção e exclusão">
        <p>
          Mantemos os dados enquanto a conta estiver ativa. Após o cancelamento, os dados podem ser conservados
          por período adicional para cumprimento de obrigações legais, fiscais e de defesa em processos, sendo
          depois eliminados ou anonimizados. O cliente pode solicitar a exclusão da conta pelos canais de
          suporte.
        </p>
      </Section>

      <Section title="7. Direitos do titular">
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade,
          informação sobre compartilhamentos, revogação de consentimento e eliminação de dados, nos termos da
          LGPD. Os pedidos são atendidos pelos canais de suporte informados no aplicativo, após verificação de
          identidade.
        </p>
      </Section>

      <Section title="8. Cookies e alterações">
        <p>
          Utilizamos armazenamento local e cookies estritamente necessários para manter a sessão autenticada e
          preferências de uso. Esta Política pode ser atualizada; mudanças relevantes serão comunicadas na
          própria plataforma.
        </p>
      </Section>
    </LegalLayout>
  );
}
