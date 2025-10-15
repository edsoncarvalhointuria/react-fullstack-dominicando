# 📄 Documentação do Projeto: Dominicando

Este documento serve como a "fonte da verdade" para a arquitetura de dados e o sistema de design da aplicação **Dominicando**.

---

## 1. Estrutura do Banco de Dados (Firestore)

Esta é a "planta baixa" do nosso banco de dados.
A arquitetura foi projetada para ser **multi-inquilino**, permitindo que múltiplas igrejas e ministérios usem o sistema no futuro.

---

## Coleções Principais

-   **alunos** (Cadastro geral de todos os alunos)

    -   `nome_completo`: string
    -   `data_nascimento`: timestamp (Para o relatório de aniversariantes)
    -   `igrejaId`: string (A qual igreja este aluno pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string
    -   `contato` : string

-   **classes**

    -   `nome`: string (Ex: `"Classe de Jovens"`)
    -   `igrejaId`: string (A qual igreja esta classe pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string
    -   `idade_maxima` : number | null
    -   `idade_minima` : number | null

-   **convites**

    -   `classeId`: string (Referência a **classes**)
    -   `classeNome`: string
    -   `criadoEm`: timestamp
    -   `criadoPorUid`: string
    -   `dataExpiracao`: timestamp
    -   `igrejaId`: string (A qual igreja esta lição pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string
    -   `role` : string
    -   `usado`: boolean
    -   `usadoPor`: string | null

-   **igrejas**

    -   `id`: string
    -   `nome`: string (Ex: `"Congregação Central"`)
    -   `ministerioId`: string (Referência a **ministerios**)

-   **licoes** (As revistas/trimestres)

    -   `ativo`: boolean
    -   `classeId`: string (Referência a **classes**)
    -   `classeNome`: string
    -   `data_fim`: timestamp
    -   `data_inicio`: timestamp
    -   `igrejaId`: string (A qual igreja esta lição pertence)
    -   `igrejaNome`: string
    -   `img`: string | null
    -   `ministerioId` : string
    -   `numero_aulas`: number (Padrão: 13)
    -   `numero_trimestre`: number
    -   `titulo`: string (Ex: `"A Jornada da Fé"`)
    -   `total_matriculados` : number
    -   **Subcoleção `chamada`**
        -   **Document ID:** `numero_aula`
        -   `data_prevista`: Timestamp
        -   `numero_aula`: number
        -   `realizada`: boolean
        -   `registroRef`: Reference | null

-   **matriculas** (A "ponte" entre alunos e lições)

    -   `alunoId`: string (Referência a **alunos**)
    -   `alunoNome`: string
    -   `classeId`: string
    -   `classeNome`: string
    -   `classeRef`: Reference
    -   `data_matricula`: timestamp
    -   `igrejaId`: string (A qual igreja esta matrícula pertence)
    -   `igrejaNome`: string
    -   `licaoId`: string (Referência a **licoes**)
    -   `licaoNome`: string (Referência a **licoes**)
    -   `licaoRef`: Rerence
    -   `ministerioId` : string
    -   `possui_revista`: boolean

-   **membros** (A "ponte" entre alunos e lições)

    -   `alunoId`: string (Referência a **alunos**)
    -   `contato`: string
    -   `data_nascimento`: timestamp
    -   `igrejaId`: string (A qual igreja esta matrícula pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string
    -   `nome_completo` : string
    -   `registro` : string
    -   `validade`: timestamp

-   **ministerios**

    -   `id`: string
    -   `nome`: string (Ex: `"Ministério Exemplo"`)

-   **registros_aula** (O coração da aplicação, um documento por aula)

    -   `atrasados`: number
    -   `biblias`: number
    -   `classeId`: string (Referência a **classes**)
    -   `classeNome`: string
    -   `data`: timestamp
    -   `descricao`: string (Opcional, para notas)
    -   `igrejaId`: string (A qual igreja este registro pertence)
    -   `igrejaNome`: string
    -   `licaoId`: string (Referência a **licoes**)
    -   `licoes_trazidas`: number
    -   `ministerioId` : string
    -   `missoes`: map : {pix: number, dinheiro: number}
    -   `missoes_total`: number (Calculado)
    -   `ofertas`: map : {pix: number, dinheiro: number}
    -   `oferta_total`: number (Calculado)
    -   `presentes_chamada`: number
    -   `total_ausentes`: number
    -   `total_matriculados`: number
    -   `total_presentes`: number
    -   `visitas`: number
    -   `visitas_lista`: [{nome_completo:string, data_nascimento:Timestamp | null, contato:string| null}]
    -   **Subcoleção `chamada`**
        -   **Document ID:** `alunoId`
        -   `status`: string (`'Presente'`, `'Falta'`, `'Falta Justificada'`, `'Atrasado'`)
        -   `nome`: string
        -   `trouxe_biblia`: boolean
        -   `trouxe_licao`: boolean

-   **usuarios** (Sincronizado com o Firebase Authentication)

    -   `classeId`: string | null
    -   `classeNome`: string | null
    -   `uid`: string (ID do Firebase Auth)
    -   `email`: string
    -   `nome`: string
    -   `igrejaId`: string (A qual igreja o usuário pertence)
    -   `igrejaNome`: string
    -   `role`: string (Ex: `'pastor_presidente'`, `'secretario_geral'`, `'secretario_classe'`)
    -   `ministerioId` : string
    -   `tokens` : number

    -   **Subcoleção `tokens`**

        -   **Document ID:** `token_notification`
        -   `data_criacao`: Timestamp
        -   `token`: string

-   **visitantes** (Cadastro geral de todos os alunos)

    -   `contato` : string | null
    -   `data_nascimento`: timestamp | null
    -   `igrejaId`: string (A qual igreja este aluno pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string
    -   `nome_completo`: string
    -   `primeira_visita`: timestamp
    -   `quantidade_visitas`: number
    -   `ultima_visita`: timestamp

---

## 2. Paleta de Cores & Design System

Para garantir uma interface bonita e consistente, vamos usar a seguinte paleta de cores.A inspiração é um design **limpo, moderno e acolhedor**.

-   **Cor Primária (Acentos, Botões Principais):**

    -   `#3B82F6` (Um azul amigável e moderno)

-   **Cor de Fundo (Principal):**

    -   `#F9FAFB` (Um cinza muito claro, quase branco, para uma sensação de limpeza)

-   **Cor de Fundo (Secundária, para Cards):**

    -   `#FFFFFF` (Branco puro, para contraste)

-   **Texto (Principal):**

    -   `#111827` (Um preto suave, não tão "duro" quanto o `#000000`)

-   **Texto (Secundário, para legendas):**

    -   `#6B7280` (Um cinza médio para informações secundárias)

-   **Feedback & Status**

    -   Sucesso: `#10B981` (Verde)
    -   Aviso: `#F59E0B` (Amarelo/Laranja)
    -   Erro: `#EF4444` (Vermelho)
