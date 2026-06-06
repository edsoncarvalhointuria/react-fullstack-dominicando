import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import JSZip from "jszip";
import Hashids from "hashids";

enum Roles {
    PASTOR_PRESIDENTE = "pastor_presidente",
    SUPER_ADMIN = "super_admin",
    PASTOR = "pastor",
    SECRETARIO_CONGREGACAO = "secretario_congregacao",
    PROFESSOR = "professor",
    SECRETARIO_CLASSE = "secretario_classe",
}

enum Cll {
    ALUNOS = "alunos",
    CACHE_ALUNOS = "cache_alunos",
    CACHE_ANIVERSARIANTES = "cache_aniversariantes",
    CACHE_CLASSES = "cache_classes",
    CACHE_LICAO = "cache_licao",
    CACHE_MATRICULAS = "cache_matriculas",
    CACHE_MEMBROS = "cache_membros",
    CACHE_USUARIOS = "cache_usuarios",
    CACHE_PORTAL_ALUNO = "cache_portal_aluno",
    CLASSES = "classes",
    IGREJAS = "igrejas",
    LICOES = "licoes",
    LICOES_PREPARO = "licoes_preparo",
    LICOES_GLOBAIS = "licoes_globais",
    MATRICULAS = "matriculas",
    MEMBROS = "membros",
    MINISTERIOS = "ministerios",
    NOTIFICACOES = "notificacoes",
    PEDIDOS = "pedidos",
    PEDIDOS_RESPOSTA = "pedidos_respostas",
    REGISTROS_AULA = "registros_aula",
    RELATORIOS_TRIMESTRE = "relatorios_trimestre",
    ROTULOS = "rotulos_classes",
    TRIMESTRES = "trimestres",
    USUARIOS = "usuarios",
    VISITANTES = "visitantes",
}

interface ValidarUsuario {
    user: admin.firestore.DocumentData;
    db: admin.firestore.Firestore;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isSecretario: boolean;
}

interface User {
    uid: string;
    email: string;
    nome: string;
    role: string;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    classeId: string;
    classeNome: string;
    tokens?: number;
}

interface Notificacao {
    evento: string;
    actor: {
        uid: string;
        email: string;
        ip?: string;
    };
    dados: {
        dados_enviados: { [key: string]: any };
        dados_importantes: { [key: string]: any };
    };
    message: string;
}

function enviarLog(
    user: User,
    request: any,
    evento: string,
    message: string,
    dadosImportantes?: any,
) {
    const notificacao: Notificacao = {
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: dadosImportantes || [],
        },
        evento,
        message,
    };
    console.log(JSON.stringify(notificacao));
}

function gerarCodigo() {
    const c = Math.random().toString(36).substring(2, 8);
    return c;
}

function getNewCacheAluno(
    nome: string,
    id: string | number,
    obj?: {
        presente?: number;
        atrasado?: number;
        falta?: number;
        falta_justificada?: number;
        trouxe_biblia?: number;
        trouxe_revista?: number;
        nao_trouxe_biblia?: number;
        nao_trouxe_revista?: number;
        porcentagem_biblia?: number;
        porcentagem_revista?: number;
        porcentagem?: number;
        matriculado?: boolean;
    },
) {
    return {
        id,
        nome,
        presente: 0,
        atrasado: 0,
        falta: 0,
        falta_justificada: 0,
        trouxe_biblia: 0,
        trouxe_revista: 0,
        nao_trouxe_biblia: 0,
        nao_trouxe_revista: 0,
        porcentagem_biblia: 0,
        porcentagem_revista: 0,
        porcentagem: 0,
        matriculado: true,
        ...obj,
    };
}

async function validarUsuario(request: functions.https.CallableRequest) {
    if (!request.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "usuário não está logado",
        );
    }

    const { uid } = request.auth;
    const db = admin.firestore();
    const userDoc = await db.collection("usuarios").doc(uid).get();

    if (!userDoc.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "usuário não encontrado",
        );
    }

    const user = userDoc.data()! as User;

    const isSuperAdmin =
        user.role === Roles.PASTOR_PRESIDENTE ||
        user.role === Roles.SUPER_ADMIN;
    const isAdmin =
        user.role === Roles.PASTOR ||
        user.role === Roles.SECRETARIO_CONGREGACAO;
    const isSecretario =
        user.role === Roles.SECRETARIO_CLASSE || user.role === Roles.PROFESSOR;

    return { user, db, isSuperAdmin, isAdmin, isSecretario };
}

function baseDashboard(
    usuario: ValidarUsuario,
    request: functions.https.CallableRequest,
    collection: string,
    withData?: boolean,
    notData?: boolean,
) {
    const { db, isSecretario, isSuperAdmin, user } = usuario;

    let { dataInicio, dataFim } = request.data;
    if (!dataInicio || !dataFim) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "As datas são obrigatórias",
        );
    }

    dataInicio = new Date(dataInicio);
    dataInicio.setHours(0, 0, 0, 0);

    dataFim = new Date(dataFim);
    dataFim.setHours(23, 59, 59, 59);

    const baseQuery = notData
        ? db.collection(collection)
        : db
              .collection(collection)
              .where(withData ? "data_inicio" : "data", ">=", dataInicio)
              .where(withData ? "data_fim" : "data", "<=", dataFim);

    let q;
    if (isSecretario) q = baseQuery.where("classeId", "==", user.classeId);
    else if (isSuperAdmin)
        q = baseQuery.where("ministerioId", "==", user.ministerioId);
    else q = baseQuery.where("igrejaId", "==", user.igrejaId);

    return q;
}

function calcCacheLicao(
    documentos: admin.firestore.DocumentData[],
    isSuperAdmin: boolean,
    isSecretario: boolean,
    key: string,
) {
    const listaItens: any[] = [];
    documentos.forEach((v) => {
        const cache = v.data() as CacheLicaoInterface;
        if (!cache.igrejaNome) console.log("sem nome igreja", v.id);
        if (!cache.classeNome) console.log("sem nome classe", v.id);

        if (key === "total_matriculados") {
            listaItens.push({
                licao: cache.licaoNome,
                igreja: cache.igrejaNome,
                classe: cache.classeNome,
                data: cache.data_inicio.toDate().toLocaleDateString("pt-BR"),
                [key]: cache[key] || 0,
            });
        } else
            Object.entries(cache.detalhes_aulas).forEach(([data, obj]) => {
                listaItens.push({
                    [key]: (obj as any)[key],
                    data: data,
                    igreja: cache.igrejaNome,
                    classe: cache.classeNome,
                });
            });
    });

    if (isSecretario)
        return listaItens.map((v: any) => ({
            name: key === "total_matriculados" ? v.licao : v.data,
            value: v[key],
        }));
    else {
        const tipoKey = isSuperAdmin ? "igreja" : "classe";
        const valoresMap = new Map();

        listaItens.forEach((v) => {
            const nome = v[tipoKey];
            const data = v.data;
            const item = valoresMap.get(data) || { name: data };
            item[nome] = (item[nome] || 0) + v[key];

            valoresMap.set(data, item);
        });

        return Array.from(valoresMap.values()).sort((a, b) => {
            const [d1, m1, a1] = a.name.split("/");
            const [d2, m2, a2] = b.name.split("/");

            return (
                new Date(a1, m1, d1).getTime() - new Date(a2, m2, d2).getTime()
            );
        });
    }
}

function calcCacheMembros(
    documentos: admin.firestore.DocumentData[],
    isSecretario: boolean,
) {
    if (isSecretario) return [];

    const membros = new Map();
    documentos.forEach((v) => {
        const cache = v.data();
        const listaMembros = Array.from(Object.values(cache.lista || {}));
        const total_membros = listaMembros.length;
        const total_matriculados = listaMembros.filter(
            (v: any) => v.alunoId,
        ).length;

        membros.set(cache.igrejaId, { total_membros, total_matriculados });
    });

    return Object.fromEntries(membros);
}

function getIdade(data_nascimento: Timestamp) {
    const hoje = new Date();
    const nascimento = data_nascimento.toDate();

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() <= nascimento.getDate()))
        idade--;

    return idade;
}

async function calcTrimestre(
    trimestreId: string,
    igrejaId: string,
    naoTemPermissao: boolean,
    user: User,
    db: admin.firestore.Firestore,
) {
    if (!igrejaId || !trimestreId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    const [igrejaSnap, trimestreSnap] = await Promise.all([
        db.collection(Cll.IGREJAS).doc(igrejaId).get(),
        db.collection(Cll.TRIMESTRES).doc(trimestreId).get(),
    ]);
    if (!igrejaSnap.exists || !trimestreSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Coleções não encontradas.",
        );
    }
    if (
        naoTemPermissao ||
        user.ministerioId !== trimestreSnap.data()?.ministerioId
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const trimestre = trimestreSnap.data() as Trimestre;

    const dataInicio = trimestre.data_inicio.toDate();
    dataInicio.setHours(0, 0, 0, 0);
    const dataFim = trimestre.data_fim.toDate();
    dataFim.setHours(23, 59, 59, 59);

    const licoes = await db
        .collection(Cll.LICOES)
        .where("data_inicio", ">=", dataInicio)
        .where("data_fim", "<=", dataFim)
        .where("igrejaId", "==", igrejaId)
        .get();

    const dias = new Map();
    const meses = new Map();

    const aulasSnaps = await Promise.all(
        licoes.docs.map(async (v) => v.ref.collection("aulas").get()),
    );

    const aulasRealizadas = aulasSnaps
        .flatMap((v) => v.docs)
        .filter((v) => {
            const aula = v.data();
            const data = aula.data_prevista.toDate();
            const dia = data.toLocaleDateString("pt-BR");
            const d = dias.get(dia) || {
                aula: aula.numero_aula,
                realizada: aula.realizada,
                data: dia,
            };

            d.realizada = d.realizada ? true : aula.realizada;
            dias.set(dia, d);

            const mes = meses.get(data.getMonth()) || {
                id: `${data.getFullYear()}-${data.getMonth() + 1}`,
                nome:
                    data
                        .toLocaleDateString("pt-BR", { month: "long" })[0]
                        .toUpperCase() +
                    data
                        .toLocaleDateString("pt-BR", { month: "long" })
                        .slice(1),
                numero_mes: data.getMonth(),
                datas: [],
                resumo_final: {
                    total: 0,
                    total_ofertas_pix: 0,
                    total_ofertas_dinheiro: 0,
                    total_ofertas: 0,
                    total_missoes_pix: 0,
                    total_missoes_dinheiro: 0,
                    total_missoes: 0,
                },
            };

            if (!mes.datas.includes(d)) mes.datas.push(d);
            meses.set(data.getMonth(), mes);

            return aula?.realizada;
        });

    const registrosSnaps = await Promise.all(
        aulasRealizadas.map((v) => v.data().registroRef.get()),
    );

    const totais = {
        total: 0,
        total_ofertas_pix: 0,
        total_ofertas_dinheiro: 0,
        total_ofertas: 0,
        total_missoes_pix: 0,
        total_missoes_dinheiro: 0,
        total_missoes: 0,
    };

    registrosSnaps.forEach((r) => {
        const registro = r.data() as RegistroAulaInterface;

        const valores = {
            total_ofertas_pix: registro.ofertas.pix || 0,
            total_ofertas_dinheiro: registro.ofertas.dinheiro || 0,
            total_ofertas:
                (registro.ofertas.dinheiro || 0) + (registro.ofertas.pix || 0),
            total_missoes_pix: registro.missoes.pix || 0,
            total_missoes_dinheiro: registro.missoes.dinheiro || 0,
            total_missoes:
                (registro.missoes.dinheiro || 0) + (registro.missoes.pix || 0),
            total: registro.ofertas_total + registro.missoes_total || 0,
        };
        const colunas: Array<
            | "total"
            | "total_ofertas_pix"
            | "total_ofertas_dinheiro"
            | "total_ofertas"
            | "total_missoes_pix"
            | "total_missoes_dinheiro"
            | "total_missoes"
        > = [
            "total",
            "total_ofertas_pix",
            "total_ofertas_dinheiro",
            "total_ofertas",
            "total_missoes_pix",
            "total_missoes_dinheiro",
            "total_missoes",
        ];
        const dia = registro.data.toDate();
        const aula = dias.get(dia.toLocaleDateString("pt-BR")) || {};

        const classes = aula["classes"] || {};
        const classe = classes[registro.classeId] || {
            nome: registro.classeNome,
            id: registro.classeId,
            licaoId: registro.licaoId,
            igrejaId: registro.igrejaId,
            total: 0.0,
            total_ofertas_pix: 0.0,
            total_ofertas_dinheiro: 0.0,
            total_ofertas: 0.0,
            total_missoes_pix: 0.0,
            total_missoes_dinheiro: 0.0,
            total_missoes: 0.0,
            comprovantes: [],
        };

        const mes = meses.get(dia.getMonth());

        colunas.forEach((v) => {
            aula[v] = (aula[v] || 0) + valores[v];
            classe[v] = (classe[v] || 0) + valores[v];
            totais[v] = (totais[v] || 0) + valores[v];
            mes["resumo_final"][v] = (mes["resumo_final"][v] || 0) + valores[v];
        });
        classe["comprovantes"].push(
            ...(registro.imgsPixMissoes || []),
            ...(registro.imgsPixOfertas || []),
        );

        aula["classes"] = { ...classes, [registro.classeId]: classe };
        if (!mes["datas"].includes(aula)) mes["datas"].push(aula);
    });

    return { totais, dias, meses, trimestre, licoes, aulasRealizadas };
}

admin.initializeApp();

export const getDashboard = functions.https.onCall(async (request) => {
    const usuario = await validarUsuario(request);
    const { isSecretario, isSuperAdmin } = usuario;

    const [cacheLicaoSnap, cacheMembrosSnap] = await Promise.all([
        baseDashboard(usuario, request, Cll.CACHE_LICAO, true).get(),
        baseDashboard(usuario, request, Cll.CACHE_MEMBROS, false, true).get(),
    ]);
    const cacheLicaoDocs = cacheLicaoSnap.docs;
    const cacheMembrosDocs = cacheMembrosSnap.docs;

    const colunas = {
        ofertas: "total_ofertas",
        missoes: "total_missoes",
        total_presenca: "total_presentes",
        ausentes: "total_ausentes",
        biblias: "total_biblias",
        licoes: "total_licoes",
        total_matriculados: "total_matriculados",
    };

    const respostasMap = new Map();
    Object.entries(colunas).forEach(([key, resp]) => {
        const r = calcCacheLicao(
            cacheLicaoDocs,
            isSuperAdmin,
            isSecretario,
            key,
        );
        respostasMap.set(resp, r);
    });

    const total_membros_matriculados = calcCacheMembros(
        cacheMembrosDocs,
        isSecretario,
    );

    return {
        ...Object.fromEntries(respostasMap),
        total_membros_matriculados,
    };
});

export const getRelatorioDominical = functions.https.onCall(async (request) => {
    const { db } = await validarUsuario(request);

    const { data, classes, igrejaId } = request.data;
    if (!data || (!classes && !igrejaId)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Data, classes ou igreja invalidos",
        );
    }

    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 59);

    const q = db
        .collection(Cll.REGISTROS_AULA)
        .where("data", ">=", inicioDia)
        .where("data", "<=", fimDia);

    const promisesQ = [];
    for (let i = 0; i < classes.length; i += 30) {
        const classesSplit = classes.slice(i, i + 30);
        promisesQ.push(q.where("classeId", "in", classesSplit).get());
    }

    const todosRegistros = (await Promise.all(promisesQ)).flatMap(
        (v) => v.docs,
    );
    const classesRelatorio: any[] = [];
    const registrosMap = new Map<string, any>();
    todosRegistros.forEach((v) => {
        const value = v.data();
        registrosMap.set(value.classeId, { id: v.id, ...v.data() });
        if (value)
            classesRelatorio.push({
                id: value.classeId,
                nome: value.classeNome,
            });
    });

    // Totais Gerais
    const totaisGeraisMap = new Map<string, any>();
    const colunas = [
        "total_matriculados",
        "presentes_chamada",
        "visitas",
        "atrasados",
        "total_ausentes",
        "total_presentes",
        "biblias",
        "licoes_trazidas",
        "ofertas_total",
        "ofertas",
        "missoes_total",
        "missoes",
    ];

    registrosMap.forEach((r) => {
        colunas.forEach((c) => {
            const item = r[c];
            if (item) {
                if (c === "ofertas" || c === "missoes") {
                    const keyPix = `${c}_pix`;
                    const keyDinheiro = `${c}_dinheiro`;

                    const totalPix =
                        (totaisGeraisMap.get(keyPix) || 0) +
                        Number(item["pix"]);
                    const totalDinheiro =
                        (totaisGeraisMap.get(keyDinheiro) || 0) +
                        Number(item["dinheiro"]);

                    totaisGeraisMap.set(keyPix, totalPix);
                    totaisGeraisMap.set(keyDinheiro, totalDinheiro);
                } else {
                    const total = (totaisGeraisMap.get(c) || 0) + Number(item);
                    totaisGeraisMap.set(c, total);
                }
            }
        });
    });

    //Pegando aniversariantes da semana
    const inicioSemana = new Date(fimDia);
    inicioSemana.setDate(inicioSemana.getDate() - 7);
    const fimSemana = new Date(fimDia);

    const alunosSnap = await db
        .collection(Cll.CACHE_ALUNOS)
        .doc(igrejaId)
        .get();

    if (!alunosSnap.exists)
        return {
            totais_gerais: Object.fromEntries(totaisGeraisMap),
            totais_classes: Object.fromEntries(registrosMap),
            classes_relatorio: classesRelatorio,
            aniversariantes: [],
        };

    const alunos = Array.from(Object.values(alunosSnap.data()?.lista || {}));

    const alunosAtualizados = alunos.map((v: any) => {
        const idade = getIdade(v["data_nascimento"]);
        return {
            ...v,
            idade,
            data_nascimento: new Date(
                v["data_nascimento"]
                    .toDate()
                    .setFullYear(fimSemana.getFullYear()),
            ),
        };
    });

    const aniversariantes = alunosAtualizados
        .filter((v) => {
            const aniversario = v["data_nascimento"];
            if (aniversario.getMonth() === 1 && aniversario.getDate() === 29)
                aniversario.setDate(28);
            return aniversario >= inicioSemana && aniversario <= fimSemana;
        })
        .map((v) => ({
            ...v,
            data_nascimento: v["data_nascimento"].toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
            }),
        }));

    return {
        totais_gerais: Object.fromEntries(totaisGeraisMap),
        totais_classes: Object.fromEntries(registrosMap),
        classes_relatorio: classesRelatorio,
        aniversariantes: aniversariantes,
    };
});

interface Trimestre {
    id: string;
    ano: number;
    data_fim: Timestamp;
    data_inicio: Timestamp;
    ministerioId: string;
    nome: string;
    numero_trimestre: number;
}

export const getRelatorioTrimestral = functions.https.onCall(
    async (request) => {
        const { db, isSecretario, user } = await validarUsuario(request);

        const { igrejaId, trimestreId } = request.data;

        const { meses, totais } = await calcTrimestre(
            trimestreId,
            igrejaId,
            isSecretario,
            user,
            db,
        );

        const relatorioSnap = await db
            .collection(Cll.RELATORIOS_TRIMESTRE)
            .where("igrejaId", "==", igrejaId)
            .where("trimestreId", "==", trimestreId)
            .get();

        let total_enviado = {
            valor_enviado_missoes: 0,
            valor_enviado_ofertas: 0,
        };

        if (!relatorioSnap.empty) {
            relatorioSnap.forEach((v) => {
                const dados = v.data();
                const bloqueado = dados.bloqueado;

                if (bloqueado) {
                    const mes = meses.get(dados.numeroMes);
                    mes["bloqueado"] = bloqueado;
                    dados["data_envio"] = dados["data_envio"]
                        .toDate()
                        .toLocaleDateString("pt-BR");
                    mes["relatorio"] = dados;

                    total_enviado["valor_enviado_missoes"] =
                        total_enviado["valor_enviado_missoes"] +
                        (dados["valor_enviado_missoes"] || 0);
                    total_enviado["valor_enviado_ofertas"] =
                        total_enviado["valor_enviado_ofertas"] +
                        (dados["valor_enviado_ofertas"] || 0);
                }
            });
        }

        let isAllBloqueado = true;
        const listaMeses = Array.from(meses.values());
        listaMeses.forEach((v) => {
            isAllBloqueado = isAllBloqueado && v.bloqueado;
            v.datas.forEach(
                (d: any) => (d["classes"] = Object.values(d["classes"] || {})),
            );
        });

        enviarLog(
            user,
            request,
            "GET_RELATORIO_TRIMESTRAL",
            `Relatório gerado com sucesso pelo usuário: ${user.uid}`,
            totais,
        );

        return {
            bloqueado: isAllBloqueado,
            resumo_final: totais,
            total_enviado,
            meses: listaMeses,
        };
    },
);

// interface RelatoriosTrimestres {
//     id: string;
//     data_envio: Timestamp;
//     assinado_por: {
//         nome: string;
//         email: string;
//         uid: string;
//         ip: string;
//     };
//     total: number;
//     total_ofertas_pix: number;
//     total_ofertas_dinheiro: number;
//     total_ofertas: number;
//     total_missoes_pix: number;
//     total_missoes_dinheiro: number;
//     total_missoes: number;
//     igrejaId: string;
//     ministerioId: string;
//     data_inicio: Timestamp;
//     data_fim: Timestamp;
//     bloqueado: boolean;
// }

export const salvarRelatorioTrimestral = functions.https.onCall(
    async (request) => {
        const { isAdmin, db, user } = await validarUsuario(request);

        const {
            igrejaId,
            trimestreId,
            numeroMes,
            confirmacao,
            valor_final_missao,
            valor_final_oferta,
            descricao_missao,
            descricao_oferta,
        } = request.data;

        if (
            !confirmacao ||
            igrejaId !== user.igrejaId ||
            numeroMes < 0 ||
            numeroMes > 11 ||
            Number.isNaN(Number(valor_final_missao)) ||
            Number.isNaN(Number(valor_final_oferta))
        ) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados inválidos ou ausentes.",
            );
        }

        const { totais, trimestre, meses, aulasRealizadas } =
            await calcTrimestre(trimestreId, igrejaId, !isAdmin, user, db);

        const relatorioRef = db
            .collection(Cll.RELATORIOS_TRIMESTRE)
            .doc(`${trimestre.ano}-${numeroMes}-${igrejaId}`);
        const relatorioSnap = await relatorioRef.get();

        if (relatorioSnap.exists && relatorioSnap.data()?.bloqueado) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Esse relatório já foi enviado, somente os administradores do ministério podem liberar a edição.",
            );
        }

        try {
            const batch = db.batch();

            const dados = {
                data_envio: Timestamp.now(),
                assinado_por: {
                    nome: user.nome,
                    email: user.email,
                    uid: user.uid,
                    ip: request.rawRequest.ip,
                },
                ...meses.get(numeroMes).resumo_final,
                numeroMes,
                valor_enviado_missoes: valor_final_missao,
                valor_enviado_ofertas: valor_final_oferta,
                descricao_missao: descricao_missao || null,
                descricao_oferta: descricao_oferta || null,
                igrejaId,
                ministerioId: user.ministerioId,
                trimestreId,
                data_inicio: trimestre.data_inicio,
                data_fim: trimestre.data_fim,
                bloqueado: true,
            };

            const isEdit = relatorioSnap.exists;

            if (isEdit) batch.update(relatorioRef, dados);
            else batch.set(relatorioRef, dados);

            aulasRealizadas.forEach((v) => {
                const dados = v.data();
                const mes = dados.data_prevista.toDate().getMonth();

                if (mes === numeroMes)
                    batch.update(dados.registroRef, {
                        relatorio_enviado: true,
                    });
            });

            await batch.commit();

            enviarLog(
                user,
                request,
                "SALVAR_RELATORIO_TRIMESTRAL",
                `Relatório de ${numeroMes} salvo com sucesso pelo usuário: ${user.uid}`,
                totais,
            );

            return { message: "Relatório salvo com sucesso." };
        } catch (error: any) {
            console.log("Erro ao salvar relatório", error);
            throw new functions.https.HttpsError("internal", error.message);
        }
    },
);

export const desbloquearRelatorio = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, user } = await validarUsuario(request);
    const { trimestreId, igrejaId, numeroMes } = request.data;

    if (!trimestreId || !igrejaId || typeof numeroMes !== "number") {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    const [igrejaSnap, trimestreSnap] = await Promise.all([
        db.collection("igrejas").doc(igrejaId).get(),
        db.collection("trimestres").doc(trimestreId).get(),
    ]);

    if (!igrejaSnap.exists || !trimestreSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Coleções não encontradas",
        );
    }

    const trimestre = trimestreSnap.data();
    if (!isSuperAdmin || trimestre?.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const data = trimestre.data_inicio.toDate();

    const relatorioSnap = await db
        .collection(Cll.RELATORIOS_TRIMESTRE)
        .doc(`${data.getFullYear()}-${numeroMes}-${igrejaId}`)
        .get();

    if (!relatorioSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Relatório não encontrado",
        );
    }

    const dataInicio = new Date(data.getFullYear(), numeroMes, 1, 0, 0, 0, 0);
    const dataFim = new Date(
        data.getFullYear(),
        numeroMes + 1,
        0,
        23,
        59,
        59,
        59,
    );

    const registrosSnap = await db
        .collection(Cll.REGISTROS_AULA)
        .where("data", ">=", dataInicio)
        .where("data", "<=", dataFim)
        .where("igrejaId", "==", igrejaId)
        .where("relatorio_enviado", "==", true)
        .get();

    const batch = db.batch();

    batch.update(relatorioSnap.ref, { bloqueado: false });
    registrosSnap.forEach((v) => {
        batch.update(v.ref, { relatorio_enviado: false });
    });

    await batch.commit();

    return { message: "Relatório atualizado com sucesso" };
});

interface AtualizarTrimestreFront {
    trimestreId: string;
    dados: {
        data_inicio: string;
        numero_aulas: number;
        numero_trimestre: number;
    };
}

export const atualizarTrimestre = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, user } = await validarUsuario(request);

    if (!isSuperAdmin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso.",
        );
    }

    const {
        trimestreId,
        dados: { data_inicio, numero_aulas, numero_trimestre },
    } = request.data as AtualizarTrimestreFront;

    if (!data_inicio || !numero_aulas || !numero_trimestre) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    const trimestreRef = db.collection(Cll.TRIMESTRES).doc(trimestreId);
    const trimestreSnap = await trimestreRef.get();

    if (!trimestreSnap.exists) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Trimestre não encontrado",
        );
    }

    const trimestre = trimestreSnap.data();

    const dataInicioAnterior = trimestre?.data_inicio.toDate();
    dataInicioAnterior.setHours(0, 0, 0, 0);
    const dataFimAnterior = trimestre?.data_fim.toDate();
    dataFimAnterior.setHours(23, 59, 59, 59);

    const licoesSnap = await db
        .collection(Cll.LICOES)
        .where("ministerioId", "==", user.ministerioId)
        .where("data_inicio", ">=", dataInicioAnterior)
        .where("data_fim", "<=", dataFimAnterior)
        .where("numero_trimestre", "==", trimestre?.numero_trimestre)
        .get();

    try {
        const batch = db.batch();

        const dataInicioNova = new Date(data_inicio + "T12:00:00");
        const dataFimNova = new Date(dataInicioNova);
        dataFimNova.setDate(dataFimNova.getDate() + (numero_aulas - 1) * 7);

        licoesSnap.docs.forEach((v) => {
            const novaDataInicio = Timestamp.fromDate(dataInicioNova);
            const novaDataFim = Timestamp.fromDate(dataFimNova);
            batch.update(v.ref, {
                data_inicio: novaDataInicio,
                data_fim: novaDataFim,
                numero_trimestre,
                numero_aulas,
            });
            batch.update(
                db
                    .collection(Cll.CACHE_LICAO)
                    .doc(`${v.data().igrejaId}_${v.id}`),
                {
                    data_inicio: novaDataInicio,
                    data_fim: novaDataFim,
                },
            );
        });

        batch.delete(trimestreRef);

        await batch.commit();

        return { message: "Dados atualizados com sucesso." };
    } catch (error: any) {
        console.log("Erro ao atualizar trimestre", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});

