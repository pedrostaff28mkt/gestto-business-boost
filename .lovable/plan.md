# Sistema de suporte via chat

## Objetivo
Adicionar atendimento por tickets dentro de Ajustes para clientes e uma central de suporte no painel interno para administradores, usando as tabelas e regras de acesso já existentes.

## Implementação
- Criar funções compartilhadas para listar, abrir, responder e atualizar tickets, sempre usando a sessão autenticada e as permissões atuais do banco.
- Adicionar em Ajustes uma seção disponível a qualquer papel:
  - triagem com categoria, assunto e descrição quando não houver atendimento ativo;
  - conversa com mensagens, identificação do suporte, horário e envio de respostas;
  - histórico somente leitura para atendimento encerrado e ação para iniciar outro;
  - atualização automática a cada 5 segundos e badge de status.
- Criar `/painel-interno/suporte` com a mesma validação de administrador do painel existente:
  - filtros por status e lista ordenada pela atividade mais recente;
  - empresa, categoria, assunto, status e prévia da última mensagem;
  - conversa completa, resposta administrativa e alteração manual do status;
  - atualização automática a cada 5 segundos.
- Adicionar acesso à central de suporte no painel interno.
- Preservar a experiência atual das demais telas e executar verificação de tipos, build e fluxo principal no navegador.

## Detalhes técnicos
- As leituras e escritas do cliente usarão o acesso autenticado já limitado pelas regras do banco.
- As operações administrativas usarão funções de servidor protegidas, que validam `profiles.is_admin` antes de qualquer acesso amplo.
- A criação do ticket e da primeira mensagem será tratada como uma única operação do fluxo; se a mensagem falhar, o ticket recém-criado será removido quando permitido pelas regras existentes.
- Não será criada migration: as tabelas, políticas e trigger informados já existem.
