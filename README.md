# Gestto: Gestão Inteligente para Empreendedores

Construa um SaaS de gestão empresarial chamado "Gestto", voltado para pequenos, médios e grandes empreendedores no Brasil.

IDENTIDADE VISUAL (siga estritamente):
- Cor primária/marca: Índigo #3D2FF0
- Fundo claro: Branco Gesso #FAFAF8
- Fundo escuro/texto principal: Grafite Profundo #15171E
- Sucesso/crescimento: Verde Avanço #14B87A
- Alerta/atenção: Âmbar #F5A623
- Texto secundário: Cinza Névoa #8A8D98
- Tipografia: display geométrica moderna (estilo Space Grotesk/General Sans) para títulos, Inter para corpo de texto, fonte monoespaçada (estilo IBM Plex Mono) para números e valores no dashboard
- Interface mobile-first, mas com versão web completa para dono/gerente

PAPÉIS DE USUÁRIO (com permissões granulares configuráveis pelo dono):
- Dono/Admin (acesso total, configura permissões de todos os outros)
- Gerente (acesso amplo, mas customizável por módulo)
- Vendedor (app simplificado: gera QR Code PIX, lança vendas no cartão, consulta estoque, vê metas/comissão)
- Produção/Auxiliar (checklist de tarefas, ficha técnica, baixa de insumos)

MÓDULOS:
1. Vendas: geração de QR Code PIX, lançamento de vendas no cartão (com parcelas), split de pagamento, PDV/comanda, metas e comissão por vendedor, modo offline com sincronização.
2. Estoque: produtos com custo/preço/margem, alerta de mínimo/máximo, controle de validade, ficha técnica de produção, fornecedores, pedidos de compra, sugestão automática de preço.
3. Financeiro: gastos fixos, folha de pagamento (diarista e CLT), contas a pagar/receber com lembretes, fluxo de caixa, DRE simplificado, simulador de imposto (Simples Nacional/MEI).
4. Dashboard: vendas diárias/semanais/mensais, comparativo de período, ranking de produtos, lucro líquido real (descontando % ou mensalidade da maquininha de cartão cadastrada pelo dono), desempenho por vendedor.
5. Equipe: ponto eletrônico via celular, checklist de tarefas, log de auditoria, gestão de permissões por módulo.
6. IA embutida: chat para dúvidas de gestão/tributação/precificação, insights automáticos sobre estoque e vendas, consultas em linguagem natural sobre os dados do negócio, previsão de vendas.
7. CRM leve: cadastro de clientes, histórico de compras, aniversário, integração WhatsApp, programa de fidelidade.
8. Integrações: emissão de NF-e/NFC-e, delivery (iFood), exportação de relatórios (PDF/Excel).

MODELO COMERCIAL:
- Assinatura mensal de R$ 99,99, primeiro mês por R$ 69,99.
- Teste grátis de 2 dias.
- Paywall visível: usuários em trial ou inadimplentes veem toda a interface e dados/telas do sistema, mas campos/ações ficam bloqueados com cadeado. Ao tentar interagir, exibir modal convidando para ativar o pagamento, sem esconder a existência da funcionalidade.

REQUISITOS GERAIS:
- Interface mobile-first (uso principal via celular, especialmente para vendedor e produção), com versão web completa para o dono/gerente.
- Multiempresa/múltiplas filiais desde o desenho de dados.
- Auditoria completa de ações por usuário.
- Cadastro de chave PIX e taxas de maquininha como pré-requisito para liberar os módulos financeiros de venda no cartão.

Comece pelo MVP: tela de login com os 4 papéis, dashboard principal (dono), módulo de vendas com geração de QR Code PIX simulado e lançamento de venda no cartão, e módulo de estoque básico. Estruture o banco de dados (Supabase) já pensando em multiempresa e permissões granulares por módulo desde o início.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://gestto-business-boost.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/71a85cb9-5aa8-48a6-a230-5100183c90bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