interface MembroFront {
    igrejaId: string;
    membroId?: string;
    dados: {
        nome_completo: string;
        data_nascimento: string;
        contato: string;
        validade: string;
        registro: string;
    };
}

interface Membro {
    data_nascimento: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    nome_completo: string;
    contato: string | null;
    validade: Timestamp | null;
    registro: string | null;
    alunoId?: string | null;
}

interface MembrosCSVFront {
    csv: {
        nome_completo: string;
        data_nascimento: string;
        contato: string;
        registro: string;
        validade: string;
    }[];
    igrejaId: string;
}

// Membros
export const salvarMembro = functions.https.onCall(async (request) => {
    const { db, user, isSecretario, isAdmin } = await validarUsuario(request);

    const { dados, igrejaId, membroId } = request.data as MembroFront;

    if (!igrejaId || !dados) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    const igreja = await db.collection("igrejas").doc(igrejaId).get();
    if (isSecretario || user.ministerioId !== igreja.data()?.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }

    const dadosParaSalvar: Membro = {
        contato: dados.contato || null,
        data_nascimento: Timestamp.fromDate(
            new Date(dados.data_nascimento + "T12:00:00"),
        ),
        validade: dados?.validade
            ? Timestamp.fromDate(new Date(dados.validade + "T12:00:00"))
            : null,
        igrejaId,
        igrejaNome: igreja.data()!.nome,
        ministerioId: user.ministerioId,
        nome_completo: dados.nome_completo,
        registro: dados?.registro || null,
    };

    if (membroId) {
        const membroRef = db.collection("membros").doc(membroId);
        const membroSnap = await membroRef.get();

        if (!membroSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Membro não encontrado",
            );
        }

        if (isAdmin) dadosParaSalvar.igrejaId = user.igrejaId; //Apenas por precaução

        await Promise.all([
            membroRef.update(dadosParaSalvar as any),
            db
                .collection(Cll.CACHE_MEMBROS)
                .doc(igrejaId)
                .update({
                    [`lista.${membroRef.id}`]: {
                        ...membroSnap.data(),
                        ...dadosParaSalvar,
                        id: membroRef.id,
                    },
                }),
        ]);

        enviarLog(
            user,
            request,
            "SALVAR_MEMBRO",
            `Membro atualizado com sucesso por ${user.uid}`,
            {
                dadosParaSalvar,
                dadosAnteriores: membroSnap.data(),
            },
        );

        return { id: membroId, ...membroSnap.data(), ...dadosParaSalvar };
    }

    dadosParaSalvar["alunoId"] = null;
    const membroRef = db.collection(Cll.MEMBROS).doc();

    await Promise.all([
        membroRef.set(dadosParaSalvar),
        db
            .collection(Cll.CACHE_MEMBROS)
            .doc(igrejaId)
            .update({
                [`lista.${membroRef.id}`]: {
                    ...dadosParaSalvar,
                    id: membroRef.id,
                },
            }),
    ]);
    enviarLog(
        user,
        request,
        "SALVAR_MEMBRO",
        `Membro salvo com sucesso por ${user.uid}`,
    );

    return { id: membroRef.id, ...dadosParaSalvar };
});
export const deletarMembro = functions.https.onCall(async (request) => {
    const { db, user, isAdmin, isSecretario } = await validarUsuario(request);

    const { membroId } = request.data;
    if (!membroId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const membroRef = db.collection(Cll.MEMBROS).doc(membroId);
    const membroSnap = await membroRef.get();
    const igrejaId = membroSnap.data()?.igrejaId;

    if (!membroSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Membro não encontrado",
        );
    }
    if (
        membroSnap.data()?.ministerioId !== user.ministerioId ||
        (isAdmin && igrejaId !== user.igrejaId) ||
        isSecretario
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    try {
        const batch = db.batch();
        batch.delete(membroRef);
        batch.update(db.collection(Cll.CACHE_MEMBROS).doc(igrejaId), {
            [`lista.${membroId}`]: FieldValue.delete(),
        });

        const alunoQuery = db
            .collection(Cll.ALUNOS)
            .where("membroId", "==", membroId);
        const alunoSnap = await alunoQuery.get();

        if (!alunoSnap.empty) {
            alunoSnap.docs.forEach((v) => {
                batch.update(v.ref, { membroId: null, isMembro: false });
                batch.update(db.collection(Cll.CACHE_ALUNOS).doc(igrejaId), {
                    [`lista.${v.id}.membroId`]: null,
                    [`lista.${v.id}.isMembro`]: false,
                });
            });
        }

        await batch.commit();
        enviarLog(
            user,
            request,
            "DELETAR_MEMBRO",
            `Aluno deletado com sucesso pelo usuário: ${user.uid}`,
        );

        return { message: "Membro deletado com suscesso." };
    } catch (error) {
        console.log("Ocorreu um erro ao deletar membro", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar membro",
        );
    }
});
export const salvarMembroCSV = functions.https.onCall(async (request) => {
    const { db, isSecretario, user } = await validarUsuario(request);

    const { igrejaId, csv } = request.data as MembrosCSVFront;
    if (!igrejaId || !csv || !csv.length) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados invalidos ou ausentes",
        );
    }

    const igrejaSnap = await db.collection(Cll.IGREJAS).doc(igrejaId).get();
    if (!igrejaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada",
        );
    }

    const igreja = igrejaSnap.data() as Igreja;

    if (isSecretario || igreja.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso",
        );
    }

    let batch = db.batch();
    const batches = [batch];
    let count = 0;

    const membrosComErro: string[] = [];
    csv.forEach((v) => {
        const { nome_completo, data_nascimento, contato, registro, validade } =
            v;
        const [dia, mes, ano] = data_nascimento.split("/");
        const [_, mesValidade, anoValidade] = validade.split("/");
        if (!nome_completo) return;
        if (
            !dia ||
            !mes ||
            !ano ||
            Number.isNaN(Number(dia)) ||
            Number.isNaN(Number(mes)) ||
            Number.isNaN(Number(ano))
        )
            return membrosComErro.push(nome_completo);

        const nascimento = Timestamp.fromDate(
            new Date(Number(ano), Number(mes) - 1, Number(dia), 12, 0, 0, 0),
        );
        const validadeMembro =
            !Number.isNaN(Number(mesValidade)) &&
            !Number.isNaN(Number(anoValidade))
                ? Timestamp.fromDate(
                      new Date(
                          Number(anoValidade),
                          Number(mesValidade) - 1,
                          1,
                          12,
                          0,
                          0,
                          0,
                      ),
                  )
                : null;
        const regex = /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g;

        const dadosParaSalvar = {
            alunoId: null,
            contato: regex.test(contato) ? contato : null,
            data_nascimento: nascimento,
            igrejaId,
            igrejaNome: igreja.nome,
            ministerioId: user.ministerioId,
            nome_completo,
            registro,
            validade: validadeMembro,
        };
        const membroRef = db.collection(Cll.MEMBROS).doc();
        batch.set(membroRef, dadosParaSalvar);
        batch.update(db.collection(Cll.CACHE_MEMBROS).doc(igrejaId), {
            [`lista.${membroRef.id}`]: {
                id: membroRef.id,
                ...dadosParaSalvar,
            },
        });
        count += 2;
        if (count >= 499) {
            batch = db.batch();
            batches.push(batch);
            count = 0;
        }

        return;
    });

    await Promise.all(batches.map((v) => v.commit()));

    enviarLog(
        user,
        request,
        "SALVAR_MEMBROS_CSV",
        `Membros cadastrados com sucesso pelo usuário: ${user.uid}`,
    );
    console.log(`Membros cadastrados com sucesso pelo usuário: ${user.uid}`);
    return {
        message: membrosComErro.length
            ? `Os membros a seguir não foram cadastrados devido a erros no arquivo: ${membrosComErro.join(
                  ",",
              )}`
            : "Membros cadastrados com sucesso!",
    };
});

// --- Aluno ---
interface AlunoFront {
    nome_completo: string;
    data_nascimento: string;
    contato: string;
    isMembro: boolean;
    membroId?: string;
}
interface AlunoCSVFront {
    csv: { nome_completo: string; data_nascimento: string; contato: string }[];
    igrejaId: string;
}

interface AlunoInterface {
    id: string;
    data_nascimento: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    nome_completo: string;
    contato: string | null;
    isMembro: boolean;
    membroId: string | null;
}

export const salvarAluno = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    let { alunoId, igrejaId } = request.data;
    const dados = request.data.dados as AlunoFront;

    if (isSuperAdmin && !igrejaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Id igreja não enviado",
        );
    }
    if (!isSuperAdmin) igrejaId = user.igrejaId;

    const dadosAtualizados = {
        ...dados,
        data_nascimento: admin.firestore.Timestamp.fromDate(
            new Date(dados.data_nascimento + "T12:00:00"),
        ),
        membroId: dados.membroId || null,
    };

    if (alunoId) {
        const alunoRef = db.collection(Cll.ALUNOS).doc(alunoId);
        const alunoDoc = await alunoRef.get();
        const alunoData = alunoDoc.data();

        if (!alunoDoc.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Aluno não encontrado",
            );
        }

        const batch = db.batch();

        if (dados.membroId) {
            batch.update(db.collection(Cll.MEMBROS).doc(dados.membroId), {
                alunoId: alunoDoc.id,
            });
            batch.update(db.collection(Cll.CACHE_MEMBROS).doc(igrejaId), {
                [`lista.${dados.membroId}.alunoId`]: alunoDoc.id,
            });
        }

        if (alunoData?.membroId && alunoData.membroId !== dados.membroId) {
            batch.update(db.collection(Cll.MEMBROS).doc(alunoData.membroId), {
                alunoId: null,
            });
            batch.update(db.collection(Cll.CACHE_MEMBROS).doc(igrejaId), {
                [`lista.${alunoData.membroId}.alunoId`]: null,
            });
        }

        batch.update(alunoRef, dadosAtualizados);
        batch.update(db.collection(Cll.CACHE_ALUNOS).doc(igrejaId), {
            [`lista.${alunoId}`]: {
                ...alunoDoc.data(),
                ...dadosAtualizados,
                id: alunoId,
            },
        });

        await batch.commit();
        enviarLog(
            user,
            request,
            "SALVAR_ALUNO",
            `Aluno editado pelo usuário ${user.uid}`,
            { aluno: alunoDoc.data() },
        );

        return {
            id: alunoDoc.id,
            ...alunoDoc.data(),
            ...dadosAtualizados,
        };
    }

    const igreja = await db.collection(Cll.IGREJAS).doc(igrejaId).get();
    if (!igreja.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada",
        );
    }
    if (igreja.data()?.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão par isso",
        );
    }

    const aluno = {
        ...dadosAtualizados,
        igrejaId,
        ministerioId: user.ministerioId,
        igrejaNome: igreja.data()!.nome,
    };

    const docRef = db.collection(Cll.ALUNOS).doc();
    const alunoPortal = {
        alunoId: docRef.id,
        conquistas: {},
        data_nascimento: aluno.data_nascimento,
        historico: {},
        igrejaId: aluno.igrejaId,
        ministerioId: aluno.ministerioId,
        nome: aluno.nome_completo.split(" ")[0],
        ultimaLicaoId: null,
    };

    await Promise.all([
        docRef.set(aluno),
        db
            .collection(Cll.CACHE_ALUNOS)
            .doc(igrejaId)
            .update({ [`lista.${docRef.id}`]: { id: docRef.id, ...aluno } }),
        db
            .collection(Cll.CACHE_ANIVERSARIANTES)
            .doc(
                `${aluno.ministerioId}_${aluno.data_nascimento.toDate().getMonth()}`,
            )
            .update({
                [`lista.${docRef.id}`]: {
                    alunoId: docRef.id,
                    alunoNome: aluno.nome_completo,
                    data_nascimento: aluno.data_nascimento,
                    dia_nascimento: aluno.data_nascimento.toDate().getDate(),
                    mes_nascimento: aluno.data_nascimento.toDate().getMonth(),
                    ministerioId: aluno.ministerioId,
                    igrejaId: aluno.igrejaId,
                },
            }),
        db.collection(Cll.CACHE_PORTAL_ALUNO).doc(docRef.id).set(alunoPortal),
    ]);
    if (dados.membroId) {
        await Promise.all([
            db
                .collection(Cll.MEMBROS)
                .doc(dados.membroId)
                .update({ alunoId: docRef.id }),
            db
                .collection(Cll.CACHE_MEMBROS)
                .doc(igrejaId)
                .update({ [`lista.${dados.membroId}.alunoId`]: docRef.id }),
        ]);
    }

    enviarLog(
        user,
        request,
        "SALVAR_ALUNO",
        `Aluno salvo pelo usuário ${user.uid}`,
        aluno,
    );

    return { id: docRef.id, ...aluno };
});
export const onAlunoUpdate = onDocumentUpdated(
    "alunos/{alunoId}",
    async (event) => {
        const dadosAntigos = event.data?.before.data() as AlunoInterface;
        const dadosNovos = event.data?.after.data() as AlunoInterface;

        if (!dadosAntigos || !dadosNovos) {
            console.log(
                "Dados ausentes no evento de atualização, encerrando a função.",
            );
            return;
        }

        const nomeMudou =
            dadosAntigos.nome_completo !== dadosNovos.nome_completo;
        const dataMudou =
            dadosAntigos.data_nascimento.toMillis() !==
            dadosNovos.data_nascimento.toMillis();

        if (!nomeMudou && !dataMudou) {
            console.log("Nenhum dado mudou, encerrando trigger");
            return;
        }

        const { alunoId } = event.params;
        const db = admin.firestore();
        const batch = db.batch();

        if (dataMudou) {
            console.log("As datas mudaram, iniciando update...");

            const cacheCollection = db.collection(Cll.CACHE_ANIVERSARIANTES);
            const { ministerioId, igrejaId, nome_completo } = dadosNovos;
            const dataAntiga = dadosAntigos.data_nascimento;
            const dataNova = dadosNovos.data_nascimento;

            const mesAntigo = dataAntiga.toDate().getMonth();
            const mesNovo = dataNova.toDate().getMonth();
            const diaNovo = dataNova.toDate().getDate();

            const dadosParaSalvar = {
                alunoId,
                alunoNome: nome_completo,
                data_nascimento: dataNova,
                dia_nascimento: diaNovo,
                igrejaId,
                mes_nascimento: mesNovo,
                ministerioId,
            };
            if (mesAntigo === mesNovo) {
                batch.update(
                    cacheCollection.doc(`${ministerioId}_${mesNovo}`),
                    { [`lista.${alunoId}`]: dadosParaSalvar },
                );
            } else {
                batch.update(
                    cacheCollection.doc(`${ministerioId}_${mesAntigo}`),
                    { [`lista.${alunoId}`]: FieldValue.delete() },
                );
                batch.update(
                    cacheCollection.doc(`${ministerioId}_${mesNovo}`),
                    { [`lista.${alunoId}`]: dadosParaSalvar },
                );
            }

            batch.update(db.collection(Cll.CACHE_PORTAL_ALUNO).doc(alunoId), {
                data_nascimento: dataNova,
            });
        }

        if (nomeMudou) {
            const novoNome = dadosNovos.nome_completo;
            const { ministerioId } = dadosNovos;

            console.log(
                `Aluno ${alunoId} mudou de nome para "${novoNome}". Iniciando fan-out...`,
            );

            const matriculasQuery = db
                .collection(Cll.MATRICULAS)
                .where("alunoId", "==", alunoId);
            const matriculasSnap = await matriculasQuery.get();
            matriculasSnap.forEach((doc) => {
                const data = doc.data();
                batch.update(doc.ref, { alunoNome: novoNome });
                batch.update(
                    db
                        .collection(Cll.CACHE_MATRICULAS)
                        .doc(`${data?.igrejaId}_${data?.licaoId}`),
                    {
                        [`lista.${doc.id}.alunoNome`]: novoNome,
                    },
                );
            });

            batch.update(db.collection(Cll.CACHE_PORTAL_ALUNO).doc(alunoId), {
                nome: novoNome.split(" ")[0],
            });

            const licoesIds = matriculasSnap.docs
                .map((doc) => doc.data().licaoId)
                .filter(Boolean);
            if (licoesIds.length > 0) {
                const cachePromises = [];
                for (let i = 0; i < licoesIds.length; i += 30) {
                    const l = licoesIds.slice(i, i + 30);
                    cachePromises.push(
                        db
                            .collection(Cll.CACHE_LICAO)
                            .where("licaoId", "in", l)
                            .get(),
                    );
                }

                const cacheSnap = (await Promise.all(cachePromises)).flatMap(
                    (v) => v.docs,
                );

                cacheSnap.forEach((doc) => {
                    batch.update(doc.ref, {
                        [`detalhes_aluno.${alunoId}.nome`]: novoNome,
                    });
                });
            }

            if (!dataMudou) {
                const mes = dadosNovos.data_nascimento.toDate().getMonth();
                batch.update(
                    db
                        .collection(Cll.CACHE_ANIVERSARIANTES)
                        .doc(`${ministerioId}_${mes}`),
                    { [`lista.${alunoId}.alunoNome`]: novoNome },
                );
            }
        }

        await batch.commit();
        console.log(`Fan-out para o aluno ${alunoId} concluído com sucesso!`);
    },
);
export const deletarAluno = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    const { alunoId } = request.data;

    if (!alunoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }
    const alunosRef = db.collection(Cll.ALUNOS).doc(alunoId);
    const alunosSnap = await alunosRef.get();

    if (!alunosSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Aluno não encontrado",
        );
    }
    const alunoData = alunosSnap.data() as AlunoInterface;
    if (
        (!isSuperAdmin && alunoData?.igrejaId !== user.igrejaId) ||
        alunoData?.ministerioId !== user.ministerioId
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso",
        );
    }

    try {
        const refsDel: any[] = [alunosRef];
        const licoesUpt: any[] = [];
        let count = 0;
        let batch = db.batch();
        const batchs = [batch];

        const matriculasSnaps = await db
            .collection(Cll.MATRICULAS)
            .where("alunoId", "==", alunoId)
            .get();
        matriculasSnaps.forEach((v) => {
            const matricula = v.data();
            refsDel.push(v.ref);
            licoesUpt.push(matricula.licaoRef);
            batch.update(
                db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${matricula.igrejaId}_${matricula.licaoId}`),
                { [`lista.${v.id}`]: FieldValue.delete() },
            );

            count++;
            if (count >= 499) {
                batch = db.batch();
                batchs.push(batch);
                count = 0;
            }
        });

        const licoesIds = matriculasSnaps.docs.map((v) => v.data().licaoId);
        if (licoesIds.length > 0) {
            const promisesRegistros = [];
            const promisesCache = [];

            for (let i = 0; i < licoesIds.length; i += 30) {
                const chunk = licoesIds.slice(i, i + 30);
                promisesRegistros.push(
                    db
                        .collection(Cll.REGISTROS_AULA)
                        .where("licaoId", "in", chunk)
                        .get(),
                );
                promisesCache.push(
                    db
                        .collection(Cll.CACHE_LICAO)
                        .where("licaoId", "in", chunk)
                        .get(),
                );
            }

            const registrosDocs = (
                await Promise.all(promisesRegistros)
            ).flatMap((v) => v.docs);

            const chamadas = registrosDocs.map(async (v) => {
                const listaAulasRef = v.ref.collection("chamada").doc("lista");
                const listaAlunos = await listaAulasRef.get();

                if (listaAlunos.exists) {
                    const lista = listaAlunos
                        .data()
                        ?.chamada.filter((v: any) => v.alunoId !== alunoId);
                    count++;
                    batch.update(listaAulasRef, { chamada: lista });
                }
            });
            await Promise.all(chamadas);

            (await Promise.all(promisesCache)).forEach((v) => {
                v.forEach((v) => {
                    batch.update(v.ref, {
                        total_matriculados: FieldValue.increment(-1),
                        [`detalhes_aluno.${alunoId}`]: FieldValue.delete(),
                    });
                    count++;

                    if (count >= 499) {
                        batch = db.batch();
                        batchs.push(batch);
                        count = 0;
                    }
                });
            });
        }

        const membros = await db
            .collection("membros")
            .where("alunoId", "==", alunoId)
            .get();

        if (!membros.empty) {
            membros.docs.forEach((v) => {
                batch.update(v.ref, { alunoId: null });
                batch.update(
                    db
                        .collection(Cll.CACHE_MEMBROS)
                        .doc(alunosSnap.data()?.igrejaId),
                    { [`lista.${v.id}.alunoId`]: null },
                );
                count += 2;
            });
        }

        batch.update(db.collection(Cll.CACHE_ALUNOS).doc(alunoData.igrejaId), {
            [`lista.${alunoId}`]: FieldValue.delete(),
        });
        batch.update(
            db
                .collection(Cll.CACHE_ANIVERSARIANTES)
                .doc(
                    `${alunoData.ministerioId}_${alunoData.data_nascimento.toDate().getMonth()}`,
                ),
            {
                [`lista.${alunoId}`]: FieldValue.delete(),
            },
        );
        batch.delete(db.collection(Cll.CACHE_PORTAL_ALUNO).doc(alunoId));
        count += 3;

        for (let ref of refsDel) {
            batch.delete(ref);
            count++;

            if (count >= 499) {
                batch = db.batch();
                batchs.push(batch);
                count = 0;
            }
        }

        for (let ref of licoesUpt) {
            batch.update(ref, { total_matriculados: FieldValue.increment(-1) });
            count++;

            if (count >= 499) {
                batch = db.batch();
                batchs.push(batch);
                count = 0;
            }
        }

        await Promise.all(batchs.map(async (v) => v.commit()));

        enviarLog(
            user,
            request,
            "DELETAR_ALUNO",
            `Aluno e ${
                refsDel.length - 1
            } dados associados foram deletados com sucesso pelo usuário: ${
                user.uid
            }`,
            { alunos: alunosSnap.data() },
        );

        return {
            message: `Aluno e todos os seus dados foram deletados com sucesso.`,
        };
    } catch (error) {
        console.log("deu esse erro", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve algum erro ao deletar o Aluno. Tente de novo.",
        );
    }
});
export const salvarAlunosCSV = functions.https.onCall(async (request) => {
    const { db, isSecretario, user } = await validarUsuario(request);

    const { csv, igrejaId } = request.data as AlunoCSVFront;
    if (!igrejaId || !csv || !csv.length) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const igrejaSnap = await db.collection(Cll.IGREJAS).doc(igrejaId).get();

    if (!igrejaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada",
        );
    }

    const igreja = igrejaSnap.data() as Igreja;

    if (isSecretario || igreja.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }

    let batch = db.batch();
    const batches = [batch];
    let count = 0;

    const alunosComErro: string[] = [];
    csv.forEach((v) => {
        const { nome_completo, data_nascimento, contato } = v;
        const [dia, mes, ano] = data_nascimento.split("/");
        if (!nome_completo) return;
        if (
            !dia ||
            !mes ||
            !ano ||
            Number.isNaN(Number(dia)) ||
            Number.isNaN(Number(mes)) ||
            Number.isNaN(Number(ano))
        )
            return alunosComErro.push(nome_completo);

        const nascimento = Timestamp.fromDate(
            new Date(Number(ano), Number(mes) - 1, Number(dia), 12, 0, 0, 0),
        );
        const regex = /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g;

        const dadosParaSalvar = {
            contato: regex.test(contato) ? contato : null,
            data_nascimento: nascimento,
            igrejaId,
            igrejaNome: igreja.nome,
            isMembro: false,
            membroId: null,
            ministerioId: user.ministerioId,
            nome_completo,
        };
        const alunoRef = db.collection(Cll.ALUNOS).doc();
        const alunoPortal = {
            alunoId: alunoRef.id,
            conquistas: {},
            data_nascimento: dadosParaSalvar.data_nascimento,
            historico: {},
            igrejaId: dadosParaSalvar.igrejaId,
            ministerioId: dadosParaSalvar.ministerioId,
            nome: dadosParaSalvar.nome_completo.split(" ")[0],
            ultimaLicaoId: null,
        };
        batch.set(alunoRef, dadosParaSalvar);
        batch.update(db.collection(Cll.CACHE_ALUNOS).doc(igrejaId), {
            [`lista.${alunoRef.id}`]: {
                ...dadosParaSalvar,
                id: alunoRef.id,
            },
        });
        batch.update(
            db
                .collection(Cll.CACHE_ANIVERSARIANTES)
                .doc(
                    `${dadosParaSalvar.ministerioId}_${dadosParaSalvar.data_nascimento.toDate().getMonth()}`,
                ),
            {
                [`lista.${alunoRef.id}`]: {
                    alunoId: alunoRef.id,
                    alunoNome: dadosParaSalvar.nome_completo,
                    data_nascimento: dadosParaSalvar.data_nascimento,
                    dia_nascimento: dadosParaSalvar.data_nascimento
                        .toDate()
                        .getDate(),
                    mes_nascimento: dadosParaSalvar.data_nascimento
                        .toDate()
                        .getMonth(),
                    ministerioId: dadosParaSalvar.ministerioId,
                    igrejaId: dadosParaSalvar.igrejaId,
                },
            },
        );
        batch.set(
            db.collection(Cll.CACHE_PORTAL_ALUNO).doc(alunoRef.id),
            alunoPortal,
        );
        count += 4;
        if (count >= 499) {
            batch = db.batch();
            batches.push(batch);
            count = 0;
        }

        return;
    });

    await Promise.all(batches.map((v) => v.commit()));

    enviarLog(
        user,
        request,
        "SALVAR_ALUNOS_CSV",
        `Alunos cadastrados com sucesso pelo usuário: ${user.uid}`,
    );
    console.log(`Alunos cadastrados com sucesso pelo usuário: ${user.uid}`);
    return {
        message: alunosComErro.length
            ? `Os alunos a seguir não foram cadastrados devido a erros no arquivo: ${alunosComErro.join(
                  ",",
              )}`
            : "Alunos cadastrados com sucesso!",
    };
});

// Classe
interface ClasseFront {
    igrejaId: string;
    nome: string;
    idade_minima: number | null;
    idade_maxima: number | null;
    rotuloId: string;
}
interface Classe extends ClasseFront {
    igrejaNome: string;
    ministerioId: string;
    rotuloNome: string;
}

interface ClasseCSVFront {
    csv: { nome: string; idade_minima: string; idade_maxima: string }[];
    igrejaId: string;
}

export const salvarClasse = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin, isSecretario } =
        await validarUsuario(request);
    if (isSecretario) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Secretário de classe ou professor não podem cadastrar outras classes",
        );
    }

    const { classeId } = request.data;
    let { igrejaId, nome, idade_minima, idade_maxima, rotuloId } = request.data
        .dados as ClasseFront;
    const isDefaultLabel = rotuloId === "id-outro";

    if (isSuperAdmin && !igrejaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Id igreja não enviado",
        );
    }
    if (!isSuperAdmin) igrejaId = user.igrejaId;

    const [igrejaSnap, rotuloSnap] = await Promise.all([
        db.collection("igrejas").doc(igrejaId).get(),
        db.collection("rotulos_classes").doc(rotuloId).get(),
    ]);

    if (!igrejaSnap.exists || (!isDefaultLabel && !rotuloSnap.exists)) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja ou rótulo não encontrado",
        );
    }
    const rotulo = rotuloSnap.data();
    if (
        igrejaSnap.data()!.ministerioId !== user.ministerioId ||
        (!isDefaultLabel && rotulo!.ministerioId !== user.ministerioId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }

    if (isDefaultLabel) {
        const r = db.collection("rotulos_classes").doc();
        await r.create({
            nome: "OUTRO",
            idade_minima: null,
            idade_maxima: null,
            ministerioId: user.ministerioId,
        });
        rotuloId = r.id;
    }

    const dadosAtualizados = {
        rotuloId,
        rotuloNome: isDefaultLabel ? "OUTRO" : rotulo!.nome,
        igrejaId,
        igrejaNome: igrejaSnap.data()!.nome,
        nome,
        idade_minima: typeof idade_minima !== "number" ? null : idade_minima,
        idade_maxima: typeof idade_maxima !== "number" ? null : idade_maxima,
    };
    if (classeId) {
        const classeRef = db.collection(Cll.CLASSES).doc(classeId);
        const classeSnap = await classeRef.get();
        const classeData = classeSnap.data();

        if (!classeSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe não encontrada",
            );
        }

        const igrejaMudou = classeData?.igrejaId !== igrejaId;
        await Promise.all([
            classeRef.update(dadosAtualizados),
            db
                .collection(Cll.CACHE_CLASSES)
                .doc(igrejaId)
                .update({
                    [`lista.${classeId}`]: {
                        ...classeData,
                        ...dadosAtualizados,
                        id: classeId,
                    },
                }),
            igrejaMudou
                ? db
                      .collection(Cll.CACHE_CLASSES)
                      .doc(classeData?.igrejaId)
                      .update({
                          [`lista.${classeId}`]: FieldValue.delete(),
                      })
                : undefined,
        ]);

        enviarLog(
            user,
            request,
            "SALVAR_CLASSE",
            `Aluno editado pelo usuário ${user.uid}`,
            {
                dadosAtualizados,
                classe: classeSnap.data(),
            },
        );

        return {
            id: classeSnap.id,
            ...classeSnap.data(),
            ...dadosAtualizados,
        };
    }

    const classe: Classe = {
        ...dadosAtualizados,
        ministerioId: user.ministerioId,
    };

    const docRef = db.collection("classes").doc();

    await Promise.all([
        docRef.set(classe),
        db
            .collection(Cll.CACHE_CLASSES)
            .doc(igrejaId)
            .update({ [`lista.${docRef.id}`]: { ...classe, id: docRef.id } }),
    ]);

    enviarLog(
        user,
        request,
        "SALVAR_CLASSE",
        `Aluno cadastrado pelo usuário ${user.uid}`,
        dadosAtualizados,
    );

    return { id: docRef.id, ...classe };
});
export const onClasseUpdate = onDocumentUpdated(
    "classes/{classeId}",
    async (event) => {
        const dadosAntigos = event.data?.before.data() as Classe;
        const dadosNovos = event.data?.after.data() as Classe;

        if (!dadosAntigos || !dadosNovos) {
            console.log("Dados ausentes, encerrando trigger");
            return;
        }
        if (dadosNovos.nome === dadosAntigos.nome) return;

        const { classeId } = event.params;
        const novoNome = { classeNome: dadosNovos.nome };
        const field = "classeId";
        const db = admin.firestore();
        let batch = db.batch();
        const batches = [batch];
        let count = 0;
        const listaRefs: any = [];

        console.log(
            `Nome antigo: ${dadosAntigos.nome} | Nome novo: ${dadosNovos.nome}`,
        );

        const colecoes = [Cll.REGISTROS_AULA, Cll.CACHE_LICAO, Cll.LICOES];
        const promises = colecoes.map((v) =>
            db.collection(v).where(field, "==", classeId).get(),
        );
        (await Promise.all(promises)).forEach((v) => {
            v.forEach((v) => {
                listaRefs.push(v.ref);
            });
        });

        const [matriculasSnap, usuariosSnap] = await Promise.all([
            db.collection(Cll.MATRICULAS).where(field, "==", classeId).get(),
            db.collection(Cll.USUARIOS).where(field, "==", classeId).get(),
        ]);
        matriculasSnap.docs.forEach((v) => {
            const data = v.data();
            listaRefs.push(v.ref);
            batch.update(
                db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${dadosNovos.igrejaId}_${data?.licaoId}`),
                { [`lista.${v.id}.classeNome`]: novoNome.classeNome },
            );
            count++;

            if (count >= 499) {
                batch = db.batch();
                count = 0;
                batches.push(batch);
            }
        });
        usuariosSnap.docs.forEach((v) => {
            listaRefs.push(v.ref);
            batch.update(
                db.collection(Cll.CACHE_USUARIOS).doc(dadosNovos.igrejaId),
                { [`lista.${v.id}.classeNome`]: novoNome.classeNome },
            );
            count++;
        });

        for (const ref of listaRefs) {
            batch.update(ref, novoNome);
            count++;

            if (count >= 499) {
                batch = db.batch();
                count = 0;
                batches.push(batch);
            }
        }

        await Promise.all(batches.map((v) => v.commit()));

        console.log("Fan-out realizado, classe alterada!");
    },
);
export const deletarClasse = functions.https.onCall(async (request) => {
    const { db, isSecretario, isSuperAdmin, user } =
        await validarUsuario(request);

    const { classeId } = request.data;
    if (!classeId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const classeRef = db.collection(Cll.CLASSES).doc(classeId);
    const classeSnap = await classeRef.get();
    if (!classeSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Classe não encontrada",
        );
    }

    const igrejaId = classeSnap.data()!.igrejaId;
    if (
        isSecretario ||
        (!isSuperAdmin && igrejaId !== user.igrejaId) ||
        (isSuperAdmin && classeSnap.data()!.ministerioId !== user.ministerioId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para apagar uma classe.",
        );
    }

    const licao = await db
        .collection(Cll.LICOES)
        .where("classeId", "==", classeId)
        .get();

    if (!licao.empty) {
        throw new functions.https.HttpsError(
            "aborted",
            "Você não pode excluir uma classe que já possui lições cadastradas. Por favor, remova as lições primeiro.",
        );
    }
    try {
        const batch = db.batch();

        batch.delete(classeRef);
        batch.update(db.collection(Cll.CACHE_CLASSES).doc(igrejaId), {
            [`lista.${classeId}`]: FieldValue.delete(),
        });

        const usuariosSnap = await db
            .collection(Cll.USUARIOS)
            .where("role", "in", [Roles.SECRETARIO_CLASSE, Roles.PROFESSOR])
            .where("classeId", "==", classeId)
            .get();

        const promises: Promise<any>[] = [];
        usuariosSnap.docs.forEach((v) => {
            batch.delete(v.ref);
            batch.update(db.collection(Cll.CACHE_USUARIOS).doc(igrejaId), {
                [`lista.${v.id}`]: FieldValue.delete(),
            });
            const uid = v.data().uid;
            if (uid) promises.push(admin.auth().deleteUser(uid));
        });

        await batch.commit();
        await Promise.all(promises);

        enviarLog(
            user,
            request,
            "DELETAR_CLASSE",
            `A classe ${classeId} e seus usuários associados foram deletados com sucesso.`,
            { classe: classeSnap.data() },
        );

        return { message: "Classe deletada com sucesso!" };
    } catch (erro) {
        console.log("Erro ao apagar classe", erro);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar a classe. Tente novamente",
        );
    }
});
export const salvarClasseCSV = functions.https.onCall(async (request) => {
    const { db, isSecretario, user } = await validarUsuario(request);

    const { csv, igrejaId } = request.data as ClasseCSVFront;
    if (!igrejaId || !csv || !csv.length) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    const [igrejaSnap, rotuloSnap] = await Promise.all([
        db.collection("igrejas").doc(igrejaId).get(),
        db
            .collection("rotulos_classes")
            .where("ministerioId", "==", user.ministerioId)
            .where("nome", "==", "OUTRO")
            .limit(1)
            .get(),
    ]);
    if (!igrejaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada;",
        );
    }
    const igreja = { id: igrejaSnap.id, ...igrejaSnap.data() } as any;

    if (isSecretario || igreja!.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }

    let rotuloId;
    if (!rotuloSnap.empty) rotuloId = rotuloSnap.docs[0].id;
    else {
        const rotulosCll = db.collection(Cll.ROTULOS).doc();
        await rotulosCll.create({
            nome: "OUTRO",
            idade_minima: null,
            idade_maxima: null,
            ministerioId: user.ministerioId,
        });

        rotuloId = rotulosCll.id;
    }

    let batch = db.batch();
    const batches = [batch];
    let count = 0;

    const foraDaFaixa: string[] = [];

    csv.forEach((v) => {
        const { idade_maxima, idade_minima, nome } = v;
        const idadeMaxima =
            idade_maxima && !Number.isNaN(Number(idade_maxima))
                ? Number(idade_maxima)
                : null;
        const idadeMinima =
            idade_minima && !Number.isNaN(Number(idade_minima))
                ? Number(idade_minima)
                : null;
        if (!nome) return;
        if (idadeMaxima && idadeMinima && idadeMinima > idadeMaxima)
            return foraDaFaixa.push(nome);

        const dadosParaSalvar = {
            nome,
            idade_maxima: idadeMaxima,
            idade_minima: idadeMinima,
            igrejaId,
            igrejaNome: igreja!.nome,
            ministerioId: user.ministerioId,
            rotuloId,
            rotuloNome: "OUTRO",
        };
        const classeRef = db.collection("classes").doc();
        batch.set(classeRef, dadosParaSalvar);
        batch.update(db.collection(Cll.CACHE_CLASSES).doc(igrejaId), {
            [`lista.${classeRef.id}`]: {
                ...dadosParaSalvar,
                id: classeRef.id,
            },
        });
        count += 2;

        if (count >= 499) {
            batch = db.batch();
            batches.push(batch);
            count = 0;
        }
        return;
    });

    await Promise.all(batches.map((v) => v.commit()));

    enviarLog(
        user,
        request,
        "SALVAR_CLASSE_CSV",
        `Classes cadastradas com sucesso pelo usuário: ${user.uid}`,
    );
    console.log(`Classes cadastradas com sucesso pelo usuário: ${user.uid}`);
    return {
        message: foraDaFaixa.length
            ? `As classes a seguir estavam com a faixa etária inválida: ${foraDaFaixa.join(
                  ",",
              )}`
            : "Classes cadastradas com sucesso!",
    };
});

