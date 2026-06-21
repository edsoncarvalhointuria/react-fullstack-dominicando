# Dominicando - Gestão Inteligente para Escola Dominical

![Adobe Express - dominicando-gif](https://github.com/user-attachments/assets/9efe7f2a-06cd-41fb-bcb9-c214d0714c82)

---

## 📖 Sobre o Projeto

O **Dominicando** nasceu de um propósito claro: servir e abençoar minha igreja local. Desenvolvido gratuitamente e com muito carinho, o objetivo principal deste projeto é criar uma ferramenta que simplifique e melhore a vida dos professores da Escola Dominical.

Ao automatizar tarefas manuais como a chamada, o controle de ofertas e a geração de relatórios, a plataforma libera os professores para focarem no que realmente importa: o ensino e o cuidado com os alunos. Acredito que, ao equipar e apoiar os professores, o impacto positivo se estende por toda a congregação, ajudando o ministério inteiro a crescer de forma organizada e informada.

Este projeto é a materialização dessa visão, combinando tecnologia moderna com um propósito de serviço.

📌 **Acesse a versão ao vivo:** [dominicando.web.app
](https://dominicando.web.app/)

---

### ✨ Principais Funcionalidades

- **Painel de Controle Dinâmico:** Um dashboard inicial (`Início`) que apresenta um resumo visual dos dados mais importantes, com cards e gráficos que se adaptam ao cargo do usuário.
- **Gestão Completa (CRUD):** Módulos completos para gerenciar Alunos, Membros, Classes, Igrejas e Usuários, com tabelas responsivas, filtros e modais de cadastro/edição.
- **Sistema de Chamada Inteligente:** Um fluxo de 3 etapas para realizar a chamada, com salvamento de rascunhos, ações em massa e registro detalhado de presenças, ofertas e recursos.
- **Relatórios Gráficos Avançados:** Uma central de Business Intelligence que permite gerar gráficos dinâmicos de barras, linhas e pizza, com múltiplos filtros e agrupamentos.
- **Exportação de Dados:** Funcionalidade para gerar e baixar relatórios completos em formato `.csv`, com uma interface de pré-visualização.
- **Sistema de Convites Seguro:** Administradores podem gerar códigos de convite de uso único e com tempo de expiração para cadastrar novos usuários de forma segura.
- **Autenticação Completa:** Fluxo de login, página "Minha Conta" para alteração de senha e tela de "Esqueci a Senha".

---

### 🚀 Tecnologias Utilizadas

- **Frontend:**
    - **React** com **Vite**
    - **TypeScript**
    - **React Hook Form** para gerenciamento de formulários
    - **Framer Motion** para animações
    - **SASS** para estilização
    - **Recharts** para visualização de dados
- **Backend & Infraestrutura:**
    - **Firebase Authentication**
    - **Firestore Database** como banco de dados NoSQL
    - **Firebase Functions** para lógica de backend segura
    - **Firebase Storage** para armazenamento de arquivos
    - **Firebase Hosting** para o deploy da aplicação

---

### ⚙️ Como Rodar o Projeto Localmente

1. **Clone o repositório:**

    ```bash
    git clone https://github.com/edsoncarvalhointuria/react-fullstack-dominicando.git
    ```

2. **Instale as dependências:**

    ```bash
    cd dominicando
    npm install
    ```

3. **Configure as Variáveis de Ambiente:**
    - Crie um arquivo `.env.local` na raiz do projeto.
    - Adicione as chaves do seu projeto Firebase neste arquivo. Você pode encontrá-las no Console do Firebase > Configurações do Projeto.

    ```env
    VITE_FIREBASE_API_KEY=sua_api_key
    VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
    VITE_FIREBASE_PROJECT_ID=seu_project_id
    VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
    VITE_FIREBASE_APP_ID=seu_app_id
    ```

4. **Rode o projeto:**

    ```bash
    npm run dev
    ```

---

### 💌 Contato

**Edson Carvalho Inturia**

<p align="left">  
<a href="mailto:edsoncarvalhointuria@gmail.com" title="Gmail">  
  <img src="https://img.shields.io/badge/-Gmail-FF0000?style=flat-square&labelColor=FF0000&logo=gmail&logoColor=white" alt="Gmail"/>  
</a>  
<a href="https://br.linkedin.com/in/edson-carvalho-inturia-1442a0129" title="LinkedIn">  
  <img src="https://img.shields.io/badge/-LinkedIn-0e76a8?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn"/>  
</a> 
</p>

---

Um agradecimento ao site [Lordicon](https://lordicon.com/) por fornecer alguns dos GIFs animados utilizados neste projeto.
