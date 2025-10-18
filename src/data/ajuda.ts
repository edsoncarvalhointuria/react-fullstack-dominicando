const imgsDesktop = import.meta.glob(`/src/assets/ajuda-imgs/desktop/*`, {
    eager: true,
});
const imgsMobile = import.meta.glob(`/src/assets/ajuda-imgs/mobile/*`, {
    eager: true,
});
const imgs = { imgsDesktop, imgsMobile };
const isMobile = window.innerWidth < 480;

const key = isMobile ? "imgsMobile" : "imgsDesktop";

const base = `/src/assets/ajuda-imgs/${isMobile ? "mobile" : "desktop"}/`;

export interface AjudaInteface {
    id: any;
    titulo: string;
    conteudo: string;
    videoDesktop?: string;
    videoMobile?: string;
    isSuperAdmin?: boolean;
    isAdmin?: boolean;
}

export const dadosAjuda: AjudaInteface[] = [
    {
        id: "diferenca-aluno-membro-visitante",
        titulo: "Qual a diferença entre Aluno, Membro e Visitante?",
        conteudo: `
# Aluno, Membro ou Visitante? Entenda a diferença!

No Dominicando, usamos alguns termos para organizar as pessoas. Entender a diferença entre eles é super simples e vai te ajudar a manter tudo organizado. Vamos lá!

---

### 👤 O Membro

Pense no **Membro** como o **registro oficial da pessoa na igreja**. É a "fonte da verdade".

* **O que é?** É o cadastro principal de uma pessoa que faz parte da congregação. Contém os dados como nome, data de nascimento, contato, número da carteirinha e a data em que se tornou membro.
* **Onde eu gerencio?** Você pode ver e gerenciar todos os membros na página de **Gestão > Membros**.
* **Ponto-chave:** Um membro pode ou não ser um aluno da Escola Dominical.

![Imagem da tela de Gestão de Membros](${
            (imgs[key][base + "gestao-membros-img.png"] as any).default
        })
*A página de Gestão de Membros é o seu "arquivo" central de todas as pessoas da igreja.*

---

### 🎓 O Aluno

Pense no **Aluno** como o **papel que uma pessoa desempenha na Escola Dominical**.

* **O que é?** É o registro que vincula uma pessoa a uma classe e aos trimestres. Um Aluno pode ser um Membro da igreja (e nós podemos criar esse vínculo!) ou pode ser alguém da comunidade que apenas frequenta a EBD.
* **Onde eu gerencio?** Você pode ver todos que já foram alunos na página de **Gestão > Alunos**.
* **Ponto-chave:** Todo mundo que participa da chamada é um "Aluno".

![Imagem do modal de cadastro de aluno mostrando o vínculo com membro](${
            (imgs[key][base + "gestao-aluno-img.png"] as any).default
        })
*Ao cadastrar um Aluno, você pode vinculá-lo a um Membro para uma análise mais completa.*

---

### 👋 O Visitante

Pense no **Visitante** como uma pessoa que visita a classe esporadicamente. O sistema guarda um registro único para cada visitante para rastrear o histórico e facilitar o contato.

* **O que é?** É o cadastro de uma pessoa que não é aluna regular, mas que frequenta a classe de vez em quando.
* **Onde eu gerencio?** Você pode adicionar novos visitantes na tela de **Chamada** e ver a lista completa de todos os visitantes da igreja em **Gestão > Visitantes**.
* **Ponto-chave:** O nome completo é usado como identificador único de um visitante. Por isso, é importante sempre cadastrar o nome completo!

![Imagem da seção de visitantes na página de chamada](${
            (imgs[key][base + "gestao-visitantes-img.png"] as any).default
        })
*Você pode adicionar os detalhes do visitante diretamente na chamada do dia.*

`,
    },
    {
        id: "como-iniciar-novo-trimestre",
        titulo: "Como iniciar um novo trimestre?",
        conteudo: `
# Como eu inicio um novo trimestre? (cadastrando uma nova revista)

Iniciar um novo trimestre é uma das tarefas mais importantes no Dominicando. É aqui que você cadastra a nova revista de estudo e define quais alunos participarão das aulas. O sistema foi projetado para tornar esse processo rápido e inteligente.

---

### O Conceito-Chave: Você não precisa cadastrar o aluno de novo!

Antes de começar, é crucial lembrar a diferença:

* **Aluno:** É o cadastro da **pessoa**. Ele é único e permanente no sistema.
* **Matrícula:** É o que **conecta** um aluno a um trimestre específico.

Isso significa que você **não precisa cadastrar seus alunos toda vez** que um novo trimestre começa. Você apenas irá matriculá-los na nova lição! Se precisar de mais detalhes, confira nosso guia: [Qual a diferença entre Aluno, Membro e Visitante?](/ajuda/diferenca-aluno-membro-visitante).

---

### Passo a Passo para Iniciar o Trimestre

1.  **Acesse a Tela de Aulas:** No menu principal, vá em **Aulas**. Se você tiver permissão para mais de uma classe, selecione a classe desejada.

2.  **Clique em "Iniciar um novo trimestre":** No topo da tela, você verá um botão destacado para esta ação.

![Imagem da tela de lições, destacando o botão 'Iniciar um novo trimestre'](${
            (imgs[key][base + "iniciar-trimestre-img.png"] as any).default
        })

3.  **Preencha os Dados da Lição (Revista):** Um formulário completo aparecerá. Preencha as informações:
    * **Capa da Revista (Opcional, mas importante):** Adicione uma imagem para deixar tudo mais visual.
    * **Título da Lição:** O tema do trimestre.
    * **Nº do Trimestre e Data de Início:** Essencial para a organização. A data de início **precisa ser um domingo**.
    * **Quantidade de Aulas:** Geralmente 13, mas você pode ajustar.

4.  **Matricule os Alunos:** Esta é a etapa final e mais importante! Você verá duas listas:
    * **À esquerda:** Todos os alunos disponíveis na sua igreja.
    * **À direita:** Os alunos que serão matriculados neste trimestre.
    * **Para matricular, basta clicar no nome do aluno na lista da esquerda!** Ele será movido para a direita. Clicou errado? Clique no nome dele na lista da direita para devolvê-lo.

![Exemplo da tela de matrícula no Novo Trimestre](${
            (imgs[key][base + "matriculando-aluno-img.png"] as any).default
        })

### ✨ O Botão Mágico: "Importar do trimestre anterior"

Para agilizar ainda mais, use o botão **"Importar do trimestre anterior"**. Com um único clique, o sistema automaticamente matricula todos os alunos que já estavam na turma do último trimestre! É um enorme poupador de tempo.

5.  **Salve o Trimestre:** Após preencher tudo, clique em **"Criar Trimestre"**. Pronto! Sua nova lição estará criada e pronta para a primeira chamada.
`,
        videoMobile:
            "https://www.youtube.com/embed/mjM2NXgW3po?si=nh07DkIXkkvNnroj",
    },
    {
        id: "como-matricular-um-aluno",
        titulo: "Como eu faço para matricular um aluno?",
        conteudo: `
# Como Matricular um Aluno?

Este guia vai te mostrar, passo a passo, como é fácil matricular um aluno no Dominicando. Primeiro, vamos entender dois conceitos rápidos:

## O que é um Aluno vs. uma Matrícula?

Pense assim:

* **O Aluno:** Representa uma **pessoa** no mundo real. É como o "RG" dela dentro do sistema. Por isso, cada aluno só precisa ser cadastrado uma única vez!
* **A Matrícula:** É o que **conecta** um Aluno a um **Trimestre** específico. É como se inscrever para um curso. Uma pessoa pode fazer o "curso" do primeiro trimestre, mas não o do terceiro, por exemplo.

## Como eu realizo a matrícula?

Existem duas maneiras principais, dependendo do momento.

---

### 1. Matriculando no Início do Trimestre (O jeito mais comum!)

Este é o fluxo padrão ao criar uma nova revista para o trimestre.

1.  Vá em **Aulas > Iniciar Novo Trimestre**.
2.  Preencha os dados da revista (título, datas, etc.).
3.  No final do formulário, você verá duas listas: à esquerda, todos os alunos da sua igreja; à direita, os que serão matriculados (no celular elas ficam uma abaixo da outra).
4.  Para matricular, basta **clicar no nome do aluno** na lista da esquerda!

![Exemplo da tela de matrícula no Novo Trimestre](${
            (imgs[key][base + "matriculando-aluno-img.png"] as any).default
        })

#### ✨ O Botão Mágico: Importar Alunos

Você verá um botão super útil acima da lista de matriculados: **"Importar do trimestre anterior"**. Clicando nele, o sistema automaticamente traz todos os alunos que já estavam na última turma!

---

### 2. Matriculando no Meio do Trimestre

Às vezes, um aluno novo chega no meio do trimestre. Sem problemas!

1.  Inicie uma nova chamada (indo em \`Aulas\`, clicando na lição e na aula do dia).
2.  Na tela da chamada, você verá um botão com um **+** ao lado da barra de pesquisa.
3.  Clicando ali, o sistema abrirá um modal com todos os alunos da igreja que ainda **não estão** matriculados na sua classe. É só clicar para adicionar!

*Precisa cadastrar um aluno que ainda não existe no sistema? Dê uma olhada no nosso guia sobre [Como Cadastrar um Novo Aluno](/ajuda/como-cadastrar-um-aluno)!*
`,
        videoMobile:
            "https://www.youtube.com/embed/9a1LVS8_66Y?si=Ia1r7FErSnys65qV",
    },
    {
        id: "o-que-e-o-dominicando",
        titulo: "O que é o Dominicando?",
        conteudo: `
# Bem-vindo ao Dominicando!

## O que é o Dominicando, afinal?

Pense no Dominicando como a sua **caderneta de chamada, só que com superpoderes**. Ele foi criado com um único propósito: **servir e abençoar a igreja**.

Eu sei que o trabalho de um professor ou secretário é uma bênção, mas que a parte administrativa (a chamada, o controle de ofertas, os relatórios) pode tomar um tempo precioso. O Dominicando nasceu para automatizar essas tarefas, liberando você para focar no que realmente importa: **o ensino da Palavra e o cuidado com os alunos**.

## O que eu consigo fazer aqui?

Com o Dominicando, você terá em um só lugar:

* ✅ **Chamadas Rápidas e Inteligentes:** Faça a chamada em poucos cliques, registre presenças, atrasos, ofertas, visitantes e muito mais.
* 📊 **Relatórios Automáticos:** Chega de somar números no papel! Com um clique, você tem o panorama completo do trimestre ou até mesmo gráficos para apresentar nas reuniões.
* 🗂️ **Gestão Centralizada:** Mantenha um cadastro organizado de alunos, membros e classes da sua igreja.
* 🔒 **Segurança e Acessibilidade:** Seus dados ficam guardados com segurança na nuvem, acessíveis de qualquer lugar, seja no seu computador ou no seu celular.

![Imagem do Dashboard do Dominicando](${
            (imgs[key][base + "dominicando-img.png"] as any).default
        })
*A tela de Início, por exemplo, te dá uma visão geral e rápida de como a sua Escola Dominical está indo.*

O objetivo é simples: menos papelada, mais ministério. Espero que esta ferramenta seja uma grande bênção para você!`,
    },
    {
        id: "como-instalar-o-aplicativo",
        titulo: "Como instalo o aplicativo no meu celular?",
        conteudo: `
# Como "Instalar" o Dominicando no seu Dispositivo

Uma das funcionalidades mais legais do Dominicando é que ele pode ser "instalado" na tela inicial do seu celular ou computador. Ele ganha um ícone próprio e se comporta como um aplicativo de verdade, com acesso rápido e uma experiência em tela cheia!

Isso é possível porque o Dominicando é um **Progressive Web App (PWA)**, um "super site" que aprendeu truques de aplicativo.

O processo de instalação é um pouquinho diferente dependendo do seu dispositivo. Vamos ver como fazer em cada um!

---

### 🤖 Para Android (Usando o Chrome)

No Android, o processo é o mais simples!

1.  Acesse o site do Dominicando pelo navegador Chrome.
2.  Após alguns segundos de uso, o próprio navegador pode te mostrar uma pequena mensagem na parte de baixo da tela, sugerindo a instalação.
3.  Se a mensagem não aparecer, não tem problema! Basta tocar nos **três pontinhos** (o menu do Chrome) no canto superior direito.
4.  No menu que abrir, procure e toque na opção **"Instalar aplicativo"** (ou "Adicionar à tela inicial").

![Imagem do menu do Chrome no Android mostrando a opção 'Instalar aplicativo'](${
            (
                imgsDesktop[
                    base.replace("mobile", "desktop") +
                        "instalar-android-img.png"
                ] as any
            ).default
        })
*É só procurar por esta opção no menu do seu navegador!*

Pronto! O ícone do Dominicando aparecerá na sua lista de aplicativos, pronto para ser usado.

---

### 🍎 Para iOS (iPhone/iPad, usando o Safari)

No sistema da Apple, o processo é um pouco diferente, mas igualmente fácil. O Safari não mostra um pop-up automático, então precisamos fazer a instalação manualmente.

1.  Acesse o site do Dominicando pelo navegador **Safari**.
2.  Toque no ícone de **"Compartilhar"**. É aquele quadrado com uma seta apontando para cima, que fica na barra de ferramentas do navegador.
3.  No menu de compartilhamento que aparecer, role para baixo até encontrar a opção **"Adicionar à Tela de Início"**.
4.  Toque nela, confirme o nome e... pronto!

![Imagem do menu de compartilhamento do Safari no iOS mostrando a opção 'Adicionar à Tela de Início'](${
            (
                imgsDesktop[
                    base.replace("mobile", "desktop") +
                        "instalar-iphone-img.png"
                ] as any
            ).default
        })
*O botão de Compartilhar é a chave para instalar no iPhone e iPad.*

O ícone do Dominicando aparecerá na sua tela inicial, junto com seus outros aplicativos.

---

### 💻 Para Desktop (Computador, usando Chrome/Edge)

Sim, você também pode instalar no seu computador para um acesso mais rápido!

1.  Acesse o site do Dominicando pelo navegador Chrome ou Edge.
2.  Olhe para a **barra de endereço**, no canto direito. Você verá um pequeno ícone que se parece com uma tela de computador com uma seta para baixo.
3.  Clique neste ícone e depois em **"Instalar"**.

![Imagem da barra de endereço do Chrome mostrando o ícone de instalação de PWA](${
            (
                imgsDesktop[
                    base.replace("mobile", "desktop") +
                        "instalar-computador-img.png"
                ] as any
            ).default
        })
*Fique de olho neste ícone na sua barra de endereço ou clique na mensagem que aparecer na tela!*

O Dominicando será instalado como um aplicativo no seu computador, e você pode até mesmo fixá-lo na sua barra de tarefas para um acesso super rápido!
`,
        videoMobile:
            "https://www.youtube.com/embed/dlJqHTLM0wI?si=t5qdZRSh50LnCoTq",
        videoDesktop:
            "https://www.youtube.com/embed/jls8uu4L8pc?si=hLkd_wLNudYViGSZ",
    },
    {
        id: "como-redefinir-senha",
        titulo: "Como eu redefino minha senha?",
        conteudo: `
# Esqueci ou quero mudar minha senha, e agora?

Manter sua conta segura é super importante. No Dominicando, existem duas maneiras de atualizar sua senha, dependendo se você está logado ou não. Vamos ver como fazer em cada caso!

---

### Cenário 1: Você **está logado** e quer mudar sua senha

Este é o caso mais simples, perfeito para quando você quer atualizar sua senha por segurança.

1.  **Acesse sua conta:** Clique no ícone de perfil no canto superior direito e vá para a página **"Minha Conta"**.
2.  **Encontre a seção "Alterar Senha"**: Nesta página, você encontrará um formulário específico para isso.
3.  **Preencha os campos:**
    * **Senha Atual:** Você precisará digitar sua senha antiga para provar que é você mesmo. É uma medida de segurança!
    * **Nova Senha:** Digite a sua nova senha (lembre-se, no mínimo 6 caracteres).
    * **Confirmar Nova Senha:** Digite a nova senha novamente para garantir que não houve erros de digitação.
4.  **Clique em "Salvar Nova Senha"** e pronto! Sua senha será atualizada.

![Imagem da página Minha Conta mostrando o formulário de alteração de senha](${
            (imgs[key][base + "minha-conta-img.png"] as any).default
        })
*É na página "Minha Conta" que você pode gerenciar sua senha com segurança.*

---

### Cenário 2: Você **esqueceu sua senha** e não consegue logar

Não se preocupe, acontece com todo mundo! O processo para recuperar o acesso é super seguro.

1.  **Vá para a tela de Login**.
2.  Logo abaixo do campo da senha, clique no link **"Esqueceu a senha?"**.
3.  **Digite seu e-mail:** Uma pequena janela (modal) aparecerá, pedindo o e-mail da sua conta. Digite-o e clique em "Enviar link de redefinição".
4.  **Verifique sua caixa de entrada:** O Dominicando enviará um e-mail para você com um link especial e seguro.
    * **Importante:** Não se esqueça de verificar também a sua caixa de **Spam** ou "Lixo Eletrônico", às vezes o e-mail pode cair lá por engano!
5.  **Crie a nova senha:** Clique no link que você recebeu no e-mail. Ele te levará para uma página segura do Firebase onde você poderá definir sua nova senha.

![Imagem do modal de "Esqueci a senha" na tela de login](${
            (imgs[key][base + "esqueci-minha-senha-img.png"] as any).default
        })
*É só clicar no link, digitar seu e-mail e seguir as instruções!*

Depois de redefinir, você já pode voltar para a tela de login e acessar sua conta com a nova senha.
`,
        videoMobile:
            "https://youtube.com/embed/77RSIjIW14M?si=LP4VeExPfiDI2G6c",
    },
    {
        id: "como-fazer-a-chamada",
        titulo: "Como eu faço a chamada da aula? (Passo a Passo)",
        conteudo: `
# Como eu faço a chamada da aula? (Passo a Passo)

Realizar a chamada no Dominicando foi pensado para ser um processo rápido e intuitivo, dividido em 3 etapas simples. Este guia vai te mostrar como fazer isso. Vamos lá!

---

### Acessando a Chamada

1.  No menu principal, vá para a página **Aulas**.
2.  Clique na **Revista do Trimestre Ativo** (ela terá um selo "Ativa").
3.  Na lista de aulas que aparecer, clique na aula correspondente ao dia. O sistema já deixará a aula do domingo atual em destaque para você!

---

### Etapa 1: A Lista de Alunos

Esta é a tela principal da chamada, onde você marcará a presença de cada aluno.

![Imagem da Etapa 1 da Chamada, mostrando a lista de alunos e os status.](${
            (imgs[key][base + "chamada-1-img.png"] as any).default
        })

* **Status do Aluno:** Para cada aluno, basta clicar em uma das quatro opções: **Presente**, **Atrasado**, **Falta** ou **Falta Justificada**. Por padrão, todos começam como "Presente" para agilizar o processo!
* **Bíblia e Lição:** Se o aluno estiver presente ou atrasado, você poderá marcar se ele trouxe a Bíblia e a Lição.
* **✨ A Varinha Mágica:** Para aqueles dias em que, por exemplo, poucos alunos vieram, em vez de marcar a falta de cada um, você pode usar as **[Ações Rápidas](/ajuda/como-usar-acoes-rapidas)**! Clique no ícone de "varinha mágica" acima da lista para abrir um menu que permite marcar "Todos Ausentes", "Todos sem Bíblia", etc., de uma só vez, agilizando muito o seu trabalho.

Depois de marcar todos, clique em **"Avançar"**.

---

### Etapa 2: Dados Gerais da Aula

Esta etapa é para os números gerais da sua classe naquele dia.

![Imagem da Etapa 2 da Chamada, mostrando os campos de visitantes, ofertas e missões.](${
            (imgs[key][base + "chamada-2-img.png"] as any).default
        })

* **Visitantes:** Se você teve visitantes, você pode simplesmente colocar a **quantidade** no primeiro campo.
* **Detalhar Visitantes (Opcional):** Se quiser [registrar os nomes](/ajuda/diferenca-aluno-membro-visitante) para um futuro contato, clique no botão **"+"** ao lado.
* **Ofertas e Missões:** Preencha os valores arrecadados em Dinheiro e PIX.
* **Anexar Comprovantes (Opcional):** Ao lado dos campos de PIX, você pode clicar no ícone de imagem para anexar os comprovantes. Isso ajuda muito a secretaria na organização!

---

### Etapa 3: Resumo e Confirmação

Esta é a última tela, o seu "recibo" final antes de salvar.

* **O que é?** O sistema te mostra um resumo completo de tudo que você preencheu: total de presentes, total de ofertas, etc.
* **Ação:** Confira se todos os números estão corretos. Se precisar ajustar algo, basta clicar em **"Voltar"**. Se estiver tudo certo, clique em **"Salvar Chamada"**.

E pronto! A chamada do dia está registrada com segurança.

**💡 Dica de Ouro:** Não se preocupe se a internet cair ou se você precisar fechar o navegador no meio da chamada. O Dominicando **salva um rascunho automaticamente** para você. Da próxima vez que você abrir a chamada daquele dia, seus dados estarão lá, esperando por você!
`,
        videoMobile:
            "https://www.youtube.com/embed/aH1Uv34nwzs?si=w37SJ5nUXttYTIJb",
    },
    {
        id: "como-usar-acoes-rapidas",
        titulo: "Como eu uso as 'Ações Rápidas' (A Varinha Mágica)?",
        conteudo: `
# Como usar as "Ações Rápidas" na Chamada (A Varinha Mágica) ✨

Uma das ferramentas mais úteis para agilizar o seu dia a dia na hora da chamada é o menu de "Ações Rápidas", carinhosamente apelidado de "Varinha Mágica".

Ele foi criado para aqueles dias em que você precisa aplicar a mesma ação para todos os alunos de uma vez, economizando muitos cliques!

## Onde encontrar a Varinha Mágica?

Você encontrará o ícone da varinha mágica ( ✨ ) na primeira etapa da chamada, logo acima da lista de alunos, ao lado da barra de pesquisa.

![Imagem da barra de ferramentas da chamada, destacando o ícone da Varinha Mágica.](${
            (imgs[key][base + "varinha-magica-img.png"] as any).default
        })

## Como funciona?

É super simples!

1.  **Clique no ícone da Varinha Mágica.** Isso abrirá um pequeno menu flutuante com várias opções.
2.  **Escolha a ação desejada.** Por exemplo, se em um domingo de feriado poucos alunos compareceram, em vez de marcar a "Falta" para cada um, você pode simplesmente clicar em **"Todos com Falta"**. O sistema fará o trabalho para você!

![Imagem do menu de Ações Rápidas aberto, mostrando as opções.](${
            (imgs[key][base + "varinha-magica-aberta-img.png"] as any).default
        })

### Quais são as ações disponíveis?

O menu é dividido em duas seções para facilitar:

* **Status dos Alunos:**
    * \`Todos Presentes\`
    * \`Todos Atrasados\`
    * \`Todos com Falta\`
    * \`Todos com Falta Justificada\`

* **Recursos:**
    * \`Todos com Revista\` / \`Todos sem Revista\`
    * \`Todos com Bíblia\` / \`Todos sem Bíblia\`

**💡 Dica de Ouro:** Você pode combinar as ações! Por exemplo, você pode primeiro clicar em "Todos com Bíblia" e depois ajustar manualmente apenas aquele aluno que esqueceu. É uma ferramenta para te dar um ponto de partida rápido!
`,
        videoMobile:
            "https://youtube.com/embed/pDEjoi2SSKA?si=BGg4AZYZ8k5B3udk",
    },
    {
        id: "como-registrar-visitantes",
        titulo: "Como eu registro os visitantes da minha classe?",
        conteudo: `
# Como Registrar os Visitantes da Classe?

Registrar os visitantes é uma ótima forma de acompanhar quem está frequentando sua classe e de facilitar um contato futuro. No Dominicando, você tem a flexibilidade de fazer um registro rápido ou um mais detalhado.

---

### Onde eu registro os visitantes?

A área para registrar visitantes fica na **Etapa 2 da Chamada ("Dados Gerais")**.

![Imagem da Etapa 2 da Chamada, destacando a seção de Visitantes.](${
            (imgs[key][base + "cadastrando-visitante-img.png"] as any).default
        })

---

### As Duas Formas de Registro

Você tem duas opções, pensadas para se adaptar à sua necessidade no momento.

#### 1. O Jeito Rápido (Apenas a Quantidade)

Se você está com pressa ou teve muitos visitantes no dia, pode simplesmente digitar o **número total** de visitantes no campo principal. Isso já é suficiente para que os relatórios da Escola Dominical fiquem corretos.

#### 2. O Jeito Detalhado (Registrando os Nomes)

Esta é a melhor opção para criar um relacionamento com quem visita sua classe.

1.  Clique no botão verde **"+"**.
2.  Um modal se abrirá, permitindo que você cadastre as informações do visitante (nome, contato, data de nascimento).
3.  Ao salvar, o nome do visitante aparecerá em uma lista logo abaixo do campo de quantidade, e o número total será atualizado automaticamente!

![Imagem da lista de visitantes adicionados na Etapa 2 da Chamada.](${
            (imgs[key][base + "lista-visitantes-img.png"] as any).default
        })

**💡 Dica Importante:** Ao registrar os detalhes, tente sempre usar o **nome completo** do visitante. Isso ajuda o sistema a reconhecê-lo se ele retornar no futuro, evitando cadastros duplicados e mantendo o histórico de visitas dele sempre correto na página de **Gestão > Visitantes**.

Para entender melhor a diferença entre um Aluno e um Visitante, confira nosso artigo: **[Qual a diferença entre Aluno, Membro e Visitante?](/ajuda/diferenca-aluno-membro-visitante)**
`,
        videoMobile:
            "https://www.youtube.com/embed/TRmhfVTl8j8?si=sEzdqyzqIGmoaCGC",
    },
    {
        id: "como-anexar-comprovantes-pix",
        titulo: "Como anexo os comprovantes de PIX na chamada?",
        conteudo: `
# Como Anexar os Comprovantes de PIX na Chamada?

Anexar os comprovantes de PIX diretamente na chamada é uma forma super eficiente de ajudar a secretaria da sua igreja a manter tudo organizado. O processo é bem simples!

---

### Onde e Como Anexar?

Você encontrará a opção de anexar comprovantes na **Etapa 2 da Chamada ("Dados Gerais")**, logo ao lado dos campos de valor para **Ofertas PIX** e **Missões PIX**.

![Imagem da Etapa 2 da Chamada, destacando o botão para anexar comprovantes.](${
            (imgs[key][base + "add-comprovante-img.png"] as any).default
        })

1.  **Preencha o valor** correspondente ao PIX que você recebeu (seja de oferta ou de missões).
2.  **Clique no botão** com o ícone de imagem e o texto **"Comprovante PIX"**.
3.  A janela de seleção de arquivos do seu celular ou computador irá abrir. Você pode selecionar **uma ou mais imagens** de uma vez!
4.  Após selecionar, os nomes dos arquivos aparecerão em uma lista logo abaixo, confirmando que eles foram anexados.

![Imagem mostrando a lista de comprovantes anexados na Etapa 2.](${
            (imgs[key][base + "lista-comprovantes-img.png"] as any).default
        })

**Precisa remover um arquivo que você anexou por engano?** Sem problemas! Basta clicar no ícone de "X" ao lado do nome do arquivo na lista.

É só isso! Ao salvar a chamada, esses comprovantes ficarão vinculados àquela aula específica, facilitando muito o trabalho de conciliação financeira da secretaria.

**💡 Dica de Ouro:** Depois de salvar a chamada, os administradores podem visualizar e baixar todos os comprovantes enviados em um só lugar! Para saber como, confira nosso artigo: **[Onde eu encontro os comprovantes de PIX que foram enviados?](/ajuda/onde-encontrar-comprovantes-pix)**
`,
        videoMobile:
            "https://www.youtube.com/embed/kwrptriYJKw?si=QnDYAcDy2NZuQ1g7",
    },
    {
        id: "o-que-e-panorama-licao",
        titulo: "O que é o 'Panorama da Lição' e como posso usá-lo?",
        conteudo: `
# O que é o "Panorama da Lição"? (O seu Dashboard do Trimestre)

Uma das ferramentas mais poderosas para acompanhar o desempenho da sua classe ao longo de um trimestre é o **"Panorama da Lição"**.

Pense nele como um **dashboard exclusivo** para cada revista, que te dá uma visão geral e detalhada de tudo que aconteceu até o momento. É o lugar perfeito para responder àquela pergunta: "Quantas faltas o aluno X teve este trimestre?".

---

### Como Acessar o Panorama?

É super fácil!

1.  Vá para a página de **Aulas** e clique na revista do trimestre que você quer analisar.
2.  No topo do modal da lição, você verá um ícone de **engrenagem** (⚙️). Clique nele.
3.  No menu que aparecer, selecione a opção **"Panorama da Lição"**.

![Imagem do menu da engrenagem no modal da lição, destacando a opção "Panorama da Lição".](${
            (imgs[key][base + "panorama-licao-img.png"] as any).default
        })

---

### O que eu encontro no Panorama?

A tela é dividida em duas seções principais, projetadas para te dar as informações mais importantes de relance.

#### 1. Os Cards de Visão Geral

No topo, você encontrará um resumo dos principais indicadores da sua classe:

* **Progresso do Trimestre:** Uma barra de progresso mostrando quantas aulas já foram concluídas.
* **Média de Presença:** Um gráfico de rosca com a porcentagem média de presença da classe inteira.
* **Alunos Matriculados:** O número total de alunos inscritos naquele trimestre.

![Imagem dos cards de progresso no topo da tela do Panorama.](${
            (imgs[key][base + "panorama-licao-cards-img.png"] as any).default
        })

#### 2. A Frequência Individual (O Coração da Ferramenta)

Logo abaixo dos cards, você encontrará a lista de todos os alunos matriculados, ordenada dos mais presentes para os menos. Esta é a sua ferramenta para uma análise detalhada!

* **Resumo Visual:** Cada aluno tem um pequeno gráfico de rosca ao lado do nome, com uma cor que indica rapidamente o seu nível de frequência (verde para alta, amarelo para média, vermelho para baixa).
* **Abrindo os Detalhes:** Clique em qualquer aluno para expandir e ver os números exatos: quantas vezes ele esteve **presente**, **atrasado**, teve **falta** ou **falta justificada**.

![Imagem da lista de alunos no Panorama, com um dos acordeões abertos mostrando os detalhes.](${
            (imgs[key][base + "panorama-licao-detalhes-img.png"] as any).default
        })

Com o Panorama da Lição, você tem controle total e uma visão clara do engajamento e do progresso da sua classe a cada trimestre!
`,
        videoMobile:
            "https://youtube.com/embed/Kd8pKKNK-zc?si=4DDfusXrCG-PMCjN",
    },
    {
        id: "onde-encontrar-comprovantes-pix",
        titulo: "Onde eu encontro os comprovantes de PIX que foram enviados?",
        conteudo: `
# Onde encontrar e baixar os comprovantes de PIX?

Para facilitar o trabalho de conciliação financeira, o Dominicando centraliza todos os comprovantes de PIX enviados em uma única página, criada especialmente para os administradores.

---

### Acessando a "Central de Comprovantes"

Esta página é uma ferramenta de gestão.

1.  No menu principal, clique em **Gestão**.
2.  No dropdown que aparecer, selecione a opção **"Comp. PIX"**.

![Imagem do menu de Gestão, destacando a opção "Comp. PIX"](${
            (imgs[key][base + "gestao-opc-comp-pix-img.png"] as any).default
        })

---

### Como a Página Funciona?

A página foi projetada para ser um painel de busca poderoso e intuitivo.

#### 1. Os Filtros

No topo da tela, você encontrará um painel de filtros em cascata. Você precisa selecionar:
* A **Igreja**
* A **Classe**
* A **Lição** (o trimestre)
* E, finalmente, a **Aula** específica que você deseja consultar.

Depois de preencher todos os filtros, clique no botão **"Buscar Comprovantes"**.

![Imagem do painel de filtros da página de comprovantes](${
            (imgs[key][base + "gestao-comp-pix-img.png"] as any).default
        })

#### 2. Os Resultados

Se houver comprovantes para a aula selecionada, eles aparecerão abaixo dos filtros, organizados em seções de **Ofertas** e **Missões**.

* **Cabeçalho Inteligente:** Cada seção mostra o valor total de PIX daquele registro e um botão super útil: **"Baixar Todos (.zip)"**. Com um único clique, você pode baixar todas as imagens daquela seção de uma vez, já compactadas em um arquivo .zip!
* **Grade de Imagens:** Dentro de cada seção, você verá as miniaturas de todos os comprovantes.
    * **Clique na imagem** para vê-la em tamanho real, ali você conseguirá baixar aquele arquivo individualmente.

![Imagem da área de resultados, mostrando o acordeão de Ofertas com as miniaturas dos comprovantes](${
            (imgs[key][base + "gestao-comp-pix-baixar-img.png"] as any).default
        })

**💡 Dica de Ouro:** Lembre-se que, para manter o sistema rápido e economizar espaço, todos os comprovantes são **deletados automaticamente 90 dias** após a data da aula. Por isso, é uma boa prática fazer a conciliação e o download dos arquivos regularmente!
`,
        videoMobile:
            "https://youtube.com/embed/WX1cb8wc7Vc?si=8Bzkll4gywfqE5LU",
    },
    {
        id: "como-cadastrar-uma-classe",
        titulo: "Como eu cadastro uma nova Classe?",
        conteudo: `
# Como eu cadastro uma nova Classe?

Organizar sua Escola Dominical em classes é o primeiro passo para manter tudo em ordem. No Dominicando, o processo é super simples!

> **⚠️ Atenção:** A criação de classes é uma função disponível apenas para **Administradores do Ministério (Super Admin)** e **Administradores da Congregação (Pastor/Secretário da Congregação)**. Se você é um Secretário de Classe, esta opção não estará disponível, pois você já está vinculado à sua classe.

Uma **Classe** é um grupo de alunos. Pode ser "Classe de Crianças", "Classe de Jovens", "Classe de Adultos", etc. É você quem decide como organizar!

---

### Passo a Passo para Criar uma Classe

1.  **Acesse a página de Gestão:** No menu principal, clique em **Gestão > Classes**.
2.  **Clique para Cadastrar:** No topo da página, você encontrará o botão verde **"+ Cadastrar Nova Classe"**. Clique nele!

![Imagem da página de Gestão de Classes, destacando o botão de cadastrar](${
            (imgs[key][base + "gestao-classes-img.png"] as any).default
        })

3.  **Preencha os Dados:** Um pequeno modal aparecerá, pedindo as informações da nova classe.
    * **Nome da Classe:** Digite um nome claro e objetivo.
    * **Igreja:** Selecione a igreja à qual esta classe pertence. (Para usuários que não são Super Admins, este campo já virá preenchido).
    * **Idade Mínima e Máxima (Opcional):** Estes campos são uma ferramenta para te ajudar a organizar! Se você os preencher, o sistema irá te avisar quando você tentar matricular um aluno fora da faixa etária recomendada. É um guia, não uma regra rígida!

![Imagem do modal de cadastro de classe](${
            (imgs[key][base + "gestao-classe-modal-img.png"] as any).default
        })

4.  **Clique em "Criar Classe"** e pronto! Sua nova classe já aparecerá na lista, pronta para receber os trimestres e os alunos.

**💡 Dica de Ouro:** Quer saber mais sobre como a faixa etária funciona? Dê uma olhada no nosso guia sobre **[Como eu defino uma faixa etária para a minha Classe?](/ajuda/como-definir-faixa-etaria)**.
`,
        videoMobile:
            "https://www.youtube.com/embed/rnCPhgszTfs?si=EC221ULqBX2aMDx1",
    },
    {
        id: "como-definir-faixa-etaria",
        titulo: "Como eu defino uma faixa etária para a minha Classe?",
        conteudo: `
# Como Definir uma Faixa Etária para a Classe?

Esta funcionalidade é uma ferramenta super útil para te ajudar a organizar suas turmas. Definir uma faixa etária para uma classe não impede a matrícula de ninguém, mas serve como um **guia inteligente** para o secretário.

## Para que serve?

Ao definir uma idade mínima e máxima para uma classe (por exemplo, "Jovens" de 16 a 40 anos), o sistema vai te dar um **aviso amigável** sempre que você tentar matricular um aluno que esteja fora dessa faixa etária.

Isso te ajuda a:
* Manter as classes organizadas por idade.
* Identificar rapidamente alunos que talvez devessem estar em outra turma.
* Tomar decisões mais informadas, mas ainda te dá a **flexibilidade** de matricular o aluno se for necessário.

## Como eu configuro?

O processo é muito simples e pode ser feito tanto ao criar uma nova classe quanto ao editar uma já existente.

1.  Vá para a página de **Gestão > Classes**.
2.  Clique em **"+ Cadastrar Nova Classe"** ou no ícone de edição de uma classe existente.
3.  No modal que abrir, você verá os campos **"Idade Mínima"** e **"Idade Máxima"**.

![Imagem do modal de cadastro de classe com campos de idade](${
            (imgs[key][base + "gestao-modal-aluno-img.png"] as any).default
        })
*Os campos são opcionais. Você pode preencher só um deles ou nenhum!*

4.  **Preencha os campos:** Se você preencher um dos campos, o outro se torna obrigatório para garantir que a faixa etária faça sentido.
5.  Clique em "Salvar" e pronto!

---

## E o que acontece depois?

Agora vem a parte legal! Com a faixa etária configurada, o sistema vai te ajudar de duas formas ao [iniciar um novo trimestre](/ajuda/como-matricular-um-aluno):

### 1. Contexto Visual

A faixa etária definida aparecerá no cabeçalho do modal de "Iniciar Novo Trimestre". Isso te dá um lembrete visual imediato sobre o perfil daquela classe.

![Imagem do cabeçalho do Novo Trimestre com a faixa etária](${
            (imgs[key][base + "licao-modal-faixa-etaria-img.png"] as any)
                .default
        })
*A informação da idade fica sempre visível para te guiar.*

### 2. Destaque e Aviso Inteligente

Ao adicionar alunos à lista de matriculados, se algum deles estiver fora da idade recomendada, o sistema irá:
* **Destacar o nome do aluno** com uma cor de aviso, para fácil identificação.
* **Mostrar um alerta** te informando quais alunos estão acima ou abaixo da idade, dando a você a opção de "Não mostrar novamente" ou "Continuar" com a matrícula mesmo assim.

É uma ajuda, não uma barreira, para garantir que sua Escola Dominical fique sempre bem organizada!
`,
        videoMobile:
            "https://youtube.com/embed/QJ_oFUglTLM?si=hsiZ3Doi42_cQtnZ",
    },
    {
        id: "como-cadastrar-um-aluno",
        titulo: "Como cadastrar um novo Aluno?",
        conteudo: `
# Como eu cadastro um novo Aluno?

Cadastrar os alunos é o primeiro passo para ter uma chamada organizada e relatórios precisos. No Dominicando, o processo é super simples e pode ser feito de duas maneiras, dependendo da sua necessidade.

Lembre-se: um **Aluno** é o registro de uma pessoa na Escola Dominical. Cada pessoa só precisa ser cadastrada como aluno uma única vez!

---

### 1. Pela Página de Gestão (O Jeito Padrão)

Este é o caminho ideal quando você está organizando os dados com calma.

1.  No menu principal, vá em **Gestão > Alunos**.
2.  Clique no botão azul **"+ Cadastrar Novo Aluno"** no topo da página.
3.  O modal de cadastro irá abrir, pedindo as informações do aluno.

![Imagem do modal de cadastro de aluno](${
            (imgs[key][base + "gestao-alunos-img.png"] as any).default
        })
*Preencha os dados e clique em "Salvar Aluno" para finalizar.*

#### ✨ Vinculando um Aluno a um Membro

Uma das funcionalidades mais poderosas do Dominicando é a capacidade de conectar o cadastro do Aluno ao registro oficial de um **Membro** da igreja.

* No formulário, ative a opção **"Este aluno é um membro?"**.
* Um novo campo aparecerá, permitindo que você pesquise e selecione o membro correspondente na lista da sua igreja.
* Ao selecionar, os dados do membro (nome, data de nascimento) serão preenchidos automaticamente!

Para saber mais, confira nosso artigo sobre [Qual a diferença entre Aluno, Membro e Visitante?](/ajuda/diferenca-aluno-membro-visitante).

---

### 2. Durante a Chamada (O Jeito Rápido)

Imagina que um aluno novo chegou no meio do trimestre e você precisa adicioná-lo à chamada daquele dia. É super fácil!

1.  Acesse a tela da chamada. Na primeira etapa ("Lista de Alunos"), você verá um botão **"+"** ao lado da barra de pesquisa.)
![Imagem do modal de cadastro de aluno](${
            (imgs[key][base + "chamada-cadastrar-aluno-img.png"] as any).default
        })
2.  Ao clicar, um modal abrirá com a lista de todos os alunos da igreja que ainda não estão matriculados.
3.  Se o aluno que você procura **não está nessa lista**, significa que ele ainda não foi cadastrado no sistema.
4.  No topo desse mesmo modal, clique no botão **"+ Cadastrar Novo Aluno"**. Isso abrirá o mesmo formulário de cadastro que vimos antes, permitindo que você adicione o aluno sem precisar sair da tela de chamada!
![Imagem do modal de cadastro de aluno](${
            (imgs[key][base + "matricular-aluno-modal-img.png"] as any).default
        })

É isso! Com esses dois caminhos, você tem total flexibilidade para manter sua lista de alunos sempre atualizada.
`,
        videoMobile:
            "https://www.youtube.com/embed/v_Eu6Y6rOh8?si=t3sOmFRUfJsh6XzG",
    },
    {
        id: "como-vincular-aluno-a-membro",
        titulo: "Como vincular um Aluno a um Membro da igreja?",
        conteudo: `
# Como eu vinculo um Aluno a um Membro da igreja?

Vincular o cadastro de um **Aluno** da Escola Dominical ao seu registro oficial de **Membro** da igreja é uma das funcionalidades mais poderosas do Dominicando. Isso centraliza as informações e torna a gestão muito mais inteligente!

---

## Por que vincular é tão importante?

Quando você vincula um aluno a um membro, você está dizendo ao sistema que eles são a mesma pessoa. Isso traz vários benefícios:

* **Evita Duplicidade:** Você mantém um cadastro único e limpo, sem informações repetidas.
* **Dados Automáticos:** Ao vincular, o nome e a data de nascimento do membro são preenchidos automaticamente no cadastro do aluno, economizando tempo e evitando erros de digitação.
* **Relatórios Completos:** Futuramente, você poderá gerar relatórios que cruzam informações, como "quantos membros da igreja estão ativamente matriculados na EBD?".

---

## Como Fazer o Vínculo?

O processo é super simples e pode ser feito tanto ao [cadastrar um novo aluno](/ajuda/como-cadastrar-um-aluno) quanto ao editar um já existente.

1.  **Acesse o Cadastro do Aluno:** Vá para **Gestão > Alunos** e clique para cadastrar um novo aluno ou editar um existente.
2.  **Ative a Opção de Membro:** No formulário, você encontrará um *toggle switch* (um interruptor) com a pergunta: **"Este aluno é um membro?"**. Ative essa opção.

![Ativando a opção 'Este aluno é um membro?' no cadastro do aluno](${
            (imgs[key][base + "gestao-aluno-img.png"] as any).default
        })

3.  **Selecione o Membro:** Um novo campo de busca aparecerá. Comece a digitar o nome do membro que você deseja vincular. O sistema irá te mostrar uma lista com os membros correspondentes que **ainda não estão vinculados a nenhum outro aluno**.
4.  **Clique para Vincular:** Selecione o membro correto na lista.

E é isso! Imediatamente, os campos de "Nome Completo", "Data de Nascimento" e "Contato" serão preenchidos com os dados do membro e ficarão bloqueados para edição, garantindo a integridade dos dados.

**💡 Dica de Ouro:** Não está seguro sobre a diferença entre os cadastros? Nosso guia [Qual a diferença entre Aluno, Membro e Visitante?](/ajuda/diferenca-aluno-membro-visitante) explica tudo em detalhes!
`,
        videoMobile:
            "https://www.youtube.com/embed/LJqh8bN3BTQ?si=V9ZKPgtQ4raGkO0K",
    },
    {
        id: "como-gerar-codigo-convite",
        titulo: "Como eu gero um código de convite para um novo usuário?",
        conteudo: `
# Como eu gero um código de convite para um novo usuário?

O sistema de convites do Dominicando é a forma mais **segura** de trazer novos usuários para a plataforma, como secretários de classe ou pastores de congregação.

> **⚠️ Atenção:** Atualmente, a geração de convites é uma funcionalidade disponível apenas para os cargos de **Pastor** e **Pastor Presidente**.

## Por que usar um convite?

Em vez de criar um usuário e senha para alguém, você gera um **código único e temporário**. A pessoa usa esse código para criar sua própria conta, com seu próprio e-mail e senha. Isso garante:
* **Segurança:** A senha é pessoal e intransferível.
* **Controle:** O código expira e só pode ser usado uma vez.
* **Simplicidade:** O novo usuário faz todo o processo de cadastro.

---

### Passo a Passo para Gerar um Convite

1.  **Acesse a Gestão de Usuários:** No menu principal, vá em **Gestão > Usuários**.
2.  **Clique em "Enviar Convite":** No topo da página, ao lado do botão de cadastrar, você encontrará o botão "Enviar Convite".

![Botão 'Enviar Convite' na página de Gestão de Usuários](${
            (imgs[key][base + "gestao-usuarios-convite-img.png"] as any).default
        })

3.  **Preencha as Informações do Convite:** Um modal se abrirá, pedindo os detalhes do cargo que este novo usuário terá.
    * **Cargo:** Selecione a função que o novo usuário irá desempenhar (ex: "Secretário de Classe").
    * **Igreja:** Defina a qual igreja ele pertencerá.
    * **Classe:** Se o cargo for "Secretário de Classe", você precisará selecionar a classe específica.

![Modal de geração de convite com os campos de Cargo, Igreja e Classe](${
            (imgs[key][base + "gestao-convite-modal-img.png"] as any).default
        })

4.  **Clique em "Gerar convite"**.

---

### O que fazer com o código gerado?

Após gerar, uma tela de sucesso aparecerá com duas opções:

1.  **O Código:** Uma sequência de letras e números. Você pode copiar apenas o código e enviar para a pessoa. Ela precisará digitá-lo na tela de cadastro.
2.  **O Link de Cadastro:** A opção mais fácil! Clique para copiar o link completo e envie para a pessoa. Ao clicar, ela será levada diretamente para a tela de cadastro com o código já preenchido.

![Tela de resultado mostrando o código de convite e o link completo](${
            (imgs[key][base + "gestao-convite-resultado-img.png"] as any)
                .default
        })

Basta copiar uma das duas opções e enviar para o novo usuário por WhatsApp, e-mail ou como preferir. Lembre-se de avisá-lo sobre a data de expiração do convite!
`,
    },
    {
        id: "como-gerar-um-grafico",
        titulo: "Como gerar gráficos no sistema? (Explicando a página de Relatórios Gráficos)",
        conteudo: `
# Como eu gero um gráfico no sistema?

Uma das ferramentas mais poderosas do Dominicando é a sua central de relatórios. Com ela, você pode cruzar informações e gerar gráficos personalizados para entender a fundo o progresso da sua Escola Dominical.

Esta página funciona como um painel de Business Intelligence (BI), permitindo que você faça as perguntas e o sistema te traga as respostas visualmente!

---

### Acessando os Relatórios Gráficos

1.  No menu principal, clique em **Relatórios**.
2.  Na tela de seleção que aparecer, escolha a opção **"Relatórios Gráficos"**.

![Tela de seleção de Relatórios, destacando 'Relatórios Gráficos'](${
            (imgs[key][base + "relatorios-selecao-graficos-img.png"] as any)
                .default
        })

---

### Montando o seu Relatório (Passo a Passo)

A tela de relatórios é um grande formulário de filtros. Você precisa dizer ao sistema **o que** você quer ver e **como** você quer ver.

#### 1. Escolha a Métrica

O primeiro campo é o mais importante: **"Métrica"**. É aqui que você define qual dado principal você quer analisar. As opções incluem:
* Total de Ofertas
* Total de Presentes
* Frequência de Alunos (%)
* E muito mais!

#### 2. Defina o Agrupamento

O campo **"Agrupamento"** define como os dados serão organizados no eixo X do gráfico. Por exemplo, se você escolher a métrica "Total de Presentes" e o agrupamento "Por Mês", o gráfico te mostrará o total de presentes em Janeiro, Fevereiro, Março, etc.

**💡 Dica:** As opções de agrupamento mudam de forma inteligente! Dependendo da métrica que você escolher, algumas opções que não fazem sentido serão escondidas para te ajudar.

#### 3. Selecione o Período

Use os campos de **"Início"** e **"Fim"** para definir o intervalo de tempo que você quer analisar.

#### 4. Defina o Escopo (Igrejas e Classes)

Se você for um administrador, poderá filtrar os dados para ver os resultados de:
* Uma ou mais **Igrejas** específicas.
* Uma ou mais **Classes** específicas.

#### 5. Escolha o Tipo de Gráfico

Por fim, você pode escolher como os dados serão exibidos visualmente: em **Barras**, **Linhas** ou **Pizza**.

![Painel de filtros da página de Relatórios Gráficos preenchido](${
            (imgs[key][base + "relatorios-graficos-filtros-img.png"] as any)
                .default
        })

---

### Gerando e Analisando o Gráfico

Depois de preencher todos os filtros, clique no botão azul **"Gerar Relatório"**.

O sistema irá processar sua solicitação e exibir o gráfico logo abaixo. Você pode passar o mouse sobre as barras, linhas ou fatias para ver os valores detalhados de cada ponto.

![Exemplo de um gráfico de barras gerado, mostrando o total de presentes por classe](${
            (imgs[key][base + "relatorios-graficos-resultado-img.png"] as any)
                .default
        })

Com essa ferramenta, você pode criar visualizações poderosas para suas reuniões e tomar decisões baseadas em dados concretos para abençoar ainda mais sua Escola Dominical!
`,
        videoMobile:
            "https://youtube.com/embed/7aU8N8qOEsU?si=G5WhWy1hFu3ErRX3",
    },
    {
        id: "como-exportar-dados-csv",
        titulo: "Como exportar dados para o Excel? (Explicando a Central de Relatórios CSV)",
        conteudo: `
# Como eu exporto dados para o Excel? (Relatórios CSV)

Precisa de uma lista completa de todos os seus alunos para imprimir? Ou talvez queira fazer uma análise mais aprofundada dos dados financeiros em uma planilha? A Central de Relatórios CSV foi criada exatamente para isso!

Ela permite que você extraia os dados brutos do Dominicando em um arquivo **.csv**, que é um formato universal compatível com o **Excel**, Google Planilhas ou qualquer outra ferramenta de planilha.

---

### Acessando a Central de Relatórios CSV

1.  No menu principal, clique em **Relatórios**.
2.  Na tela de seleção que aparecer, escolha a opção **"Relatórios CSV"**.

![Tela de seleção de Relatórios, destacando 'Relatórios CSV'](${
            (imgs[key][base + "relatorios-selecao-csv-img.png"] as any).default
        })

---

### Gerando seu Relatório (Passo a Passo)

A página funciona com um sistema de filtros que se adapta ao que você precisa.

#### 1. Escolha o Tipo de Relatório

O primeiro e mais importante passo é decidir qual conjunto de dados você quer exportar. No campo **"Qual relatório você deseja exportar?"**, você pode escolher entre várias opções, como:
* Lista de Alunos
* Histórico de Matrículas
* Relatórios de Aulas (com todos os detalhes financeiros e de presença)
* E muito mais!

#### 2. Aplique os Filtros (Eles são inteligentes!)

Assim que você escolhe um tipo de relatório, o formulário se adapta e te mostra os filtros relevantes.

* **Relatórios baseados em data** (como "Relatórios de Aulas") pedirão um período de **Início** e **Fim**.
* **Relatórios de listas** (como "Lista de Alunos") não precisam de data.
* Dependendo do seu cargo, você também poderá filtrar por **Igreja** ou **Classe**.

![Painel de filtros da página de Relatórios CSV, com os campos aparecendo dinamicamente.](${
            (imgs[key][base + "relatorios-csv-filtros-img.png"] as any).default
        })

#### 3. Verifique com a "Prévia" (Opcional, mas recomendado!)

Antes de baixar o arquivo, você pode clicar no botão **"Ver Prévia"**. O sistema irá te mostrar uma amostra dos dados em uma tabela na própria página. Isso é ótimo para garantir que você selecionou os filtros corretos antes de gerar o arquivo final.

#### 4. Gere o Arquivo CSV!

Quando estiver tudo certo, clique no botão verde **"Gerar Relatório"**. O sistema irá processar os dados e o download do seu arquivo .csv começará automaticamente.

Depois, é só abrir o arquivo no Excel ou na sua ferramenta de planilhas preferida!
`,
        videoMobile:
            "https://youtube.com/embed/cDYM51QGnVs?si=NkCqKYf_9oxeukSz",
    },
    {
        id: "como-ativar-desativar-notificacoes",
        titulo: "Como ativar as notificações?",
        conteudo: `
# Como eu ativo ou desativo as notificações?

As notificações são uma ótima maneira de se manter atualizado sobre o que acontece no Dominicando, recebendo avisos e lembretes importantes diretamente no seu dispositivo.

Ativar ou desativar essa funcionalidade é muito simples e pode ser feito diretamente na sua página de perfil.

---

### Gerenciando suas Notificações

1.  **Acesse sua conta:** No menu principal, clique no seu ícone de perfil no canto superior direito e vá para a página **"Minha Conta"**.
2.  **Encontre a seção "Notificações":** Nesta página, você verá um card específico para o gerenciamento de notificações.
3.  **Use o interruptor:** Haverá um interruptor (toggle) ao lado de "Permitir Notificação?".
    * Se o interruptor estiver **desligado**, o sistema não enviará notificações para você.
    * Se o interruptor estiver **ligado**, você estará apto a receber as notificações.

![Imagem da seção de Notificações na página Minha Conta](${
            (imgs[key][base + "minha-conta-notificacoes-img.png"] as any)
                .default
        })

---

### ⚠️ Atenção: O que fazer se a permissão já foi definida?

É muito importante entender que o Dominicando depende da **permissão do seu navegador** (Chrome, Safari, etc.) para enviar notificações.

Quando você clica no interruptor pela primeira vez, seu navegador irá te perguntar se você "Permite" ou "Bloqueia" as notificações do site.

* **Se você já escolheu "Permitir" ou "Bloquear" no passado**, o interruptor no site não poderá mais solicitar essa permissão novamente.

**O que fazer nesse caso?**

Se você bloqueou as notificações e agora quer recebê-las (ou vice-versa), você precisará alterar a permissão **diretamente nas configurações do seu navegador**.

Geralmente, o caminho é:
1.  Vá até as **Configurações** do seu navegador.
2.  Procure por **"Configurações do Site"** ou **"Privacidade e Segurança"**.
3.  Encontre a seção de **"Notificações"**.
4.  Procure pelo site **dominicando.web.app** na lista e altere a permissão para "Permitir".

![Imagem genérica das configurações de notificação de um site no navegador](${
            (imgs[key][base + "config-navegador-notificacao-img.png"] as any)
                .default
        })

Depois de ajustar no navegador, o interruptor no site passará a refletir sua escolha corretamente!
`,
        videoMobile:
            "https://youtube.com/embed/wVri7C1Csew?si=XquvRkzgrrbZJw86",
    },
    {
        id: "como-gerenciar-usuarios",
        titulo: "Como cadastrar Usuários?",
        conteudo: `
# Como gerenciar Usuários? (Cadastro Direto vs. Convite)

Adicionar novos professores e secretários ao Dominicando é uma tarefa fundamental para os administradores. O sistema oferece duas maneiras principais de fazer isso, cada uma com um propósito específico: o **Cadastro Direto** e o **Envio de Convite**.

> **⚠️ Atenção:** A gestão de usuários é uma função de alta responsabilidade. Uma vez que uma pessoa tem acesso ao sistema, ela terá dados como nomes de alunos e informações financeiras. Por isso, essa função é limitada ao escopo de cada cargo de administrador. Por exemplo, um Secretário de Classe só pode cadastrar outros Secretários de Classe.

---

### Método 1: O Cadastro Direto

Este método é como o nome diz: você cria a conta do usuário diretamente no sistema.

* **O que é?** Você preenche todas as informações do novo usuário, incluindo **nome, e-mail e uma senha inicial**.
* **Quando usar?** É ideal para uma configuração inicial, quando um administrador está cadastrando várias contas de uma vez e pode entregar as senhas pessoalmente.
* **Como fazer?**
    1.  Vá em **Gestão > Usuários**.
    2.  Clique no botão **"+ Cadastrar Novo Usuário"**.
    3.  Preencha todos os campos do formulário e clique em "Salvar".

![Imagem do modal de Cadastro de Usuário](${
            (imgs[key][base + "gestao-usuarios-modal-cadastro-img.png"] as any)
                .default
        })

**Importante:** Ao criar a senha, recomendamos usar uma senha genérica e fácil de lembrar (como "mudar123"). É crucial que você instrua o novo usuário a **alterar essa senha imediatamente** após o primeiro login. Para saber como, o usuário pode seguir o guia [Como eu redefino minha senha?](/ajuda/como-redefinir-senha).

---

### Método 2: [O Convite Seguro](/ajuda/como-gerar-codigo-convite) (O jeito recomendado!)

> **Disponibilidade:** Esta funcionalidade é exclusiva para usuários com cargo de **Pastor** ou **Pastor Presidente**, pois permite a criação de qualquer tipo de usuário dentro do seu escopo de permissão.

Este é o método mais seguro e prático para adicionar novos usuários no dia a dia.

* **O que é?** Você gera um **código de convite** único, com tempo de expiração. O próprio usuário acessa um link, usa o código e cria sua própria conta com a senha que ele escolher.
* **Quando usar?** É a forma **ideal e mais segura** de trazer novos usuários para a plataforma, pois a responsabilidade da senha fica com o próprio usuário.
* **Como fazer?**
    1.  Vá em **Gestão > Usuários**.
    2.  Clique no botão **"Enviar Convite"**.
    3.  No formulário, defina o **Cargo**, a **Igreja** e (se necessário) a **Classe** que o novo usuário terá.
    4.  Clique em "Gerar Convite". O sistema criará um código e um link.
    5.  Copie o **link completo** e envie para a pessoa. Ela só precisa clicar e finalizar o cadastro!

![Imagem do modal de geração de convite, mostrando o link final](${
            (imgs[key][base + "gestao-convite-modal-img.png"] as any).default
        })

**💡 Dica de Ouro:** O código do convite só pode ser usado uma vez e expira em 48 horas, garantindo a segurança do processo!
`,
        videoMobile:
            "https://youtube.com/embed/qtcsPtuXfF0?si=GB3hJlN-S0QVSP_V",
    },
    {
        id: "entendendo-a-tela-de-inicio",
        titulo: "Entendendo a Tela de Início (Dashboard)",
        conteudo: `

A tela de "Início", ou Relatório Geral Trimestral, é o seu centro de comando. É a primeira página que você vê após o login e foi projetada para te dar uma visão geral e rápida da saúde da sua Escola Dominical no trimestre atual.

---

### Os Filtros: Personalizando sua Visão

No topo da página, você encontrará os filtros. Eles são a ferramenta mais poderosa para analisar os dados.

![Imagem da área de filtros do Dashboard](${
            (imgs[key][base + "dashboard-filtros-img.png"] as any).default
        })

* **Filtro de Igreja/Classe:** Este dropdown é inteligente!
    * Se você for um **Super Admin**, poderá filtrar os dados por uma **Igreja** específica.
    * Se você for um **Admin de Congregação** (Pastor, Secretário), poderá filtrar por uma **Classe** específica da sua igreja.
    * Se você for um **Secretário de Classe**, este filtro não aparecerá, pois o dashboard já mostrará apenas os dados da sua turma.

* **Filtro de Período (Início e Fim):** Por padrão, o sistema mostra os dados do trimestre da lição que está ativa. Mas você tem total liberdade! Quer ver como foram as ofertas no mês passado? Ou comparar o primeiro semestre com o segundo? Basta alterar as datas e clicar em **"Pesquisar"**.

---

### Os Cards de Informação: Seus KPIs de Relance

Abaixo dos filtros, você encontrará os cards. Cada um deles é um resumo de um indicador-chave (KPI) para o período selecionado.

![Imagem dos cards de informação do Dashboard](${
            (imgs[key][base + "dashboard-cards-img.png"] as any).default
        })

Cada card mostra:
* **O Valor Total:** O número principal, em destaque.
* **Um Mini-Gráfico:** Uma visualização rápida da tendência daquela métrica ao longo do período. Passe o mouse sobre o gráfico para ver os detalhes de cada ponto!

Os principais cards que você encontrará são:
* **Total de Ofertas e Missões:** A soma dos valores arrecadados.
* **Total de Presentes:** A soma de todos os alunos presentes e atrasados.
* **Total de Matriculados:** Quantos alunos estavam matriculados nas lições ativas do período.
* **Membros Matriculados:** Um gráfico de pizza mostrando a porcentagem de membros da igreja que também estão matriculados na EBD.
* **Total de Revistas e Bíblias:** A contagem de quantos alunos trouxeram seus materiais.

**💡 Dica de Ouro:** Precisa de uma análise mais profunda? O Dashboard é ótimo para uma visão geral, mas a página de **[Relatórios Gráficos](/ajuda/como-gerar-um-grafico)** é a sua ferramenta para cruzar dados e criar visualizações personalizadas!
`,
    },
    {
        id: "como-editar-ou-excluir-um-registro",
        titulo: "Como editar ou excluir um registro? (Aluno, Classe, etc.)",
        conteudo: `


Manter os dados do seu ministério atualizados é fundamental. O Dominicando foi projetado para tornar as tarefas de edição e exclusão de registros (como Alunos, Classes ou Membros) um processo simples, seguro e padronizado em todo o sistema.

---

### O Padrão de Gestão: A Coluna de "Ações"

A maioria das páginas que você encontra no menu **Gestão** (como Alunos, Classes, Igrejas, etc.) segue um mesmo padrão: uma tabela onde você pode visualizar todos os registros.

A chave para a edição e exclusão está sempre na **última coluna** dessa tabela, chamada **"Ações"**.

![Imagem da tabela de gestão, destacando a última coluna 'Ações' com os ícones de editar e excluir.](${
            (imgs[key][base + "gestao-acoes-img.png"] as any).default
        })

Nesta coluna, você encontrará dois ícones principais para cada item da lista:

* ✏️ **O Ícone de Lápis (Editar):** Usado para modificar as informações de um registro.
* 🗑️ **O Ícone de Lixeira (Excluir):** Usado para remover um registro permanentemente.

---

### Editando um Registro

1.  **Encontre o item:** Na tabela, localize o registro que você deseja alterar.
2.  **Clique no ícone de lápis (✏️):** O sistema abrirá o mesmo modal que você usa para "Cadastrar", mas desta vez, ele virá **preenchido com os dados atuais** daquele item.
3.  **Faça as alterações:** Modifique os campos que precisar.
4.  **Salve:** Clique no botão "Salvar Alterações" (ou similar) no final do modal.

Pronto! As informações serão atualizadas no sistema.

### Excluindo um Registro (Com Segurança!)

Excluir dados é uma ação permanente, por isso o Dominicando toma um cuidado extra para garantir que nada seja removido por acidente.

1.  **Encontre o item:** Na tabela, localize o registro que você deseja remover.
2.  **Clique no ícone de lixeira (🗑️):** O sistema **não** irá deletar o item imediatamente. Em vez disso, ele abrirá um **alerta de confirmação**.

![Imagem de um modal de alerta confirmando a exclusão de um item.](${
            (imgs[key][base + "gestao-excluir-confirmacao-img.png"] as any)
                .default
        })

3.  **Confirme a Ação:** Leia o aviso com atenção e, se você tiver certeza absoluta, clique no botão de confirmação (ex: "Sim, deletar").

**Importante:** A exclusão de certos itens, como uma **Lição**, pode apagar em cascata todos os dados associados a ela (aulas, matrículas, registros de chamada). O sistema sempre te avisará sobre isso no modal de confirmação. **Leia com atenção antes de confirmar!**
`,
        videoMobile:
            "https://youtube.com/embed/jXk7JIOWN7Q?si=7dKdyrbVMxQxSoTd",
    },
];