// === Rótulo da Classe ===
interface RotuloClasseFront {
    dados: { nome: string; idade_minima?: number; idade_maxima?: number };
    rotuloId?: string;
}
export const salvarRotuloClasse = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, user } = await validarUsuario(request);

    if (!isSuperAdmin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const {
        rotuloId,
        dados: { nome, idade_maxima, idade_minima },
    } = request.data as RotuloClasseFront;

    if (!nome || (idade_maxima && typeof idade_minima !== "number")) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const dados = { nome, idade_minima, idade_maxima };

    if (rotuloId) {
        const rotuloRef = db.collection("rotulos_classes").doc(rotuloId);
        const rotuloSnap = await rotuloRef.get();
        const rotuloData = rotuloSnap.data();

        if (!rotuloSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Rótulo não encontrado",
            );
        }

        await rotuloRef.update(dados as any);
        if (nome !== rotuloData?.nome) {
            const classes = await db
                .collection("classes")
                .where("rotuloId", "==", rotuloId)
                .get();
            await Promise.all(
                classes.docs.map((v) => v.ref.update({ rotuloNome: nome })),
            );
        }

        enviarLog(
            user,
            request,
            "SALVAR_ROTULO_CLASSE",
            `Rótulo foi atualizado com sucesso pelo usuário: ${user.uid}`,
        );

        return { message: "Rótulo atualizado com sucesso" };
    }

    const dadosParaSalvar = { ...dados, ministerioId: user.ministerioId };
    await db.collection(Cll.ROTULOS).add(dadosParaSalvar);

    enviarLog(
        user,
        request,
        "SALVAR_ROTULO_CLASSE",
        `Rótulo foi criado com sucesso pelo usuário: ${user.uid}`,
    );

    return { ...dadosParaSalvar };
});

// Igreja
interface IgrejaFront {
    nome: string;
}
interface Igreja {
    nome: string;
    ministerioId: string;
}

interface IgrejaCSVFront {
    csv: { nome: string }[];
    igrejaId: undefined;
}

export const salvarIgreja = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    if (!isSuperAdmin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Somente o super admin pode cadastrar igrejas",
        );
    }

    const { igrejaId } = request.data;
    const dados = request.data.dados as IgrejaFront;

    if (!dados) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Os dados da igreja são obrigatórios",
        );
    }

    if (igrejaId) {
        const igrejaRef = db.collection("igrejas").doc(igrejaId);
        const igrejaSnap = await igrejaRef.get();

        if (!igrejaSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "A igreja não foi encontrada",
            );
        }

        await igrejaRef.update({ nome: dados.nome });

        enviarLog(
            user,
            request,
            "SALVAR_IGREJA",
            `Igreja editada pelo usuário : ${user.uid}`,
        );

        return { id: igrejaSnap.id, ...igrejaSnap.data(), nome: dados.nome };
    }

    const newIgrejaRef = db.collection(Cll.IGREJAS).doc();
    const batch = db.batch();

    const caches = [
        Cll.CACHE_ALUNOS,
        Cll.CACHE_CLASSES,
        Cll.CACHE_USUARIOS,
        Cll.CACHE_MEMBROS,
        Cll.CACHE_ANIVERSARIANTES,
    ];
    batch.create(newIgrejaRef, {
        nome: dados.nome,
        ministerioId: user.ministerioId,
    });
    caches.forEach((v) => {
        const obj = {
            igrejaId: newIgrejaRef.id,
            ministerioId: user.ministerioId,
            lista: {},
        } as any;

        if (v === Cll.CACHE_ANIVERSARIANTES) obj["vazio"] = true;

        batch.create(db.collection(v).doc(newIgrejaRef.id), obj);
    });

    await batch.commit();

    enviarLog(
        user,
        request,
        "SALVAR_IGREJA",
        `Igreja criada pelo usuário : ${user.uid}`,
        {
            newIgrejaRef,
        },
    );

    return {
        id: newIgrejaRef.id,
        nome: dados.nome,
        ministerioId: user.ministerioId,
    };
});
export const onIgrejaUpdate = onDocumentUpdated(
    "igrejas/{igrejaId}",
    async (event) => {
        const dadosAntigos = event.data?.before.data() as Igreja;
        const dadosNovos = event.data?.after.data() as Igreja;

        if (!dadosAntigos || !dadosNovos) {
            console.log("Dados ausentes encerrando trigger");
            return;
        }

        if (dadosNovos.nome === dadosAntigos.nome) {
            console.log("Os nomes não mudaram, encerrando trigger");
            return;
        }

        const { igrejaId } = event.params;
        const novoNome = { igrejaNome: dadosNovos.nome };
        const db = admin.firestore();

        console.log(
            `Nome ${dadosAntigos.nome}, foi alterado para ${dadosNovos.nome}`,
        );

        const collections = [
            [Cll.ALUNOS, Cll.CACHE_ALUNOS],
            [Cll.CLASSES, Cll.CACHE_CLASSES],
            [Cll.LICOES],
            [Cll.MATRICULAS, Cll.CACHE_MATRICULAS],
            [Cll.MEMBROS, Cll.CACHE_MEMBROS],
            [Cll.REGISTROS_AULA],
            [Cll.USUARIOS, Cll.CACHE_USUARIOS],
            [Cll.VISITANTES],
            [Cll.CACHE_LICAO],
        ];
        const field = "igrejaId";
        const refs: any[] = [];
        let batch = db.batch();
        const batches = [batch];
        let count = 0;

        for (const [col, cache] of collections) {
            const item = await db
                .collection(col)
                .where(field, "==", igrejaId)
                .get();
            item.forEach((v) => {
                refs.push(v.ref);

                if (cache) {
                    const doc = db.collection(cache);
                    const key =
                        col !== "matriculas"
                            ? igrejaId
                            : `${igrejaId}_${v.data()?.licaoId}`;

                    batch.update(doc.doc(key), {
                        [`lista.${v.id}.igrejaNome`]: dadosNovos.nome,
                    });

                    count++;
                    if (count >= 499) {
                        batch = db.batch();
                        batches.push(batch);
                        count = 0;
                    }
                }
            });
        }

        for (let ref of refs) {
            batch.update(ref, novoNome);
            count++;
            if (count >= 499) {
                batch = db.batch();
                batches.push(batch);
                count = 0;
            }
        }

        await Promise.all(batches.map((v) => v.commit()));
        console.log("Ufa, fan-out finalizado, igreja alterada!");
    },
);
export const deletarIgreja = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, user } = await validarUsuario(request);
    const { igrejaId } = request.data;

    if (!igrejaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const igrejaRef = db.collection("igrejas").doc(igrejaId);
    const igrejaSnap = await igrejaRef.get();

    if (!igrejaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada",
        );
    }

    if (
        !isSuperAdmin ||
        igrejaSnap.data()?.ministerioId !== user.ministerioId
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }

    try {
        const refs = [igrejaRef];

        const colecoes = [
            Cll.ALUNOS,
            Cll.CACHE_ALUNOS,
            Cll.CLASSES,
            Cll.CACHE_CLASSES,
            Cll.LICOES,
            Cll.CACHE_LICAO,
            Cll.MATRICULAS,
            Cll.CACHE_MATRICULAS,
            Cll.MEMBROS,
            Cll.CACHE_MEMBROS,
            Cll.REGISTROS_AULA,
            Cll.USUARIOS,
            Cll.CACHE_USUARIOS,
            Cll.VISITANTES,
            Cll.PEDIDOS_RESPOSTA,
            Cll.RELATORIOS_TRIMESTRE,
            Cll.NOTIFICACOES,
        ];

        const promises = await Promise.all(
            colecoes.map((v) =>
                db.collection(v).where("igrejaId", "==", igrejaId).get(),
            ),
        );

        const promisesRegistros = promises.map(async (v) => {
            if (!v.empty) {
                for (const doc of v.docs) {
                    refs.push(doc.ref);

                    const subColecoes = await doc.ref.listCollections();
                    if (subColecoes.length) {
                        for (const sub of subColecoes) {
                            (await sub.get()).docs.forEach((v) =>
                                refs.push(v.ref),
                            );
                        }
                    }
                }
            }
        });

        await Promise.all(promisesRegistros);

        const usuariosSnap = await db
            .collection(Cll.USUARIOS)
            .where("igrejaId", "==", igrejaId)
            .get();
        const promisesUsers: any[] = [];
        if (!usuariosSnap.empty) {
            usuariosSnap.forEach((v) => {
                const usuario = v.data();
                const uid = usuario.uid;
                if (uid) promisesUsers.push(admin.auth().deleteUser(uid));
                refs.push(v.ref);
            });
        }

        let count = 0;
        let batch = db.batch();
        const batchs = [batch];
        for (let ref of refs) {
            batch.delete(ref);
            count++;

            if (count >= 499) {
                batch = db.batch();
                batchs.push(batch);
                count = 0;
            }
        }

        await Promise.all([...promisesUsers, ...batchs.map((v) => v.commit())]);

        enviarLog(
            user,
            request,
            "DELETAR_IGREJA",
            `Igreja e ${
                refs.length - 1
            } dados associados, foram deletados com sucesso pelo usuário : ${
                user.uid
            }`,
            { igreja: igrejaSnap.data() },
        );

        return {
            message: "Igreja e dados associados foram deletados com sucesso!",
        };
    } catch (error) {
        console.log("Erro ao deletar igreja", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar a igreja. Tente novamente",
        );
    }
});
export const salvarIgrejaCSV = functions.https.onCall(async (request) => {
    const { isSuperAdmin, user, db } = await validarUsuario(request);

    if (!isSuperAdmin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }
    const { csv } = request.data as IgrejaCSVFront;

    if (!csv || !csv?.length) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    let batch = db.batch();
    const batchs = [batch];
    let count = 0;

    const caches = [
        Cll.CACHE_ALUNOS,
        Cll.CACHE_CLASSES,
        Cll.CACHE_USUARIOS,
        Cll.CACHE_MEMBROS,
    ];

    csv.forEach((v) => {
        const { nome } = v;
        if (!nome) return;
        const newIgrejaRef = db.collection(Cll.IGREJAS).doc();

        batch.set(newIgrejaRef, {
            nome,
            ministerioId: user.ministerioId,
        });
        caches.forEach((v) =>
            batch.create(db.collection(v).doc(newIgrejaRef.id), {
                igrejaId: newIgrejaRef.id,
                ministerioId: user.ministerioId,
                lista: {},
            }),
        );

        count += caches.length + 1;

        if (count >= 499) {
            batch = db.batch();
            batchs.push(batch);
            count = 0;
        }
    });

    await Promise.all(batchs.map((v) => v.commit()));

    enviarLog(
        user,
        request,
        "SALVAR_IGREJA_CSV",
        `Igrejas cadastradas com sucesso pelo usuário: ${user.uid}`,
    );
    console.log(`Igrejas cadastradas com sucesso pelo usuário: ${user.uid}`);
    return {
        message: "Igrejas cadastradas com sucesso!",
    };
});

// usuario
interface UsuarioFront {
    nome: string;
    email: string;
    senha?: string;
    role: Roles;
    igrejaId: string;
    classeId: string | null;
}
interface Usuario extends Omit<UsuarioFront, "senha"> {
    classeNome: string | null;
    igrejaNome: string;
    ministerioId: string;
}

export const salvarUsuario = functions.https.onCall(async (request) => {
    const { db, isSecretario, user } = await validarUsuario(request);
    const { usuarioId } = request.data;
    const dados = request.data.dados as UsuarioFront;

    if (
        !dados ||
        !dados.nome ||
        !dados.email ||
        !dados.role ||
        !dados.igrejaId
    ) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados incompletos",
        );
    }

    const igreja = await db.collection(Cll.IGREJAS).doc(dados.igrejaId).get();
    if (!igreja.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não foi encontrada",
        );
    }

    const podeCriar =
        user.role === Roles.PASTOR_PRESIDENTE ||
        (user.role === Roles.SUPER_ADMIN &&
            dados.role !== Roles.PASTOR_PRESIDENTE) ||
        (user.role === Roles.PASTOR &&
            dados.role !== Roles.SUPER_ADMIN &&
            dados.role !== Roles.PASTOR_PRESIDENTE) ||
        (user.role === Roles.SECRETARIO_CONGREGACAO &&
            dados.role !== Roles.PASTOR &&
            dados.role !== Roles.SUPER_ADMIN &&
            dados.role !== Roles.PASTOR_PRESIDENTE) ||
        (user.role === Roles.PROFESSOR &&
            dados.role !== Roles.SECRETARIO_CONGREGACAO &&
            dados.role !== Roles.PASTOR &&
            dados.role !== Roles.SUPER_ADMIN &&
            dados.role !== Roles.PASTOR_PRESIDENTE) ||
        (user.role === Roles.SECRETARIO_CLASSE &&
            dados.role === Roles.SECRETARIO_CLASSE);

    if (igreja.data()?.ministerioId !== user.ministerioId || !podeCriar) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Usuário não tem para usuários com este cargo",
        );
    }

    if (!usuarioId && (!dados.senha || dados.senha.length < 6)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "A senha precisa ter ao menos 6 caracteres",
        );
    }

    let classe;
    if (dados.classeId) {
        classe = await db.collection(Cll.CLASSES).doc(dados.classeId).get();
        if (!classe.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe não encontrada",
            );
        }
    }

    const dadosAtualizados: any | Usuario = {
        classeId: dados.classeId || null,
        classeNome: classe?.data()?.["nome"] || null,
        email: dados.email,
        igrejaId: dados.igrejaId,
        igrejaNome: igreja.data()!.nome,
        ministerioId: user.ministerioId,
        nome: dados.nome,
        role: dados.role,
    };

    if (usuarioId) {
        const usuarioRef = db.collection("usuarios").doc(usuarioId);
        const usuarioSnap = await usuarioRef.get();
        const usuarioData = usuarioSnap.data() as Usuario;

        if (!usuarioSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "O usuário não foi encontrado",
            );
        }

        if (usuarioSnap.id === user.uid && dados.role !== user.role) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "O usuário não pode alterar seu próprio cargo",
            );
        }

        if (dados.senha && !isSecretario)
            admin.auth().updateUser(usuarioSnap.id, { password: dados.senha });
        if (dados.email && !isSecretario)
            admin.auth().updateUser(usuarioSnap.id, { email: dados.email });

        if (isSecretario) delete dadosAtualizados.email;
        const igrejaMudou = dadosAtualizados.igrejaId !== usuarioData?.igrejaId;

        await Promise.all([
            usuarioRef.update(dadosAtualizados),
            db
                .collection(Cll.CACHE_USUARIOS)
                .doc(igreja.id)
                .update({
                    [`lista.${usuarioId}`]: {
                        ...usuarioData,
                        ...(igrejaMudou
                            ? { classeId: null, classeNome: null }
                            : undefined),
                        ...dadosAtualizados,
                        id: usuarioId,
                    },
                }),
            igrejaMudou
                ? db
                      .collection(Cll.CACHE_USUARIOS)
                      .doc(usuarioData?.igrejaId)
                      .update({ [`lista.${usuarioId}`]: FieldValue.delete() })
                : undefined,
        ]);

        enviarLog(
            user,
            request,
            "SALVAR_USUARIO",
            `Usuário editado pelo usuário ${user.uid}`,
            { usuario: usuarioSnap.data() },
        );

        return {
            ...usuarioSnap.data(),
            id: usuarioSnap.id,
            uid: usuarioRef.id,
            ...dadosAtualizados,
        };
    }

    let newAuth;
    try {
        newAuth = await admin
            .auth()
            .createUser({ email: dados.email, password: dados.senha });
        const newUser = {
            ...dadosAtualizados,
            uid: newAuth.uid,
            id: newAuth.uid,
        };
        await Promise.all([
            db.collection(Cll.USUARIOS).doc(newAuth.uid).set(newUser),
            db
                .collection(Cll.CACHE_USUARIOS)
                .doc(igreja.id)
                .update({
                    [`lista.${newAuth.uid}`]: {
                        ...newUser,
                        id: newAuth.uid,
                    },
                }),
        ]);

        enviarLog(
            user,
            request,
            "SALVAR_USUARIO",
            `Usuário salvo pelo usuário ${user.uid}`,
            { newUser },
        );

        return newUser;
    } catch (err: any) {
        console.log("Erro ao criar usuário, iniciando rollback...", err);

        if (newAuth) {
            admin.auth().deleteUser(newAuth.uid);
            console.log("Excluindo usuário fantasma");
        }

        if (err?.code === "auth/email-already-exists") {
            throw new functions.https.HttpsError(
                "already-exists",
                "Este e-mail já está em uso por outra conta.",
            );
        }

        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao criar o usuário. Tente novamente.",
        );
    }
});
export const deletarUsuario = functions.https.onCall(async (request) => {
    const { user, db, isSecretario, isAdmin, isSuperAdmin } =
        await validarUsuario(request);

    const { usuarioId } = request.data;

    if (!usuarioId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const usuarioRef = db.collection(Cll.USUARIOS).doc(usuarioId);
    const usuario = await usuarioRef.get();

    if (!usuario.exists) {
        await admin
            .auth()
            .deleteUser(usuarioId)
            .catch(() => console.log("Usuário já não existia no Auth."));
        throw new functions.https.HttpsError(
            "not-found",
            "Usuário não encontrado",
        );
    }

    if (
        isSecretario ||
        (isAdmin && user.igrejaId !== usuario.data()?.igrejaId) ||
        (isSuperAdmin && usuario.data()?.ministerioId !== user.ministerioId) ||
        (!isSuperAdmin &&
            (usuario.data()?.role === Roles.PASTOR_PRESIDENTE ||
                usuario.data()?.role === Roles.SUPER_ADMIN))
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const uid = usuario.data()?.uid;
    if (!uid) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "O usuário cadastrada está invalido.",
        );
    }

    try {
        await Promise.all([
            usuarioRef.delete(),
            admin.auth().deleteUser(usuarioId),
            db
                .collection(Cll.CACHE_USUARIOS)
                .doc(usuario.data()?.igrejaId)
                .update({
                    [`lista.${uid}`]: FieldValue.delete(),
                }),
        ]);

        enviarLog(
            user,
            request,
            "DELETAR_USUARIO",
            `O usuário ${usuarioId} foi deletado pelo usuário ${user.uid}.`,
        );

        return { message: "O usuário foi deletado com sucesso" };
    } catch (error: any) {
        console.log("Erro ao deletar usuário", error);

        if (error.code === "auth/user-not-found") {
            await db.collection("usuarios").doc(usuarioId).delete();
            return {
                message: "Usuário fantasma do Firestore removido com sucesso.",
            };
        }

        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar o usuário. Tente novamente.",
        );
    }
});

