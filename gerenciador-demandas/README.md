# Gerenciador de Demandas

Este é um sistema de gerenciamento de demandas desenvolvido com FastAPI, projetado para otimizar o fluxo de trabalho e o acompanhamento de processos em empresas. A aplicação permite a criação, personalização e acompanhamento de demandas, com um sistema de autenticação robusto e gerenciamento de usuários.

## Funcionalidades

- **Autenticação de Usuários:** Sistema de login seguro com tokens de acesso.
- **Gerenciamento de Demandas:** Crie, edite, visualize e exclua demandas.
- **Personalização:** Adapte o sistema à identidade visual da sua empresa, incluindo logo e cores.
- **Gerenciamento de Usuários:** Adicione, edite e remova usuários, atribuindo diferentes níveis de permissão.
- **Notificações em Tempo Real:** Acompanhe as atualizações das demandas com notificações via WebSocket.
- **Logs de Atividades:** Registre todas as ações importantes realizadas no sistema para auditoria.
- **Relatórios:** Gere relatórios detalhados sobre as demandas para análise e tomada de decisões.

## Estrutura do Projeto

O projeto segue uma estrutura organizada para facilitar a manutenção e o desenvolvimento de novas funcionalidades:

- **/api:** Contém a lógica principal da aplicação, dividida em:
  - **/funcoes:** Funções auxiliares para diversas operações.
  - **/models:** Modelos de dados Pydantic e SQLAlchemy.
  - **/routes:** Endpoints da API, separados por funcionalidade (login, páginas, gerenciamento).
- **/db:** Configuração e gerenciamento do banco de dados.
- **/static:** Arquivos estáticos (CSS, JavaScript, imagens).
- **/templates:** Templates HTML para a renderização das páginas.

## Como Iniciar

Siga os passos abaixo para configurar e executar o projeto em seu ambiente de desenvolvimento.

### Pré-requisitos

- Python 3.8 ou superior
- Pip (gerenciador de pacotes do Python)

### Instalação

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/gerenciador-demandas.git
   cd gerenciador-demandas
   ```

2. **Crie e ative um ambiente virtual:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # No Windows, use `venv\Scripts\activate`
   ```

3. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

### Configuração do Banco de Dados

1. **Crie as tabelas no banco de dados:**
   Execute o script `criar_tabelas.py` para criar as tabelas necessárias:
   ```bash
   python criar_tabelas.py
   ```

### Executando a Aplicação

1. **Inicie o servidor:**
   Use o Uvicorn para iniciar o servidor FastAPI:
   ```bash
   uvicorn main:app --reload
   ```

2. **Acesse a aplicação:**
   Abra seu navegador e acesse `http://127.0.0.1:8000`.

## Contribuição

Contribuições são bem-vindas! Se você tiver sugestões, melhorias ou correções, sinta-se à vontade para abrir uma *issue* ou enviar um *pull request*.

## Licença

Este projeto está licenciado sob a Licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
