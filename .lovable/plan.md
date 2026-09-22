# Tema claro, escuro e automático

## Implementação
- Salvar as duas marcas enviadas como assets do projeto, associando a versão de texto branco ao tema escuro e a versão de texto preto ao tema claro.
- Criar um contexto de tema com as opções Claro, Escuro e Automático, persistido em `gestto-theme`.
- Aplicar a classe `dark` no documento e reagir a mudanças do tema do sistema quando Automático estiver selecionado.
- Inicializar o tema antes da interface aparecer para evitar troca visual durante o carregamento.
- Atualizar a marca para escolher automaticamente a imagem apropriada ao tema efetivo.
- Adicionar o controle segmentado com ícones na seção “Meu perfil”.

## Validação
- Conferir tema inicial, troca entre as três opções, persistência após recarregar e atualização da marca.
- Rodar a verificação de tipos e o build final.

## Detalhes técnicos
- O provedor ficará no layout raiz para atender páginas públicas e autenticadas.
- O modo Automático acompanhará `prefers-color-scheme` em tempo real.
- As imagens serão servidas pelo armazenamento de assets do projeto, mantendo o repositório leve.