interface LicaoFront {
    titulo: string;
    numero_aulas: number;
    data_inicio: string;
    img?: string;
    alunosSelecionados: {
        alunoId: string;
        possui_revista: boolean;
    }[];
    isInativa: boolean;
    trimestre: number;
}

interface Licao {
    id: string;
    ativo: boolean;
    img: string | null;
    classeId: string;
    classeNome: string;
    data_fim: Timestamp;
    data_inicio: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    numero_aulas: number;
    titulo: string;
    numero_trimestre: string;
    total_matriculados: number;
}

function addTrofeusAluno(
    db: admin.firestore.Firestore,
    alunoId: string,
    aluno: {
        nome: string;
        presente: number;
        atrasado: number;
        falta: number;
        falta_justificada: number;
        porcentagem: number;
        matriculado: boolean;
        trouxe_biblia: number;
        nao_trouxe_biblia: number;
        porcentagem_biblia: number;
        trouxe_revista: number;
        nao_trouxe_revista: number;
        porcentagem_revista: number;
    },
    batch: admin.firestore.WriteBatch,
    licao: Licao,
    licaoId: string,
) {
    const {
        porcentagem,
        porcentagem_biblia,
        porcentagem_revista,
        presente,
        atrasado,
        falta,
        falta_justificada,
        trouxe_biblia,
        trouxe_revista,
    } = aluno;
    const alunoPortalRef = db.collection(Cll.CACHE_PORTAL_ALUNO).doc(alunoId);
    const licaoNome = licao.titulo;
    const { numero_trimestre, data_inicio, classeId, classeNome } = licao;
    const trofeuBase = {
        [`detalhes`]: {
            [licaoId]: {
                trimestre: `${numero_trimestre}º Trimestre de ${data_inicio.toDate().getFullYear()}`,
                classeId,
                classeNome,
                licaoNome,
                licaoId,
                data: Date.now(),
            },
        },
        tipo: "automatica",
        multiplicador: FieldValue.increment(1),
    };

    // Comum
    if (porcentagem >= 50) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    semente_plantada: {
                        icon: "faSeedling",
                        titulo: "Semente Plantada",
                        descricao:
                            "Você esteve presente em pelo menos metade das aulas do trimestre!",
                        raridade: "comum",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (porcentagem_revista >= 50) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    servo_preparado: {
                        icon: "faBookOpen",
                        titulo: "Servo Preparado",
                        descricao:
                            "Você não veio de mãos vazias. Demonstrou zelo trazendo sua revista para aprender mais da Palavra.",
                        raridade: "comum",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (porcentagem_biblia >= 50) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    leitor_fiel: {
                        icon: "faBookOpenReader",
                        titulo: "Leitor Fiel",
                        descricao:
                            "Você não veio de mãos vazias. Levou a bíblia em mais de 50% das aulas em que esteve presente.",
                        raridade: "comum",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }

    // Rara
    if (porcentagem >= 70 && atrasado === 0) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    mordomo_tempo: {
                        icon: "faStopwatch",
                        titulo: "Mordomo do Tempo",
                        descricao:
                            "Pontual e fiel. Você não se atrasou nenhuma vez e manteve uma ótima frequência.",
                        raridade: "rara",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (porcentagem >= 80) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    coluna_fiel: {
                        icon: "faChurch",
                        titulo: "Coluna Fiel",
                        descricao:
                            "Você se manteve firme na casa do Senhor. Sua presença constante revela compromisso e perseverança.",
                        raridade: "rara",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (falta === 0 && falta_justificada >= 2) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    diplomata: {
                        icon: "faUserTie",
                        titulo: "O Diplomata",
                        descricao:
                            "A vida foi cheia de imprevistos neste trimestre, mas você foi impecável na comunicação. Você não teve nenhuma falta sem aviso prévio!",
                        raridade: "rara",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (presente + atrasado === trouxe_biblia && porcentagem >= 70) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    espada_afiada: {
                        icon: "faBookBible",
                        titulo: "Espada Afiada",
                        descricao:
                            "A Palavra sempre na mão. Você trouxe a Bíblia em todas as aulas que compareceu.",
                        raridade: "rara",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (presente + atrasado === trouxe_revista && porcentagem >= 70) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    discipulo_dedicado: {
                        icon: "faBookBookmark",
                        titulo: "Discípulo Dedicado",
                        descricao:
                            "Sempre preparado para aprender. Você trouxe sua revista em todas as aulas que compareceu.",
                        raridade: "rara",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }

    // Épica
    if (falta + falta_justificada === 0) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    firme_rocha: {
                        icon: "faMountain",
                        titulo: "Firme na Rocha",
                        descricao:
                            "100% de frequência! Você não perdeu um único domingo neste trimestre.",
                        raridade: "epica",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (falta + falta_justificada === 1) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    quase_perfeito: {
                        icon: "faBatteryThreeQuarters",
                        titulo: "Quase Perfeito",
                        descricao:
                            "Faltou apenas a um único domingo em todo o trimestre. Quase gabaritou!",
                        raridade: "epica",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
    if (presente + atrasado === 0) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    modo_jonas: {
                        icon: "faGhost",
                        titulo: "Modo Jonas",
                        descricao:
                            "Você conseguiu a proeza de não aparecer em nenhum domingo do trimestre. Fugiu para Társis? Um grande peixe te engoliu? Sentimos muito a sua falta!",
                        raridade: "epica",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }

    // Lendário
    if (
        porcentagem >= 100 &&
        porcentagem_biblia >= 100 &&
        porcentagem_revista >= 100
    ) {
        batch.set(
            alunoPortalRef,
            {
                ["conquistas"]: {
                    bereano: {
                        icon: "faFreeCodeCamp",
                        titulo: "O Bereano",
                        descricao:
                            "Exemplo entre todos! Nenhuma falta, nenhum atraso, e Bíblia e Revista na mão em todos os domingos.",
                        raridade: "lendaria",
                        ...trofeuBase,
                    },
                },
            },
            { merge: true },
        );
    }
}

export const salvarNovoTrimestre = functions.https.onCall(async (request) => {
    const { user, isSuperAdmin, isSecretario, db } =
        await validarUsuario(request);

    const { licaoId, classeId, igrejaId } = request.data;
    const dados = request.data.dados as LicaoFront;

    if (
        !classeId ||
        !igrejaId ||
        !dados.titulo ||
        !dados.data_inicio ||
        !dados.numero_aulas ||
        typeof dados.isInativa !== "boolean"
    ) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados invalidos ou ausentes",
        );
    }

    const igreja = await db.collection(Cll.IGREJAS).doc(igrejaId).get();
    if (!igreja.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada.",
        );
    }
    const naoPodeCriar =
        (!isSuperAdmin && igrejaId !== user.igrejaId) ||
        (isSecretario && classeId !== user.classeId) ||
        (isSuperAdmin && user.ministerioId !== igreja.data()?.ministerioId);
    if (naoPodeCriar) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para criar essa lição",
        );
    }

    const classe = await db.collection(Cll.CLASSES).doc(classeId).get();
    if (!classe.exists || classe.data()?.igrejaId !== igrejaId) {
        throw new functions.https.HttpsError(
            "not-found",
            "Classe inválida ou não pertence à igreja selecionada.",
        );
    }

    const dataInicio = new Date(dados.data_inicio + "T12:00:00");
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + (dados.numero_aulas - 1) * 7);

    const dadosParaSalvar = {
        ativo: !dados.isInativa,
        classeId,
        classeNome: classe.data()!.nome,
        data_inicio: Timestamp.fromDate(dataInicio),
        data_fim: Timestamp.fromDate(dataFim),
        igrejaId,
        igrejaNome: igreja.data()!.nome,
        img: dados.img || null,
        ministerioId: user.ministerioId,
        numero_aulas: dados.numero_aulas,
        numero_trimestre: dados.trimestre,
        titulo: dados.titulo,
        total_matriculados: dados.alunosSelecionados.length,
    };

    const batch = db.batch();
    const batchConquistas = db.batch();

    try {
        const alunosIds = dados.alunosSelecionados.map((a) => a.alunoId);

        if (licaoId) {
            const licaoRef = db.collection(Cll.LICOES).doc(licaoId);
            const cacheRef = db
                .collection(Cll.CACHE_LICAO)
                .doc(`${igrejaId}_${licaoId}`);

            const [licao, cacheSnap] = await Promise.all([
                licaoRef.get(),
                cacheRef.get(),
            ]);

            if (!licao.exists) {
                throw new functions.https.HttpsError(
                    "not-found",
                    "A lição não foi encontrada",
                );
            }

            const cache = cacheSnap.data() as CacheLicaoInterface;

            const matriculasCache = await db
                .collection(Cll.CACHE_MATRICULAS)
                .doc(`${igrejaId}_${licaoId}`)
                .get();
            if (!matriculasCache.exists) {
                await db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${igrejaId}_${licaoId}`)
                    .set({
                        igrejaId,
                        ministerioId: dadosParaSalvar.ministerioId,
                        licaoId,
                        lista: {},
                    });
            }

            const todasMatriculasMap = new Map();
            Object.entries(matriculasCache.data()?.lista || {}).forEach(
                ([_, v]) => {
                    const matricula = v as any;
                    todasMatriculasMap.set(matricula.alunoId, {
                        id: matricula.id,
                        alunoId: matricula.alunoId,
                    });
                },
            );

            const alunosSelecionadosMap = new Map(
                dados.alunosSelecionados.map((v) => [v.alunoId, v]),
            );
            cache.total_matriculados = dadosParaSalvar.total_matriculados;

            todasMatriculasMap.forEach((v) => {
                const matriculaRef = db.collection(Cll.MATRICULAS).doc(v.id);
                const cacheMatriculaRef = db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${igrejaId}_${licaoId}`);

                if (!alunosSelecionadosMap.has(v.alunoId)) {
                    batch.delete(matriculaRef);
                    batch.update(cacheMatriculaRef, {
                        [`lista.${v.id}`]: FieldValue.delete(),
                    });

                    if (cache.detalhes_aluno[v.alunoId]) {
                        cache.detalhes_aluno[v.alunoId].matriculado = false;
                    }
                } else if (alunosSelecionadosMap.has(v.alunoId)) {
                    const p = alunosSelecionadosMap.get(
                        v.alunoId,
                    )?.possui_revista;
                    batch.update(matriculaRef, {
                        possui_revista: p,
                    });
                    batch.update(cacheMatriculaRef, {
                        [`lista.${v.id}.possui_revista`]: p,
                    });
                }
            });

            const novosAlunos = dados.alunosSelecionados.filter(
                (v) => !todasMatriculasMap.get(v.alunoId),
            );

            const alunosMap = new Map();
            if (novosAlunos.length > 0) {
                const alunosPromises = [];
                for (let i = 0; i < novosAlunos.length; i += 30) {
                    const chunk = novosAlunos
                        .slice(i, i + 30)
                        .map((v) => v.alunoId);
                    alunosPromises.push(
                        db
                            .collection("alunos")
                            .where(
                                admin.firestore.FieldPath.documentId(),
                                "in",
                                chunk,
                            )
                            .get(),
                    );
                }
                const alunosSnap = await Promise.all(alunosPromises);
                const todosOsAlunos = alunosSnap.flatMap((snap) => snap.docs);

                todosOsAlunos.forEach((doc) =>
                    alunosMap.set(doc.id, doc.data()),
                );
                novosAlunos.forEach((aluno) => {
                    const alunoData = alunosMap.get(aluno.alunoId);
                    if (alunoData) {
                        const matriculaRef = db
                            .collection(Cll.MATRICULAS)
                            .doc();
                        const cacheMatriculasRef = db
                            .collection(Cll.CACHE_MATRICULAS)
                            .doc(`${igrejaId}_${licaoId}`);
                        const dadosMatricula = {
                            alunoId: aluno.alunoId,
                            alunoNome: alunoData.nome_completo,
                            classeId,
                            classeNome: classe.data()!.nome,
                            classeRef: classe.ref,
                            data_matricula: Timestamp.now(),
                            igrejaId,
                            igrejaNome: igreja.data()!.nome,
                            licaoId: licaoId,
                            licaoNome: dados.titulo,
                            licaoRef: licao.ref,
                            ministerioId: user.ministerioId,
                            possui_revista: aluno.possui_revista,
                        };

                        batch.set(matriculaRef, dadosMatricula);
                        batch.update(cacheMatriculasRef, {
                            [`lista.${matriculaRef.id}`]: {
                                ...dadosMatricula,
                                id: matriculaRef.id,
                            },
                        });
                    }

                    const detalhes = cache.detalhes_aluno;
                    if (detalhes[aluno.alunoId]) {
                        detalhes[aluno.alunoId].nome = alunosMap.get(
                            aluno.alunoId,
                        )?.nome_completo;
                        detalhes[aluno.alunoId].matriculado = true;
                    } else
                        detalhes[aluno.alunoId] = {
                            nome: alunosMap.get(aluno.alunoId)?.nome_completo,
                            presente: 0,
                            atrasado: 0,
                            falta: 0,
                            falta_justificada: 0,
                            porcentagem: 0,
                            matriculado: true,
                            trouxe_biblia: 0,
                            nao_trouxe_biblia: 0,
                            porcentagem_biblia: 0,
                            trouxe_revista: 0,
                            nao_trouxe_revista: 0,
                            porcentagem_revista: 0,
                        };

                    if (licao.data()?.ativo) {
                        batch.set(
                            db
                                .collection(Cll.CACHE_PORTAL_ALUNO)
                                .doc(aluno.alunoId),
                            { ultimaLicaoId: licaoId },
                            { merge: true },
                        );
                    }
                });
            }
            batch.update(cacheRef, { ...cache });

            dadosParaSalvar.ativo = licao.data()!.ativo;
            batch.update(licaoRef, { dadosParaSalvar, primeiroAcesso: false });

            await batch.commit();

            enviarLog(
                user,
                request,
                "SALVAR_NOVO_TRIMESTRE",
                `Trimestre editado pelo usuário ${user.uid}`,
                { dadosParaSalvar, licao: licao.data() },
            );

            return { id: licaoId, ...dadosParaSalvar };
        }

        const licaoAtivaQuery = db
            .collection(Cll.LICOES)
            .where("classeId", "==", classeId)
            .where("ativo", "==", true)
            .limit(1);
        const licaoAtivaSnap = await licaoAtivaQuery.get();
        const novaLicaoRef = db.collection(Cll.LICOES).doc();
        if (licaoAtivaSnap.empty) dadosParaSalvar.ativo = true;
        else {
            const licaoAtivaDoc = licaoAtivaSnap.docs[0];
            const licaoAtivaData = licaoAtivaDoc.data() as Licao;
            let isInativa = false;
            if (dataInicio >= licaoAtivaData.data_fim.toDate()) {
                dadosParaSalvar.ativo = true;
                batch.update(licaoAtivaDoc.ref, { ativo: false });
                isInativa = true;
            } else if (dataFim <= licaoAtivaData.data_inicio.toDate())
                dadosParaSalvar.ativo = false;
            else if (dadosParaSalvar.ativo) {
                batch.update(licaoAtivaDoc.ref, { ativo: false });
                isInativa = true;
            }

            if (isInativa) {
                const licaoCacheSnap = await db
                    .collection("cache_licao")
                    .doc(`${igrejaId}_${licaoAtivaDoc.id}`)
                    .get();
                const licaoCacheData =
                    licaoCacheSnap.data() as CacheLicaoInterface;

                const { detalhes_aluno, detalhes_aulas } = licaoCacheData;
                if (Object.keys(detalhes_aulas).length)
                    for (const alunoId in detalhes_aluno) {
                        addTrofeusAluno(
                            db,
                            alunoId,
                            detalhes_aluno[alunoId],
                            batchConquistas,
                            licaoAtivaData,
                            licaoAtivaDoc.id,
                        );
                    }
            }
        }
        batch.set(novaLicaoRef, dadosParaSalvar);

        for (let i = 0; i < dados.numero_aulas; i++) {
            const dataPrevista = new Date(dataInicio);
            dataPrevista.setDate(dataPrevista.getDate() + i * 7);

            const aulaRef = novaLicaoRef.collection("aulas").doc(String(i + 1));
            batch.set(aulaRef, {
                numero_aula: i + 1,
                data_prevista: Timestamp.fromDate(dataPrevista),
                realizada: false,
                registroRef: null,
            });
        }
        const alunosMap = new Map();
        if (dados.alunosSelecionados?.length > 0) {
            const alunosPromises = [];
            for (let i = 0; i < alunosIds.length; i += 30) {
                const chunk = alunosIds.slice(i, i + 30);
                alunosPromises.push(
                    db
                        .collection("alunos")
                        .where(
                            admin.firestore.FieldPath.documentId(),
                            "in",
                            chunk,
                        )
                        .get(),
                );
            }
            const alunosSnap = await Promise.all(alunosPromises);
            const todosOsAlunos = alunosSnap.flatMap((snap) => snap.docs);
            todosOsAlunos.forEach((doc) => alunosMap.set(doc.id, doc.data()));

            const matriculas: any = {};
            dados.alunosSelecionados.forEach((aluno) => {
                const alunoData = alunosMap.get(aluno.alunoId);
                if (alunoData) {
                    const matriculaRef = db.collection(Cll.MATRICULAS).doc();
                    const dadosMatricula = {
                        alunoId: aluno.alunoId,
                        alunoNome: alunoData.nome_completo,
                        classeId,
                        classeNome: classe.data()!.nome,
                        classeRef: classe.ref,
                        data_matricula: Timestamp.now(),
                        igrejaId,
                        igrejaNome: igreja.data()!.nome,
                        licaoId: novaLicaoRef.id,
                        licaoNome: dados.titulo,
                        licaoRef: novaLicaoRef,
                        ministerioId: user.ministerioId,
                        possui_revista: aluno.possui_revista,
                    };

                    batch.set(matriculaRef, dadosMatricula);
                    matriculas[matriculaRef.id] = {
                        ...dadosMatricula,
                        id: matriculaRef.id,
                    };
                }

                batchConquistas.set(
                    db.collection(Cll.CACHE_PORTAL_ALUNO).doc(aluno.alunoId),
                    {
                        ultimaLicaoId: novaLicaoRef.id,
                        historico: {
                            [novaLicaoRef.id]: {
                                ano: dadosParaSalvar.data_inicio
                                    .toDate()
                                    .getFullYear(),
                                classeId: dadosParaSalvar.classeId,
                                classeNome: dadosParaSalvar.classeNome,
                                data_fim: dadosParaSalvar.data_fim.toMillis(),
                                data_inicio:
                                    dadosParaSalvar.data_inicio.toMillis(),
                                licaoId: novaLicaoRef.id,
                                titulo: dadosParaSalvar.titulo,
                            },
                        },
                    },
                    { merge: true },
                );
            });
            batch.set(
                db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${igrejaId}_${novaLicaoRef.id}`),
                {
                    igrejaId,
                    ministerioId: dadosParaSalvar.ministerioId,
                    licaoId: novaLicaoRef.id,
                    lista: matriculas,
                },
                { merge: true },
            );
        } else
            batch.set(
                db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${igrejaId}_${novaLicaoRef.id}`),
                {
                    igrejaId,
                    ministerioId: dadosParaSalvar.ministerioId,
                    licaoId: novaLicaoRef.id,
                    lista: {},
                },
                { merge: true },
            );

        const trimestre = {
            ano: dataInicio.getFullYear(),
            data_fim: dadosParaSalvar.data_fim,
            data_inicio: dadosParaSalvar.data_inicio,
            ministerioId: dadosParaSalvar.ministerioId,
            nome: `${
                dadosParaSalvar.numero_trimestre
            }º Trimestre de ${dataInicio.getFullYear()}`,
            numero_trimestre: dadosParaSalvar.numero_trimestre,
        };
        const idTrimestre = `${dadosParaSalvar.ministerioId}-${dataInicio
            .toLocaleDateString("pt-BR")
            .replace(/\//g, "-")}-${dataFim
            .toLocaleDateString("pt-BR")
            .replace(/\//g, "-")}-${dadosParaSalvar.numero_trimestre}`;

        batch.set(db.collection(Cll.TRIMESTRES).doc(idTrimestre), trimestre, {
            merge: true,
        });

        const cache: CacheLicaoInterface = {
            classeId,
            classeNome: classe.data()?.nome,
            data_fim: dadosParaSalvar.data_fim,
            data_inicio: dadosParaSalvar.data_inicio,
            ministerioId: dadosParaSalvar.ministerioId,
            igrejaId,
            igrejaNome: igreja.data()?.nome,
            licaoId: novaLicaoRef.id,
            licaoNome: dadosParaSalvar.titulo,
            pico_presenca: 0,
            total_matriculados: dados.alunosSelecionados?.length,
            total_missoes: 0,
            total_missoes_dinheiro: 0,
            total_missoes_pix: 0,
            total_ofertas: 0,
            total_ofertas_dinheiro: 0,
            total_ofertas_pix: 0,
            detalhes_aulas: {},
            detalhes_aluno: dados.alunosSelecionados.reduce(
                (prev: any, current) => {
                    prev[current.alunoId] = getNewCacheAluno(
                        alunosMap.get(current.alunoId)?.nome_completo,
                        current.alunoId,
                    );
                    return prev;
                },
                {},
            ),
        };
        batch.set(
            db
                .collection(Cll.CACHE_LICAO)
                .doc(`${igrejaId}_${novaLicaoRef.id}`),
            cache,
        );

        await Promise.all([batch.commit(), batchConquistas.commit()]);

        enviarLog(
            user,
            request,
            "SALVAR_NOVO_TRIMESTRE",
            `Trimestre criado pelo usuário ${user.uid}`,
            { dadosParaSalvar },
        );

        return { id: novaLicaoRef.id, ...dadosParaSalvar };
    } catch (error) {
        console.error("Erro ao salvar trimestre:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao salvar o trimestre. Tente novamente.",
        );
    }
});
export const onLicaoUpdate = onDocumentUpdated(
    "licoes/{licaoId}",
    async (event) => {
        const dadosAntigos = event.data?.before?.data() as Licao;
        const dadosNovos = event.data?.after?.data() as Licao;

        if (!dadosAntigos || !dadosNovos) {
            console.log("Dados ausentes. Encerrando a trigger");
            return;
        }

        const dataMudou = !dadosAntigos.data_inicio.isEqual(
            dadosNovos.data_inicio,
        );
        const tituloMudou = dadosAntigos.titulo !== dadosNovos.titulo;

        if (!dataMudou && !tituloMudou) {
            console.log("Nada mudou, encerrando trigger");
            return;
        }

        try {
            const { licaoId } = event.params;
            const db = admin.firestore();
            const batch = db.batch();

            if (tituloMudou) {
                const novoTitulo = { licaoNome: dadosNovos.titulo };

                console.log(
                    `O titulo ${dadosAntigos.titulo} foi alterado para ${dadosNovos.titulo}`,
                );

                const registros = await Promise.all([
                    db
                        .collection(Cll.MATRICULAS)
                        .where("licaoId", "==", licaoId)
                        .get(),
                    db
                        .collection(Cll.CACHE_LICAO)
                        .where("licaoId", "==", licaoId)
                        .get(),
                ]);
                registros.forEach((v) =>
                    v.docs.forEach((v) => batch.update(v.ref, novoTitulo)),
                );

                const cacheMatriculaRef = db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${dadosNovos.igrejaId}_${licaoId}`);
                const cacheMatricula = await cacheMatriculaRef.get();
                const cacheLista = cacheMatricula.data()?.lista;
                for (const key in cacheLista) {
                    cacheLista[key]["licaoNome"] = dadosNovos.titulo;
                }

                batch.update(cacheMatriculaRef, { lista: cacheLista });
            }

            if (dataMudou) {
                console.log(
                    `Data de inicio ${dadosAntigos.data_inicio
                        .toDate()
                        .toLocaleDateString(
                            "pt-BR",
                        )} foi alterada para ${dadosNovos.data_inicio
                        .toDate()
                        .toLocaleDateString("pt-BR")}`,
                );

                const ano = dadosNovos.data_inicio.toDate().getFullYear();
                const trimestre = {
                    ano,
                    data_fim: dadosNovos.data_fim,
                    data_inicio: dadosNovos.data_inicio,
                    ministerioId: dadosNovos.ministerioId,
                    nome: `${dadosNovos.numero_trimestre}º Trimestre de ${ano}`,
                    numero_trimestre: dadosNovos.numero_trimestre,
                };
                const idTrimestre = `${
                    dadosNovos.ministerioId
                }-${dadosNovos.data_inicio
                    .toDate()
                    .toLocaleDateString("pt-BR")
                    .replace(/\//g, "-")}-${dadosNovos.data_fim
                    .toDate()
                    .toLocaleDateString("pt-BR")
                    .replace(/\//g, "-")}-${dadosNovos.numero_trimestre}`;
                batch.set(
                    db.collection("trimestres").doc(idTrimestre),
                    trimestre,
                    { merge: true },
                );

                const cacheLicaoRef = db
                    .collection(Cll.CACHE_LICAO)
                    .doc(`${dadosNovos.igrejaId}_${licaoId}`);
                const cacheLicao = (
                    await cacheLicaoRef.get()
                ).data() as CacheLicaoInterface;
                cacheLicao.data_inicio = dadosNovos.data_inicio;
                cacheLicao.data_fim = dadosNovos.data_fim;

                for (let i = 0; i < dadosNovos.numero_aulas; i++) {
                    const data = dadosNovos.data_inicio.toDate();
                    data.setDate(data.getDate() + i * 7);
                    const dataTimestamp = Timestamp.fromDate(data);

                    const licaoRef = db.collection("licoes").doc(licaoId);
                    const aulaRef = licaoRef
                        .collection("aulas")
                        .doc(String(i + 1));

                    const aula = (await aulaRef.get()).data();

                    batch.update(aulaRef, {
                        data_prevista: dataTimestamp,
                    });

                    if (aula?.realizada) {
                        const dataAntiga = aula.data_prevista
                            ?.toDate()
                            .toLocaleDateString("pt-BR");
                        const dataNova = dataTimestamp
                            .toDate()
                            .toLocaleDateString("pt-BR");

                        cacheLicao.detalhes_aulas[dataNova] = {
                            ...cacheLicao.detalhes_aulas[dataAntiga],
                        };
                        delete cacheLicao.detalhes_aulas[dataAntiga];

                        batch.update(aula.registroRef, {
                            data: dataTimestamp,
                        });
                    }
                }

                batch.update(cacheLicaoRef, {
                    ...cacheLicao,
                });
            }

            await batch.commit();

            console.log("Fan-out finalizado, matricula alterada!");
        } catch (err) {
            console.log("deu esse erro", err);
        }
    },
);
export const deletarLicao = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, isSecretario, user } =
        await validarUsuario(request);

    const { licaoId } = request.data;

    if (!licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const licaoRef = db.collection("licoes").doc(licaoId);
    const licaoSnap = await licaoRef.get();
    if (!licaoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Lição não encontrada",
        );
    }

    if (
        (!isSuperAdmin && licaoSnap.data()?.igrejaId !== user.igrejaId) ||
        (isSecretario && licaoSnap.data()?.classeId !== user.classeId) ||
        (isSuperAdmin && licaoSnap.data()?.ministerioId !== user.ministerioId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão de deletar essa lição",
        );
    }

    if (licaoSnap.data()?.relatorio_enviado === true) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "O relatório já foi enviado, solicite aos administradores do ministério para desbloquear.",
        );
    }

    try {
        let batch = db.batch();
        let count = 1;
        const refs = [licaoRef];
        const aulasRef = licaoRef.collection("aulas");
        const colecoes = [
            Cll.MATRICULAS,
            Cll.CACHE_MATRICULAS,
            Cll.REGISTROS_AULA,
        ];

        const promises = await Promise.all([
            ...colecoes.map((v) =>
                db.collection(v).where("licaoId", "==", licaoId).get(),
            ),
            aulasRef.get(),
        ]);
        const licaoCacheRef = db
            .collection(Cll.CACHE_LICAO)
            .doc(`${licaoSnap.data()?.igrejaId}_${licaoId}`);
        refs.push(licaoCacheRef);

        const licaoCacheSnap = await licaoCacheRef.get();
        const licaoCache = licaoCacheSnap.data() as CacheLicaoInterface;

        for (const doc of promises) {
            for (const v of doc.docs) {
                refs.push(v.ref);

                const sub = await v.ref.listCollections();
                if (sub.length) {
                    for (const s of sub) {
                        (await s.get()).docs.forEach((v) => refs.push(v.ref));
                    }
                }
            }
        }

        const alunos = Object.keys(licaoCache.detalhes_aluno);
        if (alunos.length) {
            alunos.forEach((v) => {
                batch.set(
                    db.collection(Cll.CACHE_PORTAL_ALUNO).doc(v),
                    {
                        historico: { [licaoId]: FieldValue.delete() },
                    },
                    { merge: true },
                );
                count++;
            });
        }
        if (licaoSnap.data()?.ativo) {
            const ultimaLicao = await db
                .collection("licoes")
                .where("classeId", "==", licaoSnap.data()?.classeId)
                .where(
                    admin.firestore.FieldPath.documentId(),
                    "!=",
                    licaoSnap.id,
                )
                .orderBy("data_inicio", "desc")
                .limit(1)
                .get();
            if (!ultimaLicao.empty) {
                const ultimaLicaoDoc = ultimaLicao.docs[0];
                batch.update(ultimaLicaoDoc.ref, { ativo: true });
                count++;

                alunos.forEach((v) => {
                    batch.set(
                        db.collection(Cll.CACHE_PORTAL_ALUNO).doc(v),
                        {
                            ultimaLicaoId: ultimaLicao.docs[0].id,
                        },
                        { merge: true },
                    );
                    count++;
                });
            }
        }
        const batchs = [batch];
        for (let ref of refs) {
            batch.delete(ref);
            count++;

            if (count >= 499) {
                batch = db.batch();
                batchs.push(batch);
                count = 0;
            }
        }

        await Promise.all(batchs.map((v) => v.commit()));

        enviarLog(
            user,
            request,
            "DELETAR_LICAO",
            `A lição ${licaoId} foi deletada com sucesso pelo usuário: $${user.uid}`,
        );

        return { message: "Lição deletada com sucesso" };
    } catch (error) {
        console.log("Erro ao deletar a lição", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar a lição. Tente novamente.",
        );
    }
});

