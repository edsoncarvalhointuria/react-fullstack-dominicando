# 📄 Documentação do Projeto: Dominicando

Este documento serve como a "fonte da verdade" para a arquitetura de dados e o sistema de design da aplicação **Dominicando**.

---

## 1. Estrutura do Banco de Dados (Firestore)

Esta é a "planta baixa" do nosso banco de dados.
A arquitetura foi projetada para ser **multi-inquilino**, permitindo que múltiplas igrejas e ministérios usem o sistema no futuro.

---

## Coleções Principais

-   **ministerios**

    -   `id`: string
    -   `nome`: string (Ex: `"Ministério Exemplo"`)

-   **igrejas**

    -   `id`: string
    -   `nome`: string (Ex: `"Congregação Central"`)
    -   `ministerioId`: string (Referência a **ministerios**)

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

-   **classes**

    -   `nome`: string (Ex: `"Classe de Jovens"`)
    -   `igrejaId`: string (A qual igreja esta classe pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string

-   **alunos** (Cadastro geral de todos os alunos)

    -   `nome_completo`: string
    -   `data_nascimento`: timestamp (Para o relatório de aniversariantes)
    -   `igrejaId`: string (A qual igreja este aluno pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string

-   **licoes** (As revistas/trimestres)

    -   `titulo`: string (Ex: `"A Jornada da Fé - 3º Trimestre 2025"`)
    -   `classeId`: string (Referência a **classes**)
    -   `classeNome`: string
    -   `data_inicio`: timestamp
    -   `data_fim`: timestamp
    -   `numero_aulas`: number (Padrão: 13)
    -   `ativo`: boolean
    -   `igrejaId`: string (A qual igreja esta lição pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string
    -   `total_matriculados` : number

-   **matriculas** (A "ponte" entre alunos e lições)

    -   `alunoId`: string (Referência a **alunos**)
    -   `alunoNome`: string
    -   `licaoId`: string (Referência a **licoes**)
    -   `licaoNome`: string (Referência a **licoes**)
    -   `licaoRef`: Rerence
    -   `classeId`: string
    -   `classeNome`: string
    -   `classeRef`: Reference
    -   `possui_revista`: boolean
    -   `data_matricula`: timestamp
    -   `igrejaId`: string (A qual igreja esta matrícula pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string

-   **registros_aula** (O coração da aplicação, um documento por aula)

    -   `data`: timestamp
    -   `licaoId`: string (Referência a **licoes**)
    -   `classeId`: string (Referência a **classes**)
    -   `classeNome`: string
    -   `descricao`: string (Opcional, para notas)
    -   `igrejaId`: string (A qual igreja este registro pertence)
    -   `igrejaNome`: string
    -   `ministerioId` : string
    -   `visitas`: number
    -   `atrasados`: number
    -   `total_presentes`: number
    -   `presentes_chamada`: number
    -   `biblias`: number
    -   `licoes_trazidas`: number
    -   `oferta_total`: number (Calculado)
    -   `ofertas`: map : {pix: number, dinheiro: number}
    -   `missoes_total`: number (Calculado)
    -   `missoes`: map : {pix: number, dinheiro: number}
    -   **Subcoleção `chamada`**
        -   **Document ID:** `alunoId`
        -   `status`: string (`'Presente'`, `'Falta'`, `'Falta Justificada'`, `'Atrasado'`)
        -   `nome`: string
        -   `trouxe_biblia`: boolean
        -   `trouxe_licao`: boolean

-   **log_alteracoes** (Para auditoria)

    -   `usuarioId`: string
    -   `acao`: string (Ex: `"Editou oferta da aula X"`)
    -   `timestamp`: timestamp
    -   `dados_antigos`: map
    -   `dados_novos`: map
    -   `igrejaId` : string
    -   `ministerioId` : string

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