// Chamada
interface ChamadaFront {
    chamada: { [alunoId: string]: string };
    licoesTrazidas: string[];
    bibliasTrazidas: string[];
    totalBiblias: number;
    totalLicoes: number;
    totalAusentes: number;
    totalPresentes: number;
    totalMatriculados: number;
    totalAtrasados: number;
    visitas: number;
    visitasLista: VisitaFront[];
    ofertaDinheiro: number | string;
    ofertaPix: number | string;
    imgsPixOfertas: string[];
    missoesDinheiro: number | string;
    missoesPix: number | string;
    imgsPixMissoes: string[];
    descricao: string;
    data_chamada: string;
}

interface RegistroAulaInterface {
    atrasados: number;
    biblias: number;
    classeId: string;
    classeNome: string;
    data: Timestamp;
    descricao: string;
    igrejaId: string;
    igrejaNome: string;
    licaoId: string;
    licoes_trazidas: number;
    ministerioId: string;
    missoes_total: number;
    ofertas_total: number;
    presentes_chamada: number;
    total_presentes: number;
    total_ausentes: number;
    total_matriculados: number;
    visitas: number;
    visitas_lista: VisitaFront[];
    missoes: { dinheiro: number; pix: number };
    imgsPixMissoes: string[] | null;
    ofertas: { dinheiro: number; pix: number };
    imgsPixOfertas: string[] | null;
    numero_aula: number;
}
interface CacheLicaoInterface {
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    classeId: string;
    classeNome: string;
    licaoId: string;
    licaoNome: string;
    data_inicio: Timestamp;
    data_fim: Timestamp;

    total_ofertas: number;
    total_ofertas_pix: number;
    total_ofertas_dinheiro: number;
    total_missoes: number;
    total_missoes_dinheiro: number;
    total_missoes_pix: number;

    pico_presenca: number;
    total_matriculados: number;
    detalhes_aulas: {
        [data: string]: {
            presentes_chamada: number;
            ausentes: number;
            atrasados: number;
            visitas: number;
            total_presenca: number;
            biblias: number;
            licoes: number;
            observacao?: string;
            visitas_lista: VisitaFront[];

            chamada: {
                [alunoId: string]: {
                    status:
                        | "Presente"
                        | "Atrasado"
                        | "Falta Justificada"
                        | "Falta";
                    trouxe_licao: boolean;
                    trouxe_biblia: boolean;
                };
            };
        };
    };
    detalhes_aluno: {
        [idAluno: string]: {
            nome: string;
            presente: number;
            atrasado: number;
            falta: number;
            falta_justificada: number;
            porcentagem: number;
            matriculado: boolean;
            trouxe_biblia: number;
            nao_trouxe_biblia: number;
            porcentagem_biblia: number;
            trouxe_revista: number;
            nao_trouxe_revista: number;
            porcentagem_revista: number;
        };
    };
}

export const salvarChamada = functions.https.onCall(async (request) => {
    const { db, user, isSecretario, isAdmin } = await validarUsuario(request);

    const { classeId, licaoId, numeroAula } = request.data;
    const dados = request.data.dados as ChamadaFront;

    if (!classeId || !licaoId || !numeroAula) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados invalidos",
        );
    }

    const licaoRef = db.collection(Cll.LICOES).doc(licaoId);
    const aulaRef = licaoRef.collection("aulas").doc(numeroAula);

    const [classe, licao, aula] = await Promise.all([
        db.collection(Cll.CLASSES).doc(classeId).get(),
        licaoRef.get(),
        aulaRef.get(),
    ]);

    if (!classe.exists || !licao.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Coleções não foram encontradas",
        );
    }
    if (
        (isSecretario && user.classeId !== classeId) ||
        (isAdmin && licao.data()?.igrejaId !== user.igrejaId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer essa chamada",
        );
    }

    const cacheRef = db
        .collection(Cll.CACHE_LICAO)
        .doc(`${classe.data()!.igrejaId}_${licaoId}`);
    const cacheSnap = await cacheRef.get();
    dados.missoesPix =
        typeof dados.missoesPix === "string"
            ? Number(dados.missoesPix.replace(",", "."))
            : dados.missoesPix;
    dados.missoesDinheiro =
        typeof dados.missoesDinheiro === "string"
            ? Number(dados.missoesDinheiro.replace(",", "."))
            : dados.missoesDinheiro;
    dados.ofertaDinheiro =
        typeof dados.ofertaDinheiro === "string"
            ? Number(dados.ofertaDinheiro.replace(",", "."))
            : dados.ofertaDinheiro;
    dados.ofertaPix =
        typeof dados.ofertaPix === "string"
            ? Number(dados.ofertaPix.replace(",", "."))
            : dados.ofertaPix;
    const dadosParaSalvar: RegistroAulaInterface = {
        atrasados: dados.totalAtrasados,
        biblias: dados.totalBiblias,
        classeId,
        classeNome: classe.data()!.nome,
        data: Timestamp.fromDate(new Date(dados.data_chamada + "T12:00:00")),
        descricao: dados.descricao,
        igrejaId: classe.data()!.igrejaId,
        igrejaNome: classe.data()!.igrejaNome,
        licaoId,
        licoes_trazidas: dados.totalLicoes,
        ministerioId: user.ministerioId,
        missoes: { dinheiro: dados.missoesDinheiro, pix: dados.missoesPix },
        ofertas: { dinheiro: dados.ofertaDinheiro, pix: dados.ofertaPix },
        missoes_total: dados.missoesDinheiro + dados.missoesPix,
        ofertas_total: dados.ofertaDinheiro + dados.ofertaPix,
        imgsPixMissoes: dados?.imgsPixMissoes?.length
            ? dados.imgsPixMissoes
            : null,
        imgsPixOfertas: dados?.imgsPixOfertas?.length
            ? dados.imgsPixOfertas
            : null,
        presentes_chamada: dados.totalPresentes,
        total_ausentes: dados.totalAusentes,
        total_matriculados: dados.totalMatriculados,
        total_presentes:
            dados.totalPresentes + dados.totalAtrasados + dados.visitas,
        visitas: dados.visitas,
        visitas_lista: dados.visitasLista,
        numero_aula: aula.data()?.numero_aula || 1,
    };
    try {
        const batch = db.batch();

        let registrosRef;
        const isEditando = aula.exists && aula.data()?.realizada;

        if (isEditando) registrosRef = aula.data()!.registroRef;
        else registrosRef = db.collection(Cll.REGISTROS_AULA).doc();

        batch.update(licaoRef, { total_matriculados: dados.totalMatriculados });

        if (isEditando) batch.update(registrosRef, dadosParaSalvar);
        else batch.set(registrosRef, dadosParaSalvar);

        if (isEditando)
            batch.update(aulaRef, {
                realizada: true,
                registroRef: registrosRef,
            });
        else {
            batch.set(aulaRef, {
                data_prevista: Timestamp.fromDate(
                    new Date(dados.data_chamada + "T12:00:00"),
                ),
                numero_aula: Number(numeroAula),
                realizada: true,
                registroRef: registrosRef,
            });
        }

        const dadosDia: any = {
            atrasados: dadosParaSalvar.atrasados,
            ausentes: dadosParaSalvar.total_ausentes,
            biblias: dadosParaSalvar.biblias,
            licoes: dadosParaSalvar.licoes_trazidas,
            presentes_chamada: dadosParaSalvar.presentes_chamada,
            visitas: dadosParaSalvar.visitas,
            visitas_lista: dadosParaSalvar.visitas_lista,
            total_presenca: dadosParaSalvar.total_presentes,
            ofertas: dadosParaSalvar.ofertas_total,
            ofertas_pix: dadosParaSalvar.ofertas.pix,
            ofertas_dinheiro: dadosParaSalvar.ofertas.dinheiro,
            missoes: dadosParaSalvar.missoes_total,
            missoes_dinheiro: dadosParaSalvar.missoes.dinheiro,
            missoes_pix: dadosParaSalvar.missoes.pix,
            total_matriculados: dadosParaSalvar.total_matriculados,
            descricao: dadosParaSalvar.descricao,
        };
        const dadosAlunos: any = {};
        const dadosGeraisCache = {
            classeId: dadosParaSalvar.classeId,
            classeNome: dadosParaSalvar.classeNome,
            igrejaId: dadosParaSalvar.igrejaId,
            igrejaNome: dadosParaSalvar.igrejaNome,
            licaoId: dadosParaSalvar.licaoId,
            licaoNome: licao.data()?.titulo,
            ministerioId: dadosParaSalvar.ministerioId,
            data_fim: licao.data()?.data_fim,
            data_inicio: licao.data()?.data_inicio,
            detalhes_aulas: {
                [dadosParaSalvar.data.toDate().toLocaleDateString("pt-BR")]:
                    dadosDia,
            },
            total_matriculados: dadosParaSalvar.total_matriculados,
        };

        const chamadaRef = registrosRef.collection("chamada");
        const alunosIds = Object.keys(dados.chamada);
        const alunosStatus: any = {};

        if (alunosIds.length) {
            const listaChamada = alunosIds.map((id) => {
                const obj = {
                    alunoId: id,
                    status: dados.chamada[id],
                    trouxe_biblia: dados.bibliasTrazidas.includes(id)
                        ? true
                        : false,
                    trouxe_licao: dados.licoesTrazidas.includes(id)
                        ? true
                        : false,
                };
                alunosStatus[id] = obj;

                const stts = dados.chamada[id]
                    .toLocaleLowerCase()
                    .replace(" ", "_");
                dadosAlunos[id] = getNewCacheAluno("", id, { [stts]: 1 });

                return obj;
            });

            batch.set(chamadaRef.doc("lista"), { chamada: listaChamada });
            dadosDia["chamada"] = alunosStatus;
        }

        if (!cacheSnap.exists) {
            const dadosCache = {
                ...dadosGeraisCache,
                detalhes_aluno: dadosAlunos,
                pico_presenca: dadosParaSalvar.total_presentes,
                total_matriculados: dadosParaSalvar.total_matriculados,
                total_missoes: dadosParaSalvar.missoes_total,
                total_missoes_dinheiro: dadosParaSalvar.missoes.dinheiro,
                total_missoes_pix: dadosParaSalvar.missoes.pix,
                total_ofertas: dadosParaSalvar.ofertas_total,
                total_ofertas_dinheiro: dadosParaSalvar.ofertas.dinheiro,
                total_ofertas_pix: dadosParaSalvar.ofertas.pix,
            };

            batch.set(cacheRef, dadosCache);
        } else {
            const cache = cacheSnap.data() as CacheLicaoInterface;
            const detalhes_aulas = {
                ...cache.detalhes_aulas,
                ...dadosGeraisCache.detalhes_aulas,
            };

            const colunas: any = {
                total_ofertas: "ofertas_total",
                total_ofertas_pix: "ofertas.pix",
                total_ofertas_dinheiro: "ofertas.dinheiro",
                total_missoes: "missoes_total",
                total_missoes_pix: "missoes.pix",
                total_missoes_dinheiro: "missoes.dinheiro",
            };
            if (!isEditando) {
                for (const col in colunas) {
                    const cacheEdit = cache as any;
                    const d = dadosParaSalvar as any;
                    cacheEdit[col] =
                        (cacheEdit[col] || 0) +
                        (colunas[col]
                            .split(".")
                            .reduce(
                                (prev: any, current: any) => prev[current],
                                d,
                            ) || 0);
                }
            }

            const presencaAluno = new Map();
            for (const dia in detalhes_aulas) {
                const chamada = detalhes_aulas[dia].chamada;
                for (const id in chamada) {
                    const stts = chamada[id].status
                        .toLowerCase()
                        .replace(" ", "_");

                    const obj: any =
                        presencaAluno.get(id) ||
                        getNewCacheAluno(
                            cache.detalhes_aluno[id]?.nome || "",
                            id,
                            {
                                matriculado:
                                    cache.detalhes_aluno[id]?.matriculado ||
                                    false,
                            },
                        );

                    if (!obj?.["nome"]) {
                        const alunoSnap = await db
                            .collection("alunos")
                            .doc(id)
                            .get();
                        if (alunoSnap.exists)
                            obj["nome"] = alunoSnap.data()!.nome_completo;
                    }

                    const trouxeRevista = chamada[id].trouxe_licao;
                    const trouxeBiblia = chamada[id].trouxe_biblia;

                    obj[stts]++;
                    obj["trouxe_biblia"] += trouxeBiblia ? 1 : 0;
                    obj["trouxe_revista"] += trouxeRevista ? 1 : 0;
                    obj["nao_trouxe_biblia"] += !trouxeBiblia ? 1 : 0;
                    obj["nao_trouxe_revista"] += !trouxeRevista ? 1 : 0;

                    presencaAluno.set(id, obj);
                }
            }

            const detalhes_aluno = Object.fromEntries(presencaAluno);
            const totalAulas = Object.keys(detalhes_aulas).length;
            for (const id in detalhes_aluno) {
                const a = detalhes_aluno;
                const totalPontos =
                    (a[id].presente || 0) +
                    (a[id].atrasado || 0) * 0.9 +
                    (a[id].falta_justificada || 0) * 0.5;

                const porcentagem = ((totalPontos || 0) / totalAulas) * 100;
                const porcentagemRevista =
                    (a[id].trouxe_revista / totalAulas) * 100;
                const porcentagemBiblia =
                    (a[id].trouxe_biblia / totalAulas) * 100;

                a[id].porcentagem = porcentagem;
                a[id].porcentagem_biblia = porcentagemBiblia;
                a[id].porcentagem_revista = porcentagemRevista;
            }

            batch.update(cacheRef, {
                ...cache,
                ...dadosGeraisCache,
                detalhes_aluno,
                detalhes_aulas,
                pico_presenca:
                    cache.pico_presenca < dadosParaSalvar.total_presentes
                        ? dadosParaSalvar.total_presentes
                        : cache.pico_presenca,
            });
        }

        await batch.commit();

        enviarLog(
            user,
            request,
            "SALVAR_CHAMADA",
            `Chamada salva com sucesso pelo usuário: ${user.uid}`,
            { dadosParaSalvar, isEditando },
        );

        return {
            mensagem: "Chamada cadastrada com sucesso!",
            registro: registrosRef.id,
        };
    } catch (err: any) {
        console.log("Erro ao salvar chamda", err);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao salvar a chamada. Tente novamente.",
        );
    }
});

export const onSalvarChamadaUpdate = onDocumentUpdated(
    "registros_aula/{registroId}",
    async (event) => {
        const dadosAntigos = event.data?.before.data() as RegistroAulaInterface;
        const dadosNovos = event.data?.after.data() as RegistroAulaInterface;

        if (!dadosAntigos || !dadosNovos) {
            console.log("Dados ausentes. Encerrando a trigger.");

            return;
        }

        const imgsMissoesDeletar = dadosAntigos.imgsPixMissoes?.filter(
            (v) => !dadosNovos.imgsPixMissoes?.includes(v),
        );
        const imgsOfertasDeletar = dadosAntigos.imgsPixOfertas?.filter(
            (v) => !dadosNovos.imgsPixOfertas?.includes(v),
        );

        const imgsDeletar = [
            ...(imgsMissoesDeletar || []),
            ...(imgsOfertasDeletar || []),
        ];

        if (imgsDeletar.length) {
            const bucket = admin.storage().bucket();
            const regex = /\/o\/(.*)\?/;
            const promises = imgsDeletar
                ?.map((v) => {
                    const caminho = v?.match(regex);
                    if (caminho?.length) {
                        const url = decodeURIComponent(caminho[1]);
                        return bucket.file(url).delete();
                    }
                    return;
                })
                .filter(Boolean);

            await Promise.all(promises!);

            console.log("Imagens apagadas com sucesso!");
        } else {
            console.log("As imagens não mudaram...");
        }

        console.log("Iniciando Atualização do cache");

        const db = admin.firestore();

        const cacheRef = db
            .collection("cache_licao")
            .doc(`${dadosNovos.igrejaId}_${dadosNovos.licaoId}`);
        const cacheSnap = await cacheRef.get();

        if (!cacheSnap.exists) {
            console.log("cache não encontrado, encerrando trigger");
            return;
        }

        const cache = { ...cacheSnap.data() } as CacheLicaoInterface;
        const colunas: any = {
            total_ofertas: "ofertas_total",
            total_ofertas_pix: "ofertas.pix",
            total_ofertas_dinheiro: "ofertas.dinheiro",
            total_missoes: "missoes_total",
            total_missoes_pix: "missoes.pix",
            total_missoes_dinheiro: "missoes.dinheiro",
        };

        for (const key in colunas) {
            const c = cache as any;
            const da = dadosAntigos as any;
            const dn = dadosNovos as any;

            c[key] =
                c[key] -
                colunas[key]
                    .split(".")
                    .reduce((prev: any, current: any) => prev[current], da) +
                colunas[key]
                    .split(".")
                    .reduce((prev: any, current: any) => prev[current], dn);

            if (c[key] < 0) c[key] = 0;
        }

        await cacheRef.update({ ...cache });
        console.log("Dados atualizados, encerrando trigger");
    },
);

// Matricula

interface MatriculaForm {
    data_matricula: string;
    possui_revista: boolean;
}

interface Matriculas {
    alunoNome: string;
    alunoId: string;
    classeId: string;
    classeNome: string;
    classeRef: any;
    data_matricula: Timestamp;
    igrejaId: string;
    igrejaNome: string;
    licaoId: string;
    licaoNome: string;
    licaoRef: any;
    ministerioId: string;
    possui_revista: boolean;
}

export const salvarMatricula = functions.https.onCall(async (request) => {
    const { db, user } = await validarUsuario(request);

    const { licaoId, alunoId } = request.data;
    const dados = request.data.dados as MatriculaForm;

    if (!licaoId || !alunoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    try {
        const matriculas = await db
            .collection(Cll.MATRICULAS)
            .where("licaoId", "==", licaoId)
            .where("alunoId", "==", alunoId)
            .limit(1)
            .get();

        if (!matriculas.empty) {
            const matriculaDoc = matriculas.docs[0];
            const data_matricula = Timestamp.fromDate(
                new Date(dados.data_matricula + "T12:00:00"),
            );
            await Promise.all([
                matriculaDoc.ref.update({ ...dados, data_matricula }),
                db
                    .collection(Cll.CACHE_MATRICULAS)
                    .doc(`${matriculaDoc.data()?.igrejaId}_${licaoId}`)
                    .update({
                        [`lista.${matriculaDoc.id}`]: {
                            ...matriculaDoc.data(),
                            ...dados,
                            data_matricula,
                            id: matriculaDoc.id,
                        },
                    }),
            ]);

            enviarLog(
                user,
                request,
                "SALVAR_MATRICULA",
                `Matricula salva com sucesso pelo usuário: ${user.uid}`,
                matriculaDoc.data(),
            );

            return {
                mensagem: "Aluno atualizado com sucesso",
                matriculaId: matriculaDoc.id,
            };
        }

        const alunoRef = db.collection(Cll.ALUNOS).doc(alunoId);
        const licaoRef = db.collection(Cll.LICOES).doc(licaoId);
        const [aluno, licao] = await Promise.all([
            alunoRef.get(),
            licaoRef.get(),
        ]);

        if (!aluno.exists || !licao.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Aluno ou Lição não encontrado",
            );
        }
        const igrejaId = licao.data()?.igrejaId;
        const cacheRef = db
            .collection(Cll.CACHE_LICAO)
            .doc(`${igrejaId}_${licaoId}`);

        const classeRef = db.collection("classes").doc(licao.data()!.classeId);
        const [classe, cacheSnap] = await Promise.all([
            classeRef.get(),
            cacheRef.get(),
        ]);
        const cache = cacheSnap.data() as CacheLicaoInterface;

        if (!classe.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe associada à lição não foi encontrada.",
            );
        }

        const licaoData = licao.data() as Licao;

        const dadosParaSalvar: Matriculas = {
            alunoId,
            alunoNome: aluno.data()!.nome_completo,
            classeId: classe.id,
            classeNome: classe.data()!.nome,
            classeRef: classeRef,
            data_matricula: Timestamp.fromDate(
                new Date(dados.data_matricula + "T12:00:00"),
            ),
            igrejaId: classe.data()!.igrejaId,
            igrejaNome: classe.data()!.igrejaNome,
            licaoId,
            licaoNome: licaoData!.titulo,
            licaoRef: licaoRef,
            ministerioId: user.ministerioId,
            possui_revista: dados.possui_revista,
        };
        const dadosNovoAluno = getNewCacheAluno(
            dadosParaSalvar.alunoNome,
            alunoId,
        );

        const batch = db.batch();

        const matricula = db.collection("matriculas").doc();
        batch.set(matricula, dadosParaSalvar);
        batch.update(
            db.collection(Cll.CACHE_MATRICULAS).doc(`${igrejaId}_${licaoId}`),
            {
                [`lista.${matricula.id}`]: {
                    ...dadosParaSalvar,
                    id: matricula.id,
                },
            },
        );
        batch.set(
            db.collection(Cll.CACHE_PORTAL_ALUNO).doc(alunoId),
            {
                ultimaLicaoId: licaoId,
                historico: {
                    [licaoId]: {
                        ano: licaoData.data_inicio.toDate().getFullYear(),
                        classeId: licaoData.classeId,
                        classeNome: licaoData.classeNome,
                        data_fim: licaoData.data_fim.toMillis(),
                        data_inicio: licaoData.data_inicio.toMillis(),
                        licaoId: licaoId,
                        titulo: licaoData.titulo,
                    },
                },
            },
            { merge: true },
        );

        batch.update(licaoRef, { total_matriculados: FieldValue.increment(1) });
        batch.update(cacheRef, {
            total_matriculados: FieldValue.increment(1),
            [`detalhes_aluno.${alunoId}`]: {
                ...dadosNovoAluno,
                ...cache.detalhes_aluno?.[alunoId],
                matriculado: true,
                nome: dadosNovoAluno.nome,
            },
        });

        await batch.commit();

        enviarLog(
            user,
            request,
            "SALVAR_MATRICULA",
            `Matricula salva com sucesso pelo usuário: ${user.uid}`,
            { dadosParaSalvar },
        );

        return {
            mensagem: "Aluno salvo com sucesso",
            matriculaId: matricula.id,
        };
    } catch (err: any) {
        console.log("Erro ao salvar", err);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao fazer a matricula. Tente novamente.",
        );
    }
});
export const deletarMatricula = functions.https.onCall(async (request) => {
    const { isSecretario, isSuperAdmin, db, user } =
        await validarUsuario(request);

    const { matriculaId } = request.data;

    if (!matriculaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const matriculaRef = db.collection(Cll.MATRICULAS).doc(matriculaId);
    const matriculaSnap = await matriculaRef.get();

    if (!matriculaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Matricula não encontrada",
        );
    }

    if (
        (!isSuperAdmin && matriculaSnap.data()?.igrejaId !== user.igrejaId) ||
        (isSecretario && matriculaSnap.data()?.classeId !== user.classeId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para deletar essa matricula",
        );
    }

    try {
        const batch = db.batch();
        const matricula = matriculaSnap.data();
        const licaoRef = matricula?.licaoRef;

        const cacheRef = db
            .collection(Cll.CACHE_LICAO)
            .doc(`${matricula?.igrejaId}_${matricula?.licaoId}`);

        batch.update(cacheRef, {
            total_matriculados: FieldValue.increment(-1),
            [`detalhes_aluno.${matricula?.alunoId}.matriculado`]: false,
        });

        batch.update(licaoRef, {
            total_matriculados: FieldValue.increment(-1),
        });
        batch.delete(matriculaRef);
        batch.update(
            db
                .collection(Cll.CACHE_MATRICULAS)
                .doc(`${matricula?.igrejaId}_${matricula?.licaoId}`),
            { [`lista.${matriculaId}`]: FieldValue.delete() },
        );

        await batch.commit();

        enviarLog(
            user,
            request,
            "DELETAR_MATRICULA",
            `A matricula ${matriculaId} foi deletada com sucesso pelo usuário ${user.uid}`,
            { matriculas: matriculaSnap.data() },
        );

        return { message: "A matricula foi deletada com sucesso." };
    } catch (error) {
        console.log("Erro ao deletar matricula", error);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao deletar a matricula. Tente novamente.",
        );
    }
});

interface GerarRelatorioInterface {
    metrica:
        | "ofertas"
        | "ofertas_total"
        | "missoes"
        | "missoes_total"
        | "total_presentes"
        | "presentes_chamada"
        | "atrasados"
        | "total_ausentes"
        | "biblias"
        | "licoes_trazidas"
        | "frequencia_alunos";
    agrupamento: "semana" | "mes" | "trimestre" | "classe" | "aluno" | "igreja";
    dataInicio: string;
    dataFim: string;
    igrejas?: string[];
    classes?: string[];
    grafico: "bar" | "line" | "pie";
}

export const gerarRelatorioGrafico = functions.https.onCall(async (request) => {
    const { user, db, isSecretario, isSuperAdmin, isAdmin } =
        await validarUsuario(request);

    const { agrupamento, classes, dataFim, dataInicio, igrejas, metrica } =
        request.data as GerarRelatorioInterface;

    if (!agrupamento || !dataFim || !dataInicio || !metrica) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    let baseQuery = db
        .collection(Cll.REGISTROS_AULA)
        .where("data", ">=", new Date(dataInicio + "T00:00:00"))
        .where("data", "<=", new Date(dataFim + "T23:59:59"));

    if (isSecretario)
        baseQuery = baseQuery.where("classeId", "==", user.classeId);
    else if (isAdmin) {
        baseQuery = baseQuery.where("igrejaId", "==", user.igrejaId);
        if (classes?.length)
            baseQuery = baseQuery.where("classeId", "in", classes);
    } else if (isSuperAdmin) {
        baseQuery = baseQuery.where("ministerioId", "==", user.ministerioId);

        if (igrejas?.length)
            baseQuery = baseQuery.where("igrejaId", "in", igrejas);
        if (classes?.length)
            baseQuery = baseQuery.where("classeId", "in", classes);
    }

    const registroDocs = (await baseQuery.get()).docs;
    const registros = registroDocs.map((v) =>
        v.data(),
    ) as RegistroAulaInterface[];

    if (metrica === "frequencia_alunos") {
        if (!registroDocs.length) return [];

        const presencas = new Map<string, any>();
        const licoes = new Set();

        for (const registro of registros) {
            let key = "desconhecido";
            switch (agrupamento) {
                case "classe":
                    key = registro.classeNome;
                    break;
                case "igreja":
                    key = registro.igrejaNome;
                    break;
            }

            if (licoes.has(registro.licaoId)) continue;

            const cache = (
                await db
                    .collection(Cll.CACHE_LICAO)
                    .doc(`${registro.igrejaId}_${registro.licaoId}`)
                    .get()
            ).data() as CacheLicaoInterface;

            Object.values(cache.detalhes_aluno).forEach((v) => {
                if (agrupamento === "aluno") key = v.nome;

                const valor = presencas.get(key) || { [v.nome]: 0 };
                valor[v.nome] = (valor[v.nome] || 0) + v.porcentagem;

                presencas.set(key, valor);
            });

            licoes.add(registro.licaoId);
        }

        return Array.from(presencas.entries()).map(([name, valor]) => {
            for (let key in valor) {
                const porcentagem = (valor[key] / licoes.size).toFixed(2);
                valor[key] = Number.parseFloat(porcentagem);
            }
            return {
                name,
                ...valor,
            };
        });
    }

    const agregador = new Map<string, any>();

    const trimestre = new Map();
    if (agrupamento === "trimestre") {
        const ids = [...new Set(registros.map((v) => v.licaoId))];
        const promises = [];
        for (let i = 0; i < ids.length; i += 30) {
            const chunk = ids.slice(i, i + 30);
            promises.push(
                db
                    .collection(Cll.LICOES)
                    .where(admin.firestore.FieldPath.documentId(), "in", chunk)
                    .get(),
            );
        }

        const licoesDocs = (await Promise.all(promises)).flatMap((v) => v.docs);

        licoesDocs.forEach((v) => {
            const licao = v.data() as Licao;
            const data_inicio = licao.data_inicio
                .toDate()
                .toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "2-digit",
                })
                .replace(/\sde\s/g, "/");
            const data_fim = licao.data_fim
                .toDate()
                .toLocaleDateString("pt-BR", {
                    month: "short",
                    year: "2-digit",
                })
                .replace(/\sde\s/g, "/");

            trimestre.set(v.id, `${data_inicio} - ${data_fim}`);
        });
    }

    if (agrupamento === "aluno") {
        const alunosMap = new Map<string, any>();
        const licoes = new Set();

        for (const registro of registroDocs) {
            const registroData = registro.data() as RegistroAulaInterface;

            if (licoes.has(registroData.licaoId)) continue;

            const cacheSnap = await db
                .collection("cache_licao")
                .doc(`${registroData.igrejaId}_${registroData.licaoId}`)
                .get();

            if (!cacheSnap.exists) return;

            const cache = cacheSnap.data() as CacheLicaoInterface;
            Object.values(cache.detalhes_aluno).forEach((v) => {
                let valor = 0;
                const nome = v.nome;
                switch (metrica) {
                    case "biblias":
                        valor = v.trouxe_biblia;
                        break;
                    case "licoes_trazidas":
                        valor = v.trouxe_revista;
                        break;
                    case "presentes_chamada":
                        valor = v.presente;
                        break;
                    case "total_presentes":
                        valor = v.presente + v.atrasado;
                        break;
                    case "atrasados":
                        valor = v.atrasado;
                        break;
                    case "total_ausentes":
                        valor = v.falta + v.falta_justificada;
                }

                alunosMap.set(nome, (alunosMap.get(nome) || 0) + valor);
            });

            licoes.add(registroData.licaoId);
        }

        return Array.from(alunosMap.entries()).map(([name, valor]) => ({
            name,
            valor,
        }));
    }

    const getChaveAgrupamento = (v: RegistroAulaInterface) => {
        let chave = "";

        if (igrejas?.length) chave += v.igrejaNome;
        if (classes?.length)
            chave += chave.length ? `|${v.classeNome}` : v.classeNome;

        return chave;
    };

    registros.forEach((v) => {
        let key = "Desconhecido";
        switch (agrupamento) {
            case "classe":
                key = v.classeNome;
                break;
            case "igreja":
                key = v.igrejaNome;
                break;
            case "mes":
                key = v.data
                    .toDate()
                    .toLocaleDateString("pt-BR", {
                        month: "long",
                        year: "numeric",
                    })
                    .replace(/\sde\s/g, "/");
                break;
            case "semana":
                const data = v.data.toDate();
                const primeiroDiaDaSemana = new Date(
                    data.setDate(data.getDate() - data.getDay()),
                );
                key = `Semana de ${primeiroDiaDaSemana.toLocaleDateString(
                    "pt-BR",
                )}`;
                break;
            case "trimestre":
                key = trimestre.get(v.licaoId);
                break;
        }

        const chaveAgrupamento = getChaveAgrupamento(v);
        if (metrica === "ofertas" || metrica === "missoes") {
            const chaveEnvioPix = chaveAgrupamento.length
                ? `${chaveAgrupamento} - pix`
                : "pix";
            const chaveEnvioDinheiro = chaveAgrupamento.length
                ? `${chaveAgrupamento} - dinheiro`
                : "dinheiro";

            const valor = agregador.get(key) || { name: key };
            valor[chaveEnvioPix] =
                (valor[chaveEnvioPix] || 0.0) + (v[metrica].pix || 0.0);
            valor[chaveEnvioDinheiro] =
                (valor[chaveEnvioDinheiro] || 0.0) +
                (v[metrica].dinheiro || 0.0);

            agregador.set(key, valor);
        } else {
            const valor = v[metrica as "missoes"] || 0.0;

            const chaveEnvio = chaveAgrupamento.length
                ? chaveAgrupamento
                : metrica;
            const envio = agregador.get(key) || { name: key };
            envio[chaveEnvio] = (envio[chaveEnvio] || 0.0) + valor;
            agregador.set(key, envio);
        }
    });

    const envio = Array.from(agregador.values());

    console.log(`Relatório gerado com ${envio.length} pontos de dados.`);
    return envio;
});

interface ExportCSV {
    data_inicio: string | Date;
    data_fim: string | Date;
    igrejas?: string[];
    classes?: string[];
    type: "previa" | "csv";
    colecao:
        | "registros_aula"
        | "alunos"
        | "membros"
        | "matriculas"
        | "usuarios"
        | "licoes"
        | "chamada";
}

export const exportarDadosCSV = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin, isAdmin, isSecretario } =
        await validarUsuario(request);

    const { type, classes, igrejas, colecao } = request.data as ExportCSV;
    let { data_fim, data_inicio } = request.data as ExportCSV;

    if (!colecao) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    if (isSecretario && colecao === "membros") {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }
    const baseQuery = db.collection(
        colecao === "chamada" ? "registros_aula" : colecao,
    );

    let q = baseQuery.where("ministerioId", "==", user.ministerioId);

    if (
        colecao === "matriculas" ||
        colecao === "licoes" ||
        colecao === "registros_aula" ||
        colecao === "chamada"
    ) {
        if (!data_fim || !data_inicio) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados inválidos ou ausentes",
            );
        }

        data_inicio = new Date(data_inicio);
        data_inicio.setHours(0, 0, 0, 0);

        data_fim = new Date(data_fim);
        data_fim.setHours(23, 59, 59, 59);

        if (colecao === "licoes")
            q = q
                .where("data_inicio", ">=", data_inicio)
                .where("data_fim", "<=", data_fim);
        else if (colecao === "matriculas")
            q = q
                .where("data_matricula", ">=", data_inicio)
                .where("data_matricula", "<=", data_fim);
        else
            q = q
                .where("data", ">=", data_inicio)
                .where("data", "<=", data_fim);
    }

    if (colecao !== "alunos" && colecao !== "membros") {
        if (isSuperAdmin) {
            if (igrejas?.length) q = q.where("igrejaId", "in", igrejas);
            if (classes?.length) q = q.where("classeId", "in", classes);
        } else if (isAdmin) {
            q = q.where("igrejaId", "==", user.igrejaId);
            if (classes?.length) q = q.where("classeId", "in", classes);
        } else {
            q = q.where("classeId", "==", user.classeId);
        }
    } else {
        if (!isSuperAdmin) q = q.where("igrejaId", "==", user.igrejaId);
        else if (igrejas?.length) q = q.where("igrejaId", "in", igrejas);
    }

    let dadosSnap = await (type === "previa" ? q.limit(15).get() : q.get());

    if (dadosSnap.empty) return [];
    let dados;
    if (colecao === "chamada") {
        const d: any[] = [];
        const promises = dadosSnap.docs.map(async (v) => {
            const registro = v.data() as RegistroAulaInterface;
            const chamadaSnap = await v.ref
                .collection("chamada")
                .doc("lista")
                .get();

            chamadaSnap.data()?.chamada.forEach((c: any) => {
                d.push({
                    ...c,
                    id: v.id,
                    igrejaNome: registro.igrejaNome,
                    classeNome: registro.classeNome,
                    data: registro.data.toDate().toLocaleDateString("pt-BR"),
                });
            });
        });
        await Promise.all(promises);
        dados = d;
    } else dados = dadosSnap.docs.map((v) => ({ id: v.id, ...v.data() }));

    const colunas = Object.keys(dados[0]);

    if (type === "previa") {
        dados.forEach((v) => {
            colunas.forEach((c) => {
                if (typeof v[c]?.toDate === "function")
                    v[c] = v[c].toDate().toLocaleDateString("pt-BR");
                else if (typeof v[c] === "object") v[c] = JSON.stringify(v[c]);
            });
        });

        return dados;
    }

    const linhas = dados.map((v) =>
        colunas
            .map((c) => {
                const item = v[c];
                if (item && typeof item.toDate === "function")
                    return item.toDate().toLocaleDateString("pt-BR");
                if (typeof item === "object")
                    return String(JSON.stringify(item)).replace(/"/g, '""');

                const valor = String(item);
                if (
                    valor?.includes(";") ||
                    valor?.includes("\n") ||
                    valor?.includes('"')
                )
                    return `"${item.replace(/"/g, '""')}"`;
                return item;
            })
            .join(";"),
    );

    const table = [colunas.join(";"), ...linhas].join("\r\n");

    return table;
});

export const getResumoDaLicao = functions.https.onCall(async (request) => {
    const { isSuperAdmin, isSecretario, user, db } =
        await validarUsuario(request);

    const { licaoId } = request.data;

    if (!licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const licaoRef = db.collection("licoes").doc(licaoId);
    const licaoSnap = await licaoRef.get();

    if (
        !licaoSnap.exists ||
        (!isSuperAdmin && licaoSnap.data()?.igrejaId !== user.igrejaId) ||
        (isSecretario && licaoSnap.data()?.classeId !== user.classeId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Permissão inválida",
        );
    }

    const licao = licaoSnap.data() as Licao;
    const totalAlunos = licao.total_matriculados;

    const registrosRef = db
        .collection("registros_aula")
        .where("licaoId", "==", licaoId);
    const registroDocs = await registrosRef.get();

    const progresso: any = {
        total: licao.numero_aulas,
        concluidas: registroDocs.docs.length,
    };

    if (registroDocs.empty)
        return {
            progresso,
            totalAlunos: licao.total_matriculados,
            mediaPresenca: 0,
            totalArrecadado: 0,
            frequenciaAlunos: [],
        };

    let totalPresenca: any = [];
    let totalArrecadado: any = [];

    const alunosMap = new Map();

    const promises = registroDocs.docs.map(async (v) => {
        const registro = v.data() as RegistroAulaInterface;

        totalPresenca.push(
            (registro.atrasados * 0.9 || 0) + (registro.presentes_chamada || 0),
        );
        totalArrecadado.push(
            (registro.ofertas_total || 0) + (registro.missoes_total || 0),
        );

        const chamadaRef = await v.ref.collection("chamada").get(); ////AAAAAAAAAAA

        if (chamadaRef.empty) return;

        chamadaRef.docs.forEach((c) => {
            const chamada = c.data();
            const data = registro.data.toDate().toLocaleDateString("pt-BR");
            const aula = registro.numero_aula;

            const item = alunosMap.get(c.id) || {
                id: c.id,
                nome: chamada.nome,
                chamada: {
                    presente: 0,
                    atrasado: 0,
                    falta: 0,
                    falta_justificada: 0,
                    detalhes: [],
                },
                licoes: {
                    trouxe: 0,
                    naoTrouxe: 0,
                    detalhes: [],
                },
                biblias: {
                    trouxe: 0,
                    naoTrouxe: 0,
                    detalhes: [],
                },
            };

            const key = chamada.status.toLowerCase().replace(/\s/g, "_");
            if (key === "falta_justificada") totalPresenca.push(1);

            // Chamada
            item["chamada"][key] = (item["chamada"][key] || 0) + 1;
            item["chamada"]["detalhes"].push({
                data,
                status: chamada.status,
                aula,
            });

            //Licoes
            if (chamada.trouxe_licao === true)
                item["licoes"]["trouxe"] = (item["licoes"]["trouxe"] || 0) + 1;
            else
                item["licoes"]["naoTrouxe"] =
                    (item["licoes"]["naoTrouxe"] || 0) + 1;
            item["licoes"]["detalhes"].push({
                data,
                aula,
                status: chamada.trouxe_licao,
            });

            //Biblias
            if (chamada.trouxe_biblia === true)
                item["biblias"]["trouxe"] =
                    (item["biblias"]["trouxe"] || 0) + 1;
            else
                item["biblias"]["naoTrouxe"] =
                    (item["biblias"]["naoTrouxe"] || 0) + 1;
            item["biblias"]["detalhes"].push({
                data,
                aula,
                status: chamada.trouxe_biblia,
            });

            alunosMap.set(c.id, item);
        });
    });

    await Promise.all(promises);

    totalPresenca = totalPresenca.reduce(
        (prev: any, acc: any) => acc + prev,
        0.0,
    );
    totalArrecadado = totalArrecadado.reduce(
        (prev: any, acc: any) => acc + prev,
        0,
    );

    const frequenciaAlunos = Array.from(alunosMap.values()).map((v) => {
        const c = v["chamada"];
        const l = v["licoes"];
        const b = v["biblias"];

        const totalPontos =
            (c.presente || 0) +
            (c.atrasado || 0) * 0.9 +
            (c.falta_justificada || 0) * 0.5;
        const porcentagemPresenca =
            (totalPontos / (progresso.concluidas || 0)) * 100;

        const porcentagemLicao =
            ((l["trouxe"] || 0) / progresso.concluidas) * 100;
        const porcentagemBiblias =
            ((b["trouxe"] || 0) / progresso.concluidas) * 100;

        return {
            ...v,
            chamada: {
                ...c,
                porcentagem:
                    Number.parseFloat(porcentagemPresenca.toFixed(1)) || 0,
            },
            licoes: {
                ...l,
                porcentagem:
                    Number.parseFloat(porcentagemLicao.toFixed(1)) || 0,
            },
            biblias: {
                ...b,
                porcentagem:
                    Number.parseFloat(porcentagemBiblias.toFixed(1)) || 0,
            },
        };
    });

    const mediaPresenca =
        Number.parseFloat(
            (
                (totalPresenca /
                    (frequenciaAlunos.length * progresso.concluidas)) *
                100
            ).toFixed(1),
        ) || 0;

    return {
        progresso,
        totalAlunos,
        mediaPresenca,
        totalArrecadado,
        frequenciaAlunos,
    };
});

// Visita
interface VisitaFront {
    visitaId?: string;
    igrejaId: string;
    visitas?: {
        nome_completo: string;
        data_nascimento?: string;
        contato?: string;
    }[];
    dados?: {
        nome_completo: string;
        data_nascimento?: string;
        contato?: string;
    };
}

export const salvarVisita = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, user } = await validarUsuario(request);
    const { visitaId, igrejaId, visitas, dados } = request.data as VisitaFront;

    if (!igrejaId || (dados && !visitaId) || (!dados && visitaId)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    if (!isSuperAdmin && user.igrejaId !== igrejaId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso.",
        );
    }

    const igrejaSnap = await db.collection(Cll.IGREJAS).doc(igrejaId).get();
    if (!igrejaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada",
        );
    }

    if (visitaId) {
        let data;
        if (dados?.data_nascimento) {
            data = new Date(dados.data_nascimento);
            data.setHours(0, 0, 0, 0);
        }
        const visitaRef = db.collection(Cll.VISITANTES).doc(visitaId);
        const visita = await visitaRef.get();

        if (!visita.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Visita não encontrada",
            );
        }

        const dadosAtualizados = {
            nome_completo: dados?.nome_completo,
            data_nascimento: data
                ? Timestamp.fromDate(data)
                : visita.data()?.data_nascimento,
            contato: dados?.contato || null,
        };

        await visitaRef.update(dadosAtualizados);

        enviarLog(
            user,
            request,
            "SALVAR_VISITA",
            `Visita atualizada pelo usuário ${user.uid}`,
            dadosAtualizados,
        );

        return { ...dadosAtualizados };
    }

    try {
        if (visitas?.length) {
            const batch = db.batch();

            const nomesParaBuscar = visitas.map((v) =>
                v.nome_completo.toLowerCase(),
            );
            const visitasExistentesQuery = db
                .collection(Cll.VISITANTES)
                .where("igrejaId", "==", igrejaId)
                .where("nome_completo", "in", nomesParaBuscar);

            const visitasSnap = await visitasExistentesQuery.get();
            const visitantesExistentesMap = new Map(
                visitasSnap.docs.map((doc) => [doc.data()?.nome_completo, doc]),
            );

            visitas.forEach((visita) => {
                const nome = visita.nome_completo.toLowerCase();
                if (visitantesExistentesMap.has(nome)) {
                    const visitaSnap = visitantesExistentesMap.get(nome)!;
                    const visitaRef = visitaSnap.ref;
                    const visita = visitaSnap.data();

                    const hoje = new Date();
                    hoje.setUTCHours(0, 0, 0, 0);

                    const ultima_data = visita.ultima_visita.toDate();
                    ultima_data.setUTCHours(0, 0, 0, 0);

                    const isVisita =
                        hoje.toLocaleDateString("pt-BR") ===
                        ultima_data.toLocaleDateString("pt-BR");

                    batch.update(visitaRef, {
                        ultima_visita: Timestamp.now(),
                        quantidade_visitas: FieldValue.increment(
                            isVisita ? 0 : 1,
                        ),
                        igrejaNome: igrejaSnap.data()?.nome,
                    });
                } else {
                    const visitaRef = db.collection("visitantes").doc();
                    batch.set(visitaRef, {
                        nome_completo: nome,
                        contato: visita.contato || null,
                        data_nascimento: visita.data_nascimento
                            ? Timestamp.fromDate(
                                  new Date(
                                      visita.data_nascimento + "T12:00:00",
                                  ),
                              )
                            : null,
                        igrejaId,
                        igrejaNome: igrejaSnap.data()?.nome,
                        ministerioId: user.ministerioId,
                        primeira_visita: Timestamp.now(),
                        ultima_visita: Timestamp.now(),
                        quantidade_visitas: 1,
                    });
                }
            });

            await batch.commit();

            enviarLog(
                user,
                request,
                "SALVAR_VISITA",
                `Visitas incluidas pelo usuário ${user.uid}`,
                Array.from(visitantesExistentesMap.values()),
            );

            return {
                message: `${visitas.length} visitas registradas com sucesso.`,
            };
        } else {
            enviarLog(user, request, "SALVAR_VISITA", `Não houve visitas`);

            return { message: "Não houve visitas" };
        }
    } catch (error) {
        console.log("erro ao salvar", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao salvar a visita",
        );
    }
});
export const deletarVisita = functions.https.onCall(async (request) => {
    const { user, db, isSuperAdmin } = await validarUsuario(request);

    const { visitaId } = request.data;
    const visitaRef = db.collection(Cll.VISITANTES).doc(visitaId);
    const visitaSnap = await visitaRef.get();

    if (!visitaSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Visita não existe");
    }

    if (!isSuperAdmin && user.igrejaId !== visitaSnap.data()?.igrejaId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso.",
        );
    }

    await visitaRef.delete();

    enviarLog(
        user,
        request,
        "DELETAR_VISITA",
        `Visita deletada pelo usuário ${user.uid}`,
    );

    return { message: "Visita deletada com sucesso." };
});

// Codigos

interface CodigoConvite {
    role: string;
    ministerioId: string;
    igrejaId: string;
    igrejaNome: string;
    classeId: string | null;
    classeNome: string | null;
    criadoEm: Timestamp;
    criadoPorUid: string;
    dataExpiracao: Timestamp;
    usado: boolean;
    usadoPorUid: string | null;
}

export const gerarCodigoConvite = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    const isPastor = user.role === Roles.PASTOR;

    let { igrejaId, classeId, role } = request.data;

    if (
        !role ||
        ((role === Roles.SECRETARIO_CLASSE || role === Roles.PROFESSOR) &&
            !classeId)
    ) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    if (
        (!isPastor && !isSuperAdmin) ||
        (user.role === Roles.SUPER_ADMIN && role === Roles.PASTOR_PRESIDENTE) ||
        (isPastor &&
            (role === Roles.SUPER_ADMIN || role === Roles.PASTOR_PRESIDENTE))
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    if (isPastor) igrejaId = user.igrejaId;

    const igrejaSnap = await db.collection("igrejas").doc(igrejaId).get();
    if (
        !igrejaSnap.exists ||
        igrejaSnap.data()?.ministerioId !== user.ministerioId
    ) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada ou de outro ministério",
        );
    }

    let classe;
    if (role === Roles.SECRETARIO_CLASSE || role === Roles.PROFESSOR) {
        const classeSnap = await db.collection("classes").doc(classeId).get();
        if (!classeSnap.exists || classeSnap.data()?.igrejaId !== igrejaId) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe não encontrada",
            );
        }

        classe = classeSnap.data();
    }

    const agora = new Date();
    const expiracao = new Date(agora.setDate(agora.getDate() + 3));

    let codigo;
    let codigoExiste = true;

    do {
        codigo = gerarCodigo();
        const c = await db.collection("convites").doc(codigo).get();
        codigoExiste = c.exists;
    } while (codigoExiste);

    const dadosParaSalvar: CodigoConvite = {
        role: role,
        classeId: classe ? classeId : null,
        classeNome: classe ? classe.nome : null,
        criadoEm: Timestamp.fromDate(agora),
        criadoPorUid: user.uid,
        dataExpiracao: Timestamp.fromDate(expiracao),
        igrejaId,
        igrejaNome: igrejaSnap.data()!.nome,
        ministerioId: user.ministerioId,
        usado: false,
        usadoPorUid: null,
    };

    await db.collection("convites").doc(codigo).set(dadosParaSalvar);

    console.log(`Código ${codigo} criado com sucesso por ${user.uid}`);
    return { codigo, dataExpiracao: expiracao.toLocaleDateString("pt-BR") };
});
export const validarCodigoConvite = functions.https.onCall(async (request) => {
    const { codigo } = request.data;

    if (!codigo) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes.",
        );
    }

    const db = admin.firestore();
    const codigoSnap = await db.collection("convites").doc(codigo).get();

    if (!codigoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Esse código não existe",
        );
    }

    const codigoData = codigoSnap.data() as CodigoConvite;

    if (codigoData.usado || codigoData.dataExpiracao < Timestamp.now()) {
        throw new functions.https.HttpsError(
            "data-loss",
            "Código já usado ou expirado",
        );
    }

    return { codigo, igreja: codigoData.igrejaNome };
});

interface UsuarioConviteFront {
    codigo: string;
    dados: { email: string; senha: string; nome: string; confirmacao: string };
}

export const cadastrarUsuarioComConvite = functions.https.onCall(
    async (request) => {
        const {
            codigo,
            dados: { nome, email, senha },
        } = request.data as UsuarioConviteFront;

        if (!codigo || !nome || !email || !senha) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados inválidos ou ausentes.",
            );
        }
        if (senha.length < 6) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Senha deve ter no minimo 6 caracteres",
            );
        }

        const db = admin.firestore();
        const codigoRef = db.collection("convites").doc(codigo);
        const codigoSnap = await codigoRef.get();

        if (!codigoSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Convite não encontrado",
            );
        }

        const codigoData = codigoSnap.data() as CodigoConvite;
        const { igrejaId, classeId, dataExpiracao, role, criadoPorUid } =
            codigoData;

        if (codigoData.usado || dataExpiracao < Timestamp.now()) {
            throw new functions.https.HttpsError(
                "data-loss",
                "Código usado ou expirado",
            );
        }

        const promises = [
            db.collection(Cll.IGREJAS).doc(igrejaId).get(),
            db.collection(Cll.USUARIOS).doc(criadoPorUid).get(),
        ];
        if (classeId)
            promises.push(db.collection(Cll.CLASSES).doc(classeId).get());
        const [igrejaSnap, criador, classeSnap] = await Promise.all(promises);

        if (!criador.exists) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Usuário não encontrado.",
            );
        }
        if (
            !igrejaSnap.exists ||
            igrejaSnap.data()?.ministerioId !== criador.data()?.ministerioId
        ) {
            throw new functions.https.HttpsError(
                "not-found",
                "Igreja não encontrada ou de outro ministério",
            );
        }
        if (role === Roles.SECRETARIO_CLASSE || role === Roles.PROFESSOR) {
            if (!classeId || !classeSnap.exists) {
                throw new functions.https.HttpsError(
                    "not-found",
                    "Classe não encontrada.",
                );
            }

            if (classeSnap.data()?.igrejaId !== igrejaId) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Dados inválidos",
                );
            }
        }
        if (
            criador.data()!.role !== Roles.PASTOR &&
            criador.data()!.role !== Roles.PASTOR_PRESIDENTE &&
            criador.data()!.role !== Roles.SUPER_ADMIN
        ) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão par isso",
            );
        }

        const dadosUsuario: Usuario = {
            classeId: classeId || null,
            classeNome: classeId ? classeSnap.data()?.nome : null,
            email,
            igrejaId,
            igrejaNome: igrejaSnap.data()!.nome,
            ministerioId: igrejaSnap.data()!.ministerioId,
            nome,
            role: role as Roles,
        };

        let newAuth;
        try {
            newAuth = await admin.auth().createUser({ email, password: senha });
            const newUser = {
                ...dadosUsuario,
                uid: newAuth.uid,
                id: newAuth.uid,
            };
            await Promise.all([
                db.collection(Cll.USUARIOS).doc(newAuth.uid).set(newUser),
                codigoRef.update({
                    usado: true,
                    usadoPorUid: newAuth.uid,
                }),
                db
                    .collection(Cll.CACHE_USUARIOS)
                    .doc(igrejaId)
                    .update({
                        [`lista.${newUser.uid}`]: {
                            ...newUser,
                            id: newAuth.uid,
                        },
                    }),
            ]);

            const c = criador.data();

            enviarLog(
                c as any,
                request,
                "SALVAR_USUARIO",
                `Usuário salvo pelo usuário `,
                { newUser },
            );

            return { message: "usuário cadastrado com sucesso" };
        } catch (err: any) {
            console.log("Erro ao criar usuário, iniciando rollback...", err);

            if (newAuth) {
                admin.auth().deleteUser(newAuth.uid);
                console.log("Excluindo usuário fantasma");
            }

            if (err?.code === "auth/email-already-exists") {
                throw new functions.https.HttpsError(
                    "already-exists",
                    "Este e-mail já está em uso por outra conta.",
                );
            }

            throw new functions.https.HttpsError(
                "internal",
                "Ocorreu um erro ao criar o usuário. Tente novamente.",
            );
        }
    },
);

export const limparconvitesexpiradoseenviaraniversario = onSchedule(
    {
        schedule: "0 3 * * *",
        timeZone: "America/Sao_Paulo",
    },
    async (event) => {
        const db = admin.firestore();
        console.log(
            "INICIANDO TAREFA AGENDADA: Limpeza de convites expirados e atualizando notificacoes...",
        );

        try {
            const agora = Timestamp.now();
            const query = db
                .collection("convites")
                .where("dataExpiracao", "<", agora);
            const convitesExpiradosSnap = await query.get();

            console.log(
                `Encontrados ${convitesExpiradosSnap.size} convites expirados para deletar.`,
            );

            const refsParaDeletar = convitesExpiradosSnap.docs.map(
                (doc) => doc.ref,
            );

            let batch = db.batch();
            const batches = [batch];
            let count = 0;

            for (const ref of refsParaDeletar) {
                batch.delete(ref);
                count++;
                if (count >= 499) {
                    batch = db.batch();
                    batches.push(batch);
                    count = 0;
                }
            }
            await Promise.all(batches.map((v) => v.commit()));

            console.log("iniciando o envio de lembrete de aniversário");

            const igrejaId = process.env.IGREJAID!;

            const url = "https://api.green-api.com";
            const instanceId = process.env.GREEN_API_ID_INSTANCE;
            const apiToken = process.env.GREEN_API_TOKEN;
            const idGrupo = process.env.ID_GRUPO;

            const [alunosDoc, membrosDoc] = await Promise.all([
                db.collection("cache_alunos").doc(igrejaId).get(),
                db.collection("cache_membros").doc(igrejaId).get(),
            ]);
            const alunosData = alunosDoc.data() as any;
            const listaAlunos = Object.values(alunosData.lista);

            const membrosData = membrosDoc.data() as any;
            const listaMembros = Object.values(membrosData.lista);

            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);

            const listaAniversariantes = listaAlunos.filter((v: any) => {
                const dataNascimento = v.data_nascimento.toDate();
                dataNascimento.setFullYear(hoje.getFullYear());
                dataNascimento.setHours(0, 0, 0, 0);
                const isData = dataNascimento >= hoje && dataNascimento <= hoje;
                return isData;
            });
            const listaMembrosAniversariantes = listaMembros.filter(
                (v: any) => {
                    if (v.alunoId) return false;
                    const dataNascimento = v.data_nascimento.toDate();
                    dataNascimento.setFullYear(hoje.getFullYear());
                    dataNascimento.setHours(0, 0, 0, 0);
                    const isData =
                        dataNascimento >= hoje && dataNascimento <= hoje;
                    return isData;
                },
            );

            if (
                !listaAniversariantes.length &&
                !listaMembrosAniversariantes.length
            ) {
                console.log("Sem aniversariantes, encerrando.");
                return;
            }

            let mensagem = "Hoje é aniversário de:";
            listaAniversariantes.forEach((v: any) => {
                if (v.nome_completo) {
                    const [dia, mes, _] = v.data_nascimento
                        .toDate()
                        .toLocaleDateString("pt-BR")
                        .split("/");
                    mensagem += `\n\n ${v.nome_completo} (${dia}/${mes} - ${getIdade(v.data_nascimento) + 1} anos)`;
                }
            });
            listaMembrosAniversariantes.forEach((v: any) => {
                if (v.nome_completo) {
                    const [dia, mes, _] = v.data_nascimento
                        .toDate()
                        .toLocaleDateString("pt-BR")
                        .split("/");
                    mensagem += `\n\n ${v.nome_completo} (${dia}/${mes} - ${getIdade(v.data_nascimento) + 1} anos)`;
                }
            });

            await fetch(
                `${url}/waInstance${instanceId}/sendMessage/${apiToken}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        chatId: idGrupo,
                        message: mensagem,
                    }),
                },
            ).catch((v) => console.log("erro eo enviar", v));

            console.log("Tudo finalizado!");
        } catch (error) {
            console.error("ERRO na limpeza de convites expirados:", error);
            return;
        }
    },
);

interface BaixarComprovantesFront {
    igrejaId: string;
    dados: string[];
}

export const baixarTodosComprovantes = functions.https.onCall(
    async (request) => {
        const { isSuperAdmin, user, db } = await validarUsuario(request);

        const { igrejaId, dados } = request.data as BaixarComprovantesFront;

        if (!dados || !igrejaId || !dados.length) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados inválidos ou ausentes.",
            );
        }

        const igrejaSnap = await db.collection(Cll.IGREJAS).doc(igrejaId).get();

        if (!igrejaSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Igreja não encontrada.",
            );
        }

        if (
            (isSuperAdmin &&
                igrejaSnap.data()?.ministerioId !== user.ministerioId) ||
            (!isSuperAdmin && igrejaId !== user.igrejaId)
        ) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para isso.",
            );
        }

        const fetchs = await Promise.all(dados.map((v) => fetch(v)));
        const imagens = await Promise.all(fetchs.map((v) => v.arrayBuffer()));

        const zip = new JSZip();

        imagens.forEach((v, i) => {
            const url = new URL(dados[i]);
            const path = decodeURIComponent(url.pathname);
            const nome = path.substring(path.lastIndexOf("/") + 1);
            zip.file(nome, v);
        });

        const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

        enviarLog(
            user,
            request,
            "BAIXAR_COMPROVANTES",
            `Comprovantes zipados com sucesso pelo usuário: ${user.uid}`,
        );

        const file = zipBuffer.toString("base64");
        return { file };
    },
);

export const limparimagenscomprovantes = onSchedule(
    {
        schedule: "0 3 1 * *",
        timeZone: "America/Sao_Paulo",
    },
    async (event) => {
        const bucket = admin.storage().bucket();
        console.log(
            "INICIANDO TAREFA AGENDADA: Limpeza de imagens com mais de 360 dias...",
        );

        try {
            const [files] = await bucket.getFiles({
                prefix: "comprovantes-pix/",
            });
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - 360);
            const promises = files
                .filter((v) => {
                    if (!v.name.endsWith("/")) {
                        const dataArquivo = new Date(v.metadata.timeCreated!);
                        return dataArquivo < dataLimite;
                    }
                    return false;
                })
                .map((v) => v.delete());

            await Promise.all(promises);
            console.log(
                "Limpeza de imagens fora do prazo finalizada com sucesso!",
            );
        } catch (error) {
            console.error("ERRO na limpeza de imagens:", error);
            return;
        }
    },
);

interface SalvarNotificacaoFront {
    usuarioId: string;
    token?: string;
    permissao: "granted" | "denied" | "default";
}

export const salvarNotificacao = functions.https.onCall(async (request) => {
    const { db, user } = await validarUsuario(request);
    const { permissao, usuarioId, token } =
        request.data as SalvarNotificacaoFront;

    const podeEnviar = permissao === "granted";

    if (
        !permissao ||
        !usuarioId ||
        user.uid !== usuarioId ||
        (podeEnviar && !token)
    ) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const promises = [];

    const tokensRef = db
        .collection("usuarios")
        .doc(user.uid)
        .collection("tokens");
    const tokensSnap = await tokensRef.get();
    const tokens = tokensSnap.docs.map((v) => v.id);

    if (podeEnviar) {
        if (!tokens.includes(token!)) {
            promises.push(
                tokensRef
                    .doc(token!)
                    .create({ token, data_criacao: Timestamp.now() }),
            );
            tokens.push(token!);
        }
    } else if (user?.tokens === 1) {
        if (!tokensSnap.empty) {
            promises.push(...tokensSnap.docs.map((v) => v.ref.delete()));
        }
    }

    await Promise.all([
        ...promises,
        db
            .collection("usuarios")
            .doc(user.uid)
            .update({
                tokens: podeEnviar
                    ? tokens.length
                    : user?.tokens
                      ? FieldValue.increment(-1)
                      : 0,
            }),
    ]);

    enviarLog(
        user,
        request,
        "SALVAR_NOTIFICACAO",
        `Atualização de notificação realizada por ${user.uid}`,
    );

    return { message: "Permissão de notificação atualizado com sucesso" };
});

export const enviarNotificacao = functions.https.onCall(async (request) => {
    const { user, isSecretario, isSuperAdmin, db } =
        await validarUsuario(request);
    const { destinarios, titulo, mensagem } = request.data as any;

    if (!titulo || !mensagem || !destinarios) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    if (
        (!isSuperAdmin &&
            (destinarios === Roles.SUPER_ADMIN ||
                destinarios === Roles.PASTOR_PRESIDENTE)) ||
        user.role === Roles.SECRETARIO_CLASSE ||
        (isSecretario &&
            destinarios !== "todos" &&
            destinarios !== Roles.PROFESSOR &&
            destinarios !== Roles.SECRETARIO_CLASSE)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }

    let q = db.collection("usuarios").where("tokens", ">", 0);

    if (isSecretario) q = q.where("classeId", "==", user.classeId);
    else {
        const key = isSuperAdmin ? "ministerioId" : "igrejaId";
        q = q.where(key, "==", user[key]);
        if (destinarios !== "todos") q = q.where("role", "==", destinarios);
    }

    try {
        const usuariosSnap = await q.get();

        if (usuariosSnap.empty)
            return {
                message: "Nenhum usuário localizado para enviar a mensagem",
            };

        const tokensMap = new Map();
        const listaTokensMap = new Map();
        await Promise.all(
            usuariosSnap.docs.map(async (v) => {
                const token = await v.ref.collection("tokens").get();

                if (token.empty) await v.ref.update({ tokens: 0 });
                else
                    token.docs.forEach((t) => {
                        const listaTokens = listaTokensMap.get(v.id) || [];
                        listaTokens.push(t.id);
                        listaTokensMap.set(v.id, listaTokens);

                        tokensMap.set(t.id, v.id);
                    });
            }),
        );

        const tokens = [...tokensMap.keys()] as string[];

        const payload = {
            notification: {
                title: titulo,
                body: mensagem,
            },
            webpush: {
                notification: {
                    icon: "https://dominicando.web.app/web-app-manifest-192x192.png",
                },
            },
            tokens,
        };

        const resultado = await admin.messaging().sendEachForMulticast(payload);

        if (!resultado.failureCount) {
            console.log(
                `Notificação enviada com sucesso por ${user.uid}. Total de envio:${resultado.successCount}. Não Houve falhas`,
            );
            return { message: "Notificação enviada com sucesso" };
        }

        const usuariosComErro = new Set();
        await Promise.all(
            resultado.responses.map((v, i) => {
                console.log("erro", v.error);
                console.log("stack", v.error?.stack);

                if (
                    v.error &&
                    v!.error.code.includes(
                        "messaging/registration-token-not-registered",
                    )
                ) {
                    const token = tokens[i];
                    const userId = tokensMap.get(token);
                    usuariosComErro.add(userId);

                    const listaTokens = listaTokensMap.get(userId) as any[];
                    listaTokens.splice(
                        listaTokens.findIndex((v) => v === token),
                        1,
                    );

                    return db
                        .collection("usuarios")
                        .doc(userId)
                        .collection("tokens")
                        .doc(token)
                        .delete();
                }

                return;
            }),
        );

        if (usuariosComErro.size) {
            usuariosComErro.forEach((v: any) => {
                db.collection("usuarios")
                    .doc(v)
                    .update({ tokens: listaTokensMap.get(v).length });
            });
        }

        console.log(
            `Notificação enviada com sucesso por ${user.uid}. Total de envio: ${resultado.successCount}. Total de erros: ${resultado.failureCount}. Limpeza realizada com sucesso!`,
        );
        return { message: "Notificação enviada com sucesso." };
    } catch (Error: any) {
        console.log("Houve um ao enviar a notificação", Error);
        throw new functions.https.HttpsError("internal", Error.message);
    }
});

interface NovoTrimestreAulasFront {
    licaoPreparoId: string | null;
    dados: {
        titulo: string;
        numero_aulas: number;
        data_inicio: string;
        img?: string;
        trimestre: number;
    };
}

export const salvarLicaoAulaPreparo = functions.https.onCall(
    async (request) => {
        const { isSuperAdmin, db, user } = await validarUsuario(request);
        if (!isSuperAdmin) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para fazer isso.",
            );
        }

        const {
            licaoPreparoId,
            dados: { data_inicio, numero_aulas, titulo, trimestre, img },
        } = request.data as NovoTrimestreAulasFront;

        if (!data_inicio || !numero_aulas || !titulo || !trimestre) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados inválidos ou ausentes",
            );
        }

        const dataAtual = new Date(data_inicio + "T12:00:00");
        const dataFinal = new Date(data_inicio + "T12:00:00");
        dataFinal.setDate(dataAtual.getDate() + (numero_aulas - 1) * 7);

        const dadosAtualizados: { [key: string]: any } = {
            data_inicio: Timestamp.fromDate(dataAtual),
            data_final: Timestamp.fromDate(dataFinal),
            numero_aulas,
            ministerioId: user.ministerioId,
            titulo,
            trimestre,
            img: img ? img : null,
        };

        if (licaoPreparoId) {
            const licaoRef = db
                .collection("licoes_preparo")
                .doc(licaoPreparoId);
            const licaoSnap = await licaoRef.get();

            if (
                !licaoSnap.exists ||
                user.ministerioId !== licaoSnap.data()?.ministerioId
            ) {
                throw new functions.https.HttpsError(
                    "not-found",
                    "Lição não encontrada ou ministério inválido",
                );
            }

            if (licaoSnap.data()?.numero_aulas !== numero_aulas) {
                const aulasMap = new Map(
                    Array.from(
                        Object.entries(licaoSnap.data()?.status_aulas || {}),
                    ),
                );

                const status_aulas = Array.from({ length: numero_aulas }).map(
                    (_, i) => {
                        return [
                            String(i + 1),
                            aulasMap.get(String(i + 1)) || false,
                        ];
                    },
                );

                dadosAtualizados["status_aulas"] =
                    Object.fromEntries(status_aulas);
            }

            await licaoRef.update(dadosAtualizados);

            enviarLog(
                user,
                request,
                "SALVAR_LICAO_AULAS_PREPARO",
                `Lição atualizada com sucesso pelo usuário: ${user.uid}`,
                { dadosAtualizados },
            );

            return { message: `Lição atualizada com sucesso.` };
        }

        const dadosParaSalvar = {
            ...dadosAtualizados,
            status_aulas: Object.fromEntries(
                Array.from({ length: numero_aulas }).map((_, i) => [
                    String(i + 1),
                    false,
                ]),
            ),
            ativo: true,
            ultima_aula: null,
        };

        const licaoPreparoRef = db.collection("licoes_preparo").doc();
        const batch = db.batch();
        batch.create(licaoPreparoRef, dadosParaSalvar);
        const licoesAnteriores = await db
            .collection("licoes_preparo")
            .where("ativo", "==", true)
            .get();

        if (!licoesAnteriores.empty) {
            licoesAnteriores.docs.forEach((v) =>
                batch.update(v.ref, { ativo: false }),
            );
        }

        Array.from({ length: numero_aulas }).forEach((_, i) => {
            const aula = i + 1;
            const aulaRef = licaoPreparoRef
                .collection("aulas")
                .doc(String(aula));
            const dadosAula = {
                aula,
                titulo_aula: null,
                link_youtube: null,
                trimestre: `${trimestre}º Trimestre de ${dataAtual.getFullYear()}`,
                total_visualizacoes: 0,
                realizado: false,
            };

            batch.create(aulaRef, dadosAula);
        });

        await batch.commit();

        enviarLog(
            user,
            request,
            "SALVAR_LICAO_AULAS_PREPARO",
            `Lição cadastrada com sucesso pelo usuário: ${user.uid}`,
            { dadosParaSalvar },
        );

        return { message: `Lição atualizada com sucesso.` };
    },
);

export const deletarLicaoAulaPreparo = functions.https.onCall(
    async (request) => {
        const { db, isSuperAdmin, user } = await validarUsuario(request);

        if (!isSuperAdmin) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para fazer isso",
            );
        }

        const { licaoPreparoId } = request.data;
        if (!licaoPreparoId) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Argumentos inválidos ou ausentes",
            );
        }

        const licaoRef = db.collection("licoes_preparo").doc(licaoPreparoId);
        const licaoSnap = await licaoRef.get();
        const licaoAnterior = await db
            .collection("licoes_preparo")
            .where(admin.firestore.FieldPath.documentId(), "!=", licaoPreparoId)
            .where("ministerioId", "==", user.ministerioId)
            .orderBy("data_inicio", "desc")
            .limit(1)
            .get();

        if (
            !licaoSnap.exists ||
            user.ministerioId !== licaoSnap.data()?.ministerioId
        ) {
            throw new functions.https.HttpsError(
                "not-found",
                "Lição não encontrada ou de outro ministério",
            );
        }

        const refs = [licaoRef];

        const aulasSnaps = await licaoRef.collection("aulas").get();

        const promises = aulasSnaps.docs.map(async (v) => {
            refs.push(v.ref);

            const usuariosSnaps = await v.ref.collection("visualizacoes").get();
            if (!usuariosSnaps.empty)
                refs.push(...usuariosSnaps.docs.map((v) => v.ref));
        });

        await Promise.all(promises);

        let batch = db.batch();
        let count = 0;
        if (!licaoAnterior.empty && licaoSnap.data()?.ativo === true) {
            batch.update(licaoAnterior.docs[0].ref, { ativo: true });
            count++;
        }
        const batchs = [batch];
        for (let i = 0; i < refs.length; i++) {
            batch.delete(refs[i]);
            count++;

            if (count >= 499) {
                batch = db.batch();
                batchs.push(batch);
                count = 0;
            }
        }

        await Promise.all(batchs.map((v) => v.commit()));

        enviarLog(
            user,
            request,
            "DELETAR_LICAO_AULAS_PREPARO",
            `Lição e todos os dados associados, foram deletados com sucesso pelo usuário: ${user.uid}`,
        );

        return { message: `Lição deletada com sucesso.` };
    },
);

interface AulaPreparoFront {
    licaoId: string;
    aulaId: string;
    dados: { link_youtube: string; titulo_aula: string };
}

export const salvarAulaPreparo = functions.https.onCall(async (request) => {
    const { isSuperAdmin, db, user } = await validarUsuario(request);

    const {
        aulaId,
        licaoId,
        dados: { link_youtube, titulo_aula },
    } = request.data as AulaPreparoFront;

    if (!aulaId || !licaoId || !link_youtube || !titulo_aula) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const licaoRef = db.collection("licoes_preparo").doc(licaoId);
    const aulaRef = licaoRef.collection("aulas").doc(aulaId);
    const [aulaSnap, licaoSnap] = await Promise.all([
        aulaRef.get(),
        licaoRef.get(),
    ]);

    if (!aulaSnap.exists || !licaoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Lição ou aula não foram encontrados",
        );
    }

    if (!isSuperAdmin || licaoSnap.data()?.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    let link = link_youtube;
    if (!link_youtube.includes("embed")) {
        link =
            "https://youtube.com/embed" +
            link.slice(link_youtube.lastIndexOf("/"));
    }

    const status_aulas = {
        ...licaoSnap.data()!.status_aulas,
        [String(aulaId)]: true,
    };

    const ultima_aula = Object.entries(status_aulas).reduce(
        (prev, [aula, status]) =>
            status && Number(aula) > prev ? Number(aula) : prev,
        0,
    );

    await licaoRef.update({
        status_aulas,
        ultima_aula: ultima_aula
            ? licaoRef.collection("aulas").doc(String(ultima_aula))
            : null,
    });
    await aulaRef.update({
        link_youtube: link,
        titulo_aula,
        licaoId,
        realizado: true,
    });

    await aulaRef.collection("visualizacoes").doc("lista").set({ lista: {} });

    enviarLog(
        user,
        request,
        "SALVAR_AULA_PREPARO",
        `Aula salva com sucesso por ${user.uid}`,
    );

    return { message: `Aula salva com sucesso!` };
});

export const deletarAulaPreparo = functions.https.onCall(async (request) => {
    const { isSuperAdmin, db, user } = await validarUsuario(request);

    const { aulaId, licaoId } = request.data;

    if (!aulaId || !licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const licaoRef = db.collection("licoes_preparo").doc(licaoId);
    const aulaRef = licaoRef.collection("aulas").doc(aulaId);
    const [aulaSnap, licaoSnap] = await Promise.all([
        aulaRef.get(),
        licaoRef.get(),
    ]);

    if (!aulaSnap.exists || !licaoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Lição ou aula não foram encontrados",
        );
    }

    if (!isSuperAdmin || licaoSnap.data()?.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const status_aulas = {
        ...licaoSnap.data()!.status_aulas,
        [String(aulaId)]: false,
    };

    const ultima_aula = Object.entries(status_aulas).reduce(
        (prev, [aula, status]) =>
            status && Number(aula) > prev ? Number(aula) : prev,
        0,
    );

    await licaoRef.update({
        status_aulas,
        ultima_aula: ultima_aula
            ? licaoRef.collection("aulas").doc(String(ultima_aula))
            : null,
    });
    await aulaRef.update({
        link_youtube: null,
        titulo_aula: null,
        realizado: false,
    });
    const visualizacoesDocs = await aulaRef.collection("visualizacoes").get();
    await Promise.all(visualizacoesDocs.docs.map((v) => v.ref.delete()));

    enviarLog(
        user,
        request,
        "DELETAR_AULA_PREPARO",
        `Aula deletada com sucesso por ${user.uid}`,
    );

    return { message: `Aula deletada com sucesso!` };
});

export const registrarVisualizacao = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);

    if (user.role === Roles.SECRETARIO_CLASSE || isSuperAdmin) {
        return {
            message: "Você não pode registrar uma visualização nesse vídeo",
        };
    }

    const { licaoId, aulaId } = request.data;

    if (!licaoId || !aulaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const licaoRef = db.collection("licoes_preparo").doc(licaoId);
    const aulaRef = licaoRef.collection("aulas").doc(aulaId);

    const [licaoSnap, aulaSnap] = await Promise.all([
        licaoRef.get(),
        aulaRef.get(),
    ]);

    if (!licaoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Lição não encontrada",
        );
    } else if (!aulaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Aula não encontrada",
        );
    }

    const dadosParaSalvar = {
        nome: user.nome,
        igreja: user.igrejaNome,
        classe: user.classeNome,
        ultima_visualizacao: Timestamp.now(),
    };

    const registroRef = aulaRef.collection("visualizacoes").doc("lista");

    await registroRef.update({
        [`lista.${user.uid}`]: {
            ...dadosParaSalvar,
            contagem_visualizacoes: FieldValue.increment(1),
        },
    });

    enviarLog(
        user,
        request,
        "REGISTRAR_VISUALIZACAO",
        `Visualização do usuário ${user.uid} contabilizada com sucesso!`,
        { dadosParaSalvar },
    );

    return { message: "Visualização contabilizada com sucesso" };
});

// --- Pedidos ---
interface FormEstruturaFront {
    titulo?: string;
    idKey?: string;
    campos: any[];
}
interface FormularioFront {
    modeloId?: string;
    dados: {
        titulo: string;
        descricao?: string;
        data_inicio: string;
        data_fim: string;
        tipo: "modelo" | "formulario";
        nomeModelo?: string;
        estrutura: FormEstruturaFront[];
    };
}
export const salvarFormularioPedido = functions.https.onCall(
    async (request) => {
        const { db, isSuperAdmin, user } = await validarUsuario(request);

        if (!isSuperAdmin) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para isso.",
            );
        }

        const {
            dados: {
                data_fim,
                data_inicio,
                tipo,
                titulo,
                estrutura,
                descricao,
                nomeModelo,
            },
            modeloId,
        } = request.data as FormularioFront;

        if (
            !data_fim ||
            !data_inicio ||
            (tipo !== "formulario" && tipo !== "modelo") ||
            !titulo ||
            !estrutura
        ) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados inválidos ou ausentes.",
            );
        }

        const dadosPedido: any = {
            titulo,
            descricao,
            data_inicio: Timestamp.fromDate(
                new Date(data_inicio + "T12:00:00"),
            ),
            data_fim: Timestamp.fromDate(new Date(data_fim + "T12:00:00")),
            tipo,
            nomeModelo,
        };

        if (modeloId) {
            const pedidoRef = db.collection("pedidos").doc(modeloId);
            const pedidoSnap = await pedidoRef.get();

            if (pedidoSnap.exists) {
                const pedidoData = pedidoSnap.data();

                if (pedidoData?.tipo === "formulario") {
                    await pedidoRef.update(dadosPedido);

                    const estrururaSnap = await pedidoRef
                        .collection("estrutura")
                        .doc("dados")
                        .get();
                    await estrururaSnap.ref.update("estrutura", estrutura);

                    enviarLog(
                        user,
                        request,
                        "SALVAR_FORMULARIO_PEDIDO",
                        `Formulário atualizado com sucesso pelo usuário: ${user.uid}`,
                    );

                    return { id: modeloId };
                } else if (tipo === "modelo") {
                    throw new functions.https.HttpsError(
                        "invalid-argument",
                        "Modelo já existe",
                    );
                }
            }
        }

        dadosPedido.ministerioId = user.ministerioId;

        const batch = db.batch();
        const pedidoRef = db.collection("pedidos").doc();
        batch.set(pedidoRef, dadosPedido);
        batch.set(pedidoRef.collection("estrutura").doc("dados"), {
            estrutura: estrutura || [],
        });

        await batch.commit();

        enviarLog(
            user,
            request,
            "SALVAR_FORMULARIO_PEDIDO",
            `Formulário salvo com sucesso pelo usuário: ${user.uid}`,
        );

        return { id: pedidoRef.id, tipo: dadosPedido?.tipo };
    },
);

interface SalvarRespostaPedidoFront {
    modeloId: string;
    total_ofertas: number;
    respostas: { [idKey: string]: number | string };
}

export const salvarRespostaPedido = functions.https.onCall(async (request) => {
    const { db, isSecretario, user } = await validarUsuario(request);

    if (isSecretario) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const { modeloId, respostas, total_ofertas } =
        request.data as SalvarRespostaPedidoFront;
    if (!modeloId || !respostas || typeof total_ofertas !== "number") {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const [modeloSnap, estruturaSnap] = await Promise.all([
        db.collection("pedidos").doc(modeloId).get(),
        db
            .collection("pedidos")
            .doc(modeloId)
            .collection("estrutura")
            .doc("dados")
            .get(),
    ]);

    if (!modeloSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Modelo não encontrado",
        );
    }

    const modelo = modeloSnap.data();
    const dataEncerramento = modelo?.data_fim.toDate();
    const dataAtual = new Date();
    dataAtual.setHours(11, 0, 0, 0);

    if (dataAtual > dataEncerramento) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "O formulário já foi encerrado",
        );
    }

    const { estrutura } = estruturaSnap.data() as {
        estrutura: FormEstruturaFront[];
    };

    const dadosMap = new Map();
    estrutura.forEach((v) => {
        v.campos.forEach((v) => {
            const id = v.idKey;
            const resposta = respostas[id];
            const obj = {
                ...v,
                resposta,
            };

            dadosMap.set(id, obj);
        });
    });

    const dadosParaSalvar = {
        ministerioId: user.ministerioId,
        igrejaId: user.igrejaId,
        estrutura: Object.fromEntries(dadosMap.entries()),
        total_ofertas,
        data_resposta: Timestamp.fromDate(dataAtual),
        modeloId,
        envido_por: {
            email: user.email,
            nome: user.nome,
        },
    };

    await db
        .collection("pedidos_respostas")
        .doc(`${modeloId}_${user.igrejaId}`)
        .set(dadosParaSalvar, { merge: true });

    enviarLog(
        user,
        request,
        "SALVAR_RESPOSTA_PEDIDO",
        `Formulário salvo com sucesso por ${user.uid}`,
    );

    return { message: "Formulário salvo com sucesso" };
});

export const pegarRankingPublico = functions.https.onCall(async (request) => {
    const { igrejaId, licaoId } = request.data;

    if (!igrejaId || !licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados ausentes",
        );
    }
    const db = admin.firestore();
    const [cacheLicaoSnap, licaoSnap] = await Promise.all([
        db.collection("cache_licao").doc(`${igrejaId}_${licaoId}`).get(),
        db.collection("licoes").doc(licaoId).get(),
    ]);

    if (!licaoSnap.exists || !cacheLicaoSnap.exists) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados não encontrados",
        );
    }

    const licaoData = licaoSnap.data() as Licao;
    const cacheData = cacheLicaoSnap.data() as CacheLicaoInterface;
    const lista_aulas = [];
    const detalhes_aulas: any = {};
    const detalhes_aluno: any = {};

    const dataInicio = licaoData.data_inicio.toDate();
    for (let i = 0; i < licaoData.numero_aulas; i++) {
        const newDate = new Date(dataInicio);
        newDate.setDate(dataInicio.getDate() + i * 7);
        const dataString = newDate.toLocaleDateString("pt-BR");

        const aula = {
            numero: i + 1,
            data: Timestamp.fromDate(newDate),
            aulaRegistrada: {
                realizada: cacheData.detalhes_aulas[dataString] ? true : false,
            },
        };
        lista_aulas.push(aula);

        if (cacheData.detalhes_aulas[dataString]) {
            detalhes_aulas[dataString] = {
                chamada: cacheData.detalhes_aulas[dataString].chamada,
            };
        }
    }

    for (const alunoId in cacheData.detalhes_aluno) {
        const aluno = cacheData.detalhes_aluno[alunoId];
        const alunoNome = aluno.nome.trim().split(" ");

        const alunoObj = {
            ...aluno,
            nome: `${alunoNome[0]}${alunoNome.length > 1 ? ` ${alunoNome[alunoNome.length - 1][0]}.` : ""}`,
        };

        detalhes_aluno[alunoId] = alunoObj;
    }

    return { lista_aulas, detalhes_aulas, detalhes_aluno };
});

export const getLinkPortalAluno = functions.https.onCall(async (request) => {
    const { user } = await validarUsuario(request);

    const { alunoId, igrejaId, ministerioId } = request.data;
    if (ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const alunoHex = Buffer.from(alunoId).toString("hex");
    const igrejaHex = Buffer.from(igrejaId).toString("hex");

    const hash = new Hashids(process.env.CHAVE_SECRETA, 10);

    const alunoIdHash = hash.encodeHex(alunoHex);
    const igrejaIdHash = hash.encodeHex(igrejaHex);

    return { alunoIdHash, igrejaIdHash };
});
interface ConquistaInterface {
    icon: string;
    titulo: string;
    descricao: string;
    raridade: "comum" | "rara" | "epica" | "lendaria" | "unica";
    tipo: "manual" | "automatica";
    detalhes: {
        [licaoId: string]: {
            trimestre: string;
            licaoNome: string;
            licaoId: string;
            classeId: string;
            classeNome: string;
            data: number;
        };
    };
    multiplicador: number;
}

interface HistoricoPortalInterface {
    licaoId: string;
    data_inicio: number;
    data_fim: number;
    ano: number;
    titulo: string;
}

interface CachePortalAlunoInterface {
    alunoId: string;
    igrejaId: string;
    ministerioId: string;
    nome: string;
    data_nascimento: Timestamp;

    ultimaLicaoId?: string;

    conquistas: { [alunoId: string]: ConquistaInterface };
    ids_classes: string[];
    historico: { [licaoId: string]: HistoricoPortalInterface };
}

export const getPortalAluno = functions.https.onCall(async (request) => {
    const userUid = request.auth?.uid;
    const { dataNascimento, alunoHash, igrejaHash, alunoId, licaoId } =
        request.data;
    let dadosCachePortal;

    const db = admin.firestore();
    if (userUid && alunoId) {
        const { isSuperAdmin, user } = await validarUsuario(request);
        const alunoPortal = await db
            .collection(Cll.CACHE_PORTAL_ALUNO)
            .doc(alunoId)
            .get();

        if (!alunoPortal.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Dados inválidos ou ausentes",
            );
        }

        const aluno = alunoPortal.data() as CachePortalAlunoInterface;
        if (
            (!isSuperAdmin && aluno.igrejaId !== user.igrejaId) ||
            user.ministerioId !== aluno.ministerioId
        ) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para acessar isso.",
            );
        }

        dadosCachePortal = aluno;
    } else {
        const hash = new Hashids(process.env.CHAVE_SECRETA, 10);
        const alunoIdDecode = hash.decodeHex(alunoHash);
        const igrejaIdDecode = hash.decodeHex(igrejaHash);

        const alunoId = Buffer.from(alunoIdDecode, "hex").toString("utf8");
        const igrejaId = Buffer.from(igrejaIdDecode, "hex").toString("utf8");

        const alunoSnap = await db
            .collection(Cll.CACHE_PORTAL_ALUNO)
            .doc(alunoId)
            .get();
        const alunoPortal = alunoSnap.data() as CachePortalAlunoInterface;

        if (
            !alunoSnap.exists ||
            alunoPortal.data_nascimento.toDate().toLocaleDateString("pt-BR") !==
                dataNascimento ||
            alunoPortal.igrejaId !== igrejaId
        ) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Houve um erro ao acessar o portal. Veja com seu professor se seus dados estão cadastrados corretamente.",
            );
        }

        dadosCachePortal = alunoPortal;
    }

    const dadosResposta: any = {
        ...dadosCachePortal,
        licao_atual: {},
    };

    if (licaoId || dadosCachePortal.ultimaLicaoId) {
        const [cacheLicaoSnap, licaoSnap] = await Promise.all([
            db
                .collection(Cll.CACHE_LICAO)
                .doc(
                    `${dadosCachePortal.igrejaId}_${licaoId || dadosCachePortal.ultimaLicaoId}`,
                )
                .get(),
            db
                .collection(Cll.LICOES)
                .doc(licaoId || dadosCachePortal.ultimaLicaoId)
                .get(),
        ]);
        let pdf = "";

        if (licaoSnap.exists) {
            const licao = licaoSnap.data();
            pdf = licao?.pdf;
        }
        if (cacheLicaoSnap.exists) {
            const cacheLicao = cacheLicaoSnap.data() as CacheLicaoInterface;
            const licao: any = {
                classeNome: cacheLicao.classeNome,
                licaoNome: cacheLicao.licaoNome,
                data_inicio: cacheLicao.data_inicio.toMillis(),
                data_fim: cacheLicao.data_fim.toMillis(),
                pdf,
            };

            const chamada: any = {};
            for (const [data, detalhes] of Object.entries(
                cacheLicao.detalhes_aulas,
            )) {
                chamada[data] = detalhes.chamada?.[dadosCachePortal.alunoId];
            }

            licao["chamada"] = chamada;
            licao["detalhes_aluno"] =
                cacheLicao.detalhes_aluno[dadosCachePortal.alunoId];

            dadosResposta["licao_atual"] = licao;
        }
    }

    return dadosResposta;
});

export const setTrofeuAlunos = functions.https.onCall(async (request) => {
    const { db, user, isSecretario, isSuperAdmin } =
        await validarUsuario(request);

    const {
        trimestre,
        licaoId,
        licaoNome,
        classeId,
        classeNome,
        data,
        alunos,
        titulo,
        descricao,
        icon,
    } = request.data;

    if (
        !trimestre ||
        !licaoId ||
        !licaoNome ||
        !classeId ||
        !classeNome ||
        !data ||
        !alunos ||
        !titulo ||
        !descricao ||
        !icon
    ) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const licaoSnap = await db.collection(Cll.LICOES).doc(licaoId).get();
    const licao = licaoSnap.data();

    if (
        (!isSuperAdmin && licao?.igrejaId !== user.igrejaId) ||
        (isSecretario && licao?.classeId !== user.classeId) ||
        licao?.ministerioId !== user.ministerioId
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso.",
        );
    }

    const batch = db.batch();

    alunos.forEach((alunoId: any) => {
        const ref = db.collection(Cll.CACHE_PORTAL_ALUNO).doc(alunoId);
        batch.set(
            ref,
            {
                conquistas: {
                    [titulo.toLowerCase().replace(/\s/g, "_")]: {
                        descricao,
                        icon,
                        multiplicador: FieldValue.increment(1),
                        titulo,
                        raridade: "unica",
                        tipo: "manual",
                        detalhes: {
                            [licaoId]: {
                                classeId,
                                classeNome,
                                data,
                                licaoId,
                                licaoNome,
                                trimestre,
                            },
                        },
                    },
                },
            },
            { merge: true },
        );
    });

    await batch.commit();
    return { message: "Troféu enviado com sucesso" };
});

interface FormNovoTrimestreGlobal {
    img?: string;
    pdf?: string;
    rotuloId: string;
    data_inicio: string;
    numero_aulas: number;
    numero_trimestre: number;
    titulo: string;
    igrejas: string[];
    licaoId?: string;
}

interface LicaoGlobalInterface {
    ativo: boolean;
    img: string | null;
    pdf: string | null;
    rotuloId: string;
    data_fim: Timestamp;
    data_inicio: Timestamp;
    ministerioId: string;
    numero_aulas: number;
    numero_trimestre: number;
    titulo: string;
    igrejas: string[];
}

export const cadastrarNovaLicaoGlobal = functions.https.onCall(
    async (request) => {
        const { user, isSuperAdmin, db } = await validarUsuario(request);

        if (!isSuperAdmin) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para fazer isso",
            );
        }

        const {
            data_inicio,
            igrejas,
            numero_aulas,
            numero_trimestre,
            rotuloId,
            titulo,
            img,
            pdf,
            licaoId,
        } = request.data as FormNovoTrimestreGlobal;

        if (
            !data_inicio ||
            !igrejas.length ||
            !numero_aulas ||
            !numero_trimestre ||
            !rotuloId ||
            !titulo
        ) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Dados inválidos ou ausentes.",
            );
        }

        try {
            let batch = db.batch();
            const batches = [batch];
            let count = 0;
            const useBatch = (
                ref: admin.firestore.DocumentReference<any>,
                obj: { [key: string]: any },
                type: "update" | "set",
                merge?: any,
            ) => {
                if (type === "update") batch.update(ref, obj);
                else batch.set(ref, obj, merge);
                count++;
                if (count >= 499) {
                    batch = db.batch();
                    count = 0;
                    batches.push(batch);
                }
            };
            const batchUpdate = (
                ref: admin.firestore.DocumentReference<any>,
                obj: { [key: string]: any },
            ) => useBatch(ref, obj, "update");
            const batchSet = (
                ref: admin.firestore.DocumentReference<any>,
                obj: { [key: string]: any },
                merge = {},
            ) => useBatch(ref, obj, "set", merge);

            // Cadastrando nova lição
            const dataInicio = new Date(data_inicio + "T12:00:00");
            const dataFim = new Date(dataInicio);
            dataFim.setDate(dataFim.getDate() + (numero_aulas - 1) * 7);

            const dadosLicaoG: LicaoGlobalInterface = {
                ativo: true,
                data_inicio: Timestamp.fromDate(dataInicio),
                data_fim: Timestamp.fromDate(dataFim),
                igrejas,
                img: img ? img : null,
                pdf: pdf ? pdf : null,
                ministerioId: user.ministerioId,
                numero_aulas,
                numero_trimestre,
                rotuloId,
                titulo,
            };

            if (licaoId) {
                const licaoSnap = await db
                    .collection(Cll.LICOES_GLOBAIS)
                    .doc(licaoId)
                    .get();

                if (!licaoSnap.exists) {
                    throw new functions.https.HttpsError(
                        "not-found",
                        "Lição não encontrada",
                    );
                }
                const licao = licaoSnap.data() as LicaoGlobalInterface;

                batchUpdate(licaoSnap.ref, {
                    ...dadosLicaoG,
                    rotuloId: licao.rotuloId,
                    ativo: licao.ativo,
                });

                const igrejasNovas = igrejas.filter(
                    (v) => !licao.igrejas.includes(v),
                );

                if (igrejasNovas.length) {
                    const classesSnap = await db
                        .collection(Cll.CLASSES)
                        .where("igrejaId", "in", igrejasNovas)
                        .where("rotuloId", "==", rotuloId)
                        .get();
                    if (!classesSnap.empty) {
                        const classes = classesSnap.docs.map((v) => ({
                            id: v.id,
                            ...v.data(),
                        }));
                        const promise = classes.map(async (v: any) => {
                            const novaLicao = {
                                ativo: true,
                                classeId: v.id,
                                classeNome: v.nome,
                                data_inicio: dadosLicaoG.data_inicio,
                                data_fim: dadosLicaoG.data_fim,
                                igrejaId: v.igrejaId,
                                igrejaNome: v.igrejaNome,
                                img: dadosLicaoG.img,
                                ministerioId: v.ministerioId,
                                numero_aulas: dadosLicaoG.numero_aulas,
                                numero_trimestre: dadosLicaoG.numero_trimestre,
                                titulo: dadosLicaoG.titulo,
                                total_matriculados: 0,
                                licaoGlobalId: licaoId,
                                primeiroAcesso: true,
                                pdf: dadosLicaoG.pdf,
                            };

                            const [ultimaLicaoSnap, mesmaData] =
                                await Promise.all([
                                    db
                                        .collection(Cll.LICOES)
                                        .where("classeId", "==", v.id)
                                        .where("ativo", "==", true)
                                        .limit(1)
                                        .get(),
                                    db
                                        .collection(Cll.LICOES)
                                        .where("classeId", "==", v.id)
                                        .where("data_inicio", "==", dataInicio)
                                        .get(),
                                ]);

                            if (!mesmaData.empty) return;
                            if (!ultimaLicaoSnap.empty) {
                                const ultimaLicao =
                                    ultimaLicaoSnap.docs[0].data() as Licao;
                                if (
                                    ultimaLicao.data_inicio.toDate() >
                                    dataInicio
                                )
                                    novaLicao.ativo = false;
                                else
                                    batchUpdate(ultimaLicaoSnap.docs[0].ref, {
                                        ativo: false,
                                    });
                            }

                            const novaLicaoRef = db
                                .collection(Cll.LICOES)
                                .doc();
                            batchSet(novaLicaoRef, novaLicao);
                            for (let i = 0; i < numero_aulas; i++) {
                                const dataPrevista = new Date(dataInicio);
                                dataPrevista.setDate(
                                    dataPrevista.getDate() + i * 7,
                                );

                                const aulaRef = novaLicaoRef
                                    .collection("aulas")
                                    .doc(String(i + 1));
                                batch.set(aulaRef, {
                                    numero_aula: i + 1,
                                    data_prevista:
                                        Timestamp.fromDate(dataPrevista),
                                    realizada: false,
                                    registroRef: null,
                                });
                            }

                            const cache: CacheLicaoInterface = {
                                classeId: v.id,
                                classeNome: v.nome,
                                data_fim: dadosLicaoG.data_fim,
                                data_inicio: dadosLicaoG.data_inicio,
                                ministerioId: dadosLicaoG.ministerioId,
                                igrejaId: v.igrejaId,
                                igrejaNome: v.igrejaNome,
                                licaoId: novaLicaoRef.id,
                                licaoNome: novaLicao.titulo,
                                pico_presenca: 0,
                                total_matriculados: 0,
                                total_missoes: 0,
                                total_missoes_dinheiro: 0,
                                total_missoes_pix: 0,
                                total_ofertas: 0,
                                total_ofertas_dinheiro: 0,
                                total_ofertas_pix: 0,
                                detalhes_aulas: {},
                                detalhes_aluno: {},
                            };
                            batchSet(
                                db
                                    .collection(Cll.CACHE_LICAO)
                                    .doc(`${v.igrejaId}_${novaLicaoRef.id}`),
                                cache,
                            );
                        });
                        await Promise.all(promise);
                    }
                }

                const licoesParaAtualizar = await db
                    .collection(Cll.LICOES)
                    .where("licaoGlobalId", "==", licaoId)
                    .get();
                if (!licoesParaAtualizar.empty) {
                    const licoes = licoesParaAtualizar.docs
                        .map((v) => ({ id: v.id, ...v.data() }) as Licao)
                        .filter((v) => igrejas.includes(v.igrejaId));

                    const update = {
                        data_inicio: dadosLicaoG.data_inicio,
                        data_fim: dadosLicaoG.data_fim,
                        img: dadosLicaoG.img,
                        pdf: dadosLicaoG.pdf,
                        numero_aulas,
                        numero_trimestre,
                        titulo,
                    };
                    licoes.forEach((v) => {
                        batchUpdate(
                            db.collection(Cll.LICOES).doc(v.id),
                            update,
                        );
                    });
                }

                await Promise.all(batches.map((v) => v.commit()));
                enviarLog(
                    user,
                    request,
                    "CADASTRAR_NOVA_LICAO_GLOBAL",
                    `Dados atualizados com sucesso por ${user.uid}`,
                    licao,
                );

                return { message: "Dados atualizados com sucesso!" };
            }

            const ultimaLicaoSnap = await db
                .collection(Cll.LICOES_GLOBAIS)
                .where("rotuloId", "==", dadosLicaoG.rotuloId)
                .where("ativo", "==", true)
                .limit(1)
                .get();
            if (!ultimaLicaoSnap.empty) {
                const ultimaLicao = ultimaLicaoSnap.docs[0];
                const ultimaLicaoData =
                    ultimaLicao.data() as LicaoGlobalInterface;

                if (ultimaLicaoData.data_inicio.toDate() > dataInicio)
                    dadosLicaoG.ativo = false;
                else batchUpdate(ultimaLicao.ref, { ativo: false });
            }

            const licaoRef = db.collection(Cll.LICOES_GLOBAIS).doc();
            batchSet(licaoRef, dadosLicaoG);

            //Cadastrando Trimestre
            const trimestre = {
                ano: dataInicio.getFullYear(),
                data_fim: dadosLicaoG.data_fim,
                data_inicio: dadosLicaoG.data_inicio,
                ministerioId: dadosLicaoG.ministerioId,
                nome: `${
                    dadosLicaoG.numero_trimestre
                }º Trimestre de ${dataInicio.getFullYear()}`,
                numero_trimestre: dadosLicaoG.numero_trimestre,
            };
            const idTrimestre = `${dadosLicaoG.ministerioId}-${dataInicio
                .toLocaleDateString("pt-BR")
                .replace(/\//g, "-")}-${dataFim
                .toLocaleDateString("pt-BR")
                .replace(/\//g, "-")}-${dadosLicaoG.numero_trimestre}`;
            batchSet(
                db.collection(Cll.TRIMESTRES).doc(idTrimestre),
                trimestre,
                { merge: true },
            );

            // Cadastrando nas classes
            const classesDocs = await db
                .collection(Cll.CLASSES)
                .where("ministerioId", "==", user.ministerioId)
                .where("rotuloId", "==", rotuloId)
                .get();
            const classes = classesDocs.docs
                .map(
                    (v) =>
                        ({ id: v.id, ...v.data() }) as Classe & { id: string },
                )
                .filter((v: any) => igrejas.includes(v.igrejaId));

            const promise = classes.map(async (v) => {
                const novaLicao = {
                    ativo: true,
                    classeId: v.id,
                    classeNome: v.nome,
                    data_inicio: dadosLicaoG.data_inicio,
                    data_fim: dadosLicaoG.data_fim,
                    igrejaId: v.igrejaId,
                    igrejaNome: v.igrejaNome,
                    img: dadosLicaoG.img,
                    ministerioId: v.ministerioId,
                    numero_aulas: dadosLicaoG.numero_aulas,
                    numero_trimestre: dadosLicaoG.numero_trimestre,
                    titulo: dadosLicaoG.titulo,
                    total_matriculados: 0,
                    licaoGlobalId: licaoRef.id,
                    primeiroAcesso: true,
                    pdf: dadosLicaoG.pdf,
                };

                const [ultimaLicaoSnap, mesmaData] = await Promise.all([
                    db
                        .collection(Cll.LICOES)
                        .where("classeId", "==", v.id)
                        .where("ativo", "==", true)
                        .limit(1)
                        .get(),
                    db
                        .collection(Cll.LICOES)
                        .where("classeId", "==", v.id)
                        .where("data_inicio", "==", dataInicio)
                        .get(),
                ]);

                if (!mesmaData.empty) {
                    return;
                }
                if (!ultimaLicaoSnap.empty) {
                    const ultimaLicao = ultimaLicaoSnap.docs[0].data() as Licao;
                    if (ultimaLicao.data_inicio.toDate() > dataInicio) {
                        novaLicao.ativo = false;
                    } else
                        batchUpdate(ultimaLicaoSnap.docs[0].ref, {
                            ativo: false,
                        });
                }

                const novaLicaoRef = db.collection(Cll.LICOES).doc();
                batchSet(novaLicaoRef, novaLicao);

                for (let i = 0; i < numero_aulas; i++) {
                    const dataPrevista = new Date(dataInicio);
                    dataPrevista.setDate(dataPrevista.getDate() + i * 7);

                    const aulaRef = novaLicaoRef
                        .collection("aulas")
                        .doc(String(i + 1));
                    batchSet(aulaRef, {
                        numero_aula: i + 1,
                        data_prevista: Timestamp.fromDate(dataPrevista),
                        realizada: false,
                        registroRef: null,
                    });
                }

                const cache: CacheLicaoInterface = {
                    classeId: v.id,
                    classeNome: v.nome,
                    data_fim: dadosLicaoG.data_fim,
                    data_inicio: dadosLicaoG.data_inicio,
                    ministerioId: dadosLicaoG.ministerioId,
                    igrejaId: v.igrejaId,
                    igrejaNome: v.igrejaNome,
                    licaoId: novaLicaoRef.id,
                    licaoNome: novaLicao.titulo,
                    pico_presenca: 0,
                    total_matriculados: 0,
                    total_missoes: 0,
                    total_missoes_dinheiro: 0,
                    total_missoes_pix: 0,
                    total_ofertas: 0,
                    total_ofertas_dinheiro: 0,
                    total_ofertas_pix: 0,
                    detalhes_aulas: {},
                    detalhes_aluno: {},
                };
                batchSet(
                    db
                        .collection(Cll.CACHE_LICAO)
                        .doc(`${v.igrejaId}_${novaLicaoRef.id}`),
                    cache,
                );
            });
            await Promise.all(promise);

            await Promise.all(batches.map((v) => v.commit()));

            enviarLog(
                user,
                request,
                "CADASTRAR_NOVA_LICAO_GLOBAL",
                `Dados cadastrados com sucesso por ${user.uid}`,
            );

            return { message: "Lições cadastradas com sucesso!" };
        } catch (err: any) {
            console.log("houve um erro ao cadastrar a lição", err);
            throw new functions.https.HttpsError(
                "internal",
                "Houve um erro ao cadastrar a lição",
            );
        }
    },
);
export const apagarLicaoGlobal = functions.https.onCall(async (request) => {
    const { user, isSuperAdmin, db } = await validarUsuario(request);

    if (!isSuperAdmin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não pode fazer isso",
        );
    }

    const { licaoId } = request.data;
    if (!licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes",
        );
    }

    const licaoSnap = await db
        .collection(Cll.LICOES_GLOBAIS)
        .doc(licaoId)
        .get();
    if (!licaoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Lição não encontrada",
        );
    }

    const licaoG = licaoSnap.data() as LicaoGlobalInterface;
    if (licaoG.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso",
        );
    }

    try {
        let batch = db.batch();
        let count = 0;
        const batches = [batch];
        const useBatch = (
            ref: admin.firestore.DocumentReference<any>,
            tipo: "delete" | "update",
            obj = {},
        ) => {
            if (tipo === "delete") batch.delete(ref);
            else batch.update(ref, obj);

            count++;

            if (count >= 499) {
                batch = db.batch();
                count = 0;
                batches.push(batch);
            }
        };
        const batchUpdate = (
            ref: admin.firestore.DocumentReference<any>,
            obj: { [key: string]: any },
        ) => useBatch(ref, "update", obj);
        const batchDelete = (ref: admin.firestore.DocumentReference<any>) =>
            useBatch(ref, "delete");

        const [licoesDocs, licaoAnteriorDocs] = await Promise.all([
            db
                .collection(Cll.LICOES)
                .where("licaoGlobalId", "==", licaoId)
                .where("ministerioId", "==", user.ministerioId)
                .get(),
            db
                .collection(Cll.LICOES_GLOBAIS)
                .where("data_inicio", "!=", licaoG.data_inicio)
                .where("ministerioId", "==", user.ministerioId)
                .where("rotuloId", "==", licaoG.rotuloId)
                .orderBy("data_inicio", "desc")
                .limit(1)
                .get(),
        ]);

        if (!licaoAnteriorDocs.empty) {
            const licaoAnteriorSnap = licaoAnteriorDocs.docs[0];
            batchUpdate(licaoAnteriorSnap.ref, { ativo: true });
        }
        if (licoesDocs.empty) {
            await licaoSnap.ref.delete();
            const storage = admin.storage();
            const bucket = storage.bucket();
            const regex = /\/o\/(.*)\?/;
            if (licaoG?.pdf) {
                const caminho = licaoG.pdf.match(regex);
                if (caminho) {
                    const url = decodeURIComponent(caminho[1]);
                    await bucket.file(url).delete();
                }
            }
            if (licaoG?.img) {
                const caminho = licaoG.img.match(regex);
                if (caminho) {
                    const url = decodeURIComponent(caminho[1]);
                    await bucket.file(url).delete();
                }
            }

            enviarLog(
                user,
                request,
                "APAGAR_LICAO_GLOBAL",
                `Lição deletada com sucesso pelo usuário ${user.uid}`,
            );
            return { message: "Lição deletada com sucesso!" };
        }
        const licoesIds = licoesDocs.docs.map((v) => v.id);

        const promises = [];
        for (let i = 0; i < licoesDocs.size; i += 30) {
            const chunck = licoesIds.slice(i, i + 30);
            promises.push(
                db
                    .collection(Cll.CACHE_LICAO)
                    .where("licaoId", "in", chunck)
                    .get(),
            );
        }

        console.log("temos um total de", licoesIds.length);
        const licoes = (await Promise.all(promises))
            .flatMap((v) => v.docs)
            .map(
                (v) =>
                    ({ ...v.data(), id: v.id }) as CacheLicaoInterface & {
                        id: string;
                    },
            )
            .filter((v: any) => !Object.keys(v.detalhes_aulas).length);
        console.log("a exclusão será feita em", licoes.length);

        batchDelete(licaoSnap.ref);
        licoes.forEach((v: any) => {
            batchDelete(db.collection(Cll.CACHE_LICAO).doc(v.id));
            batchDelete(db.collection(Cll.LICOES).doc(v.licaoId));
        });
        const aulasAnteriores = licoes.map(async (v) => {
            const aulasDocs = await db
                .collection(Cll.LICOES)
                .doc(v.licaoId)
                .collection("aulas")
                .get();

            if (aulasDocs.empty) return;

            aulasDocs.docs.forEach((v) => batchDelete(v.ref));
        });
        const licoesAnteriores = licoes.map(async (v) => {
            const lAnteriorDocs = await db
                .collection(Cll.LICOES)
                .where("data_inicio", "!=", v.data_inicio)
                .where("classeId", "==", v.classeId)
                .orderBy("data_inicio", "desc")
                .limit(1)
                .get();
            if (lAnteriorDocs.empty) return;

            const lAnterior = lAnteriorDocs.docs[0];
            batchUpdate(lAnterior.ref, { ativo: true });
        });
        await Promise.all([...licoesAnteriores, ...aulasAnteriores]);

        const storage = admin.storage();
        const bucket = storage.bucket();
        const regex = /\/o\/(.*)\?/;
        if (licaoG.pdf) {
            const caminho = licaoG.pdf.match(regex);
            if (caminho) {
                const url = decodeURIComponent(caminho[1]);
                await bucket.file(url).delete();
            }
        }

        await batch.commit();

        enviarLog(
            user,
            request,
            "APAGAR_LICAO_GLOBAL",
            `Lição deletada com sucesso pelo usuário ${user.uid}`,
        );
        return { message: "Lição deletada com sucesso!" };
    } catch (error: any) {
        console.log("erro ao deletar lição", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar a lição",
        );
    }
});
