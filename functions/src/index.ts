import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { FieldValue, QuerySnapshot, Timestamp } from "firebase-admin/firestore";
import JSZip from "jszip";

enum Roles {
    PASTOR_PRESIDENTE = "pastor_presidente",
    SUPER_ADMIN = "super_admin",
    PASTOR = "pastor",
    SECRETARIO_CONGREGACAO = "secretario_congregacao",
    PROFESSOR = "professor",
    SECRETARIO_CLASSE = "secretario_classe",
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

function gerarCodigo() {
    const c = Math.random().toString(36).substring(2, 8);
    return c;
}

async function validarUsuario(request: functions.https.CallableRequest) {
    if (!request.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "usuário não está logado"
        );
    }

    const { uid } = request.auth;
    const db = admin.firestore();
    const userDoc = await db.collection("usuarios").doc(uid).get();

    if (!userDoc.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "usuário não encontrado"
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

async function baseDashboard(
    usuario: ValidarUsuario,
    request: functions.https.CallableRequest,
    collection: string
) {
    const { db, isSecretario, isSuperAdmin, user } = usuario;

    const isLicao = collection === "licoes";
    let { dataInicio, dataFim } = request.data;
    if (!dataInicio || !dataFim) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "As datas são obrigatórias"
        );
    }

    dataInicio = new Date(dataInicio);
    dataInicio.setHours(0, 0, 0, 0);

    dataFim = new Date(dataFim);
    dataFim.setHours(23, 59, 59, 999);

    const baseQuery = db
        .collection(collection)
        .where(isLicao ? "data_inicio" : "data", ">=", dataInicio)
        .where(isLicao ? "data_fim" : "data", "<=", dataFim);

    let q;
    if (isSecretario) q = baseQuery.where("classeId", "==", user.classeId);
    else if (isSuperAdmin)
        q = baseQuery.where("ministerioId", "==", user.ministerioId);
    else q = baseQuery.where("igrejaId", "==", user.igrejaId);

    return q;
}

function calcRegistrosAula(
    documentos: admin.firestore.DocumentData[],
    isSuperAdmin: boolean,
    isSecretario: boolean,
    key: string
) {
    const itensTotal = documentos.map((v) => {
        const data = v.data();
        return {
            data: data.data.toDate().toLocaleDateString("pt-BR"),
            igreja: data.igrejaNome,
            classe: data.classeNome,
            [key]: data[key] || 0,
        };
    });

    if (!itensTotal.length) return [];

    if (isSecretario)
        return itensTotal.map((v) => ({ name: v.data, valor: v[key] }));
    else {
        const mapTotal = new Map<string, { [key: string]: any }>();
        const group = isSuperAdmin ? "igreja" : "classe";

        itensTotal.forEach((v) => {
            const data = v.data;
            const keyGroup = v[group];

            const item = mapTotal.get(data) || { name: data };
            item[keyGroup] = (item[keyGroup] || 0) + v[key];
            mapTotal.set(data, item);
        });

        return Array.from(mapTotal.values());
    }
}

async function calcTotalMatriculados(
    q: admin.firestore.Query,
    db: admin.firestore.Firestore,
    isSuperAdmin: boolean,
    isSecretario: boolean
) {
    const mapLicoes = new Map<string, any>();
    (await q.get()).docs.forEach((v) => mapLicoes.set(v.id, v.data()));

    const licoesIds = Array.from(mapLicoes.keys());

    const promisesMatriculas = [];
    const matriculasQuery = db.collection("matriculas");
    for (let i = 0; i < licoesIds.length; i += 30) {
        const licoesSplice = licoesIds.slice(i, i + 30);
        promisesMatriculas.push(
            matriculasQuery.where("licaoId", "in", licoesSplice).get()
        );
    }
    const matriculas = (await Promise.all(promisesMatriculas)).flatMap((v) =>
        v.docs.map((d: any) => ({ ...d.data(), id: d.id }))
    ) as any[];

    if (isSecretario) {
        const mapMatriculas = new Map<string, number>();

        matriculas.forEach((m) => {
            const item = mapLicoes.get(m.licaoId);
            const name = m.licaoNome;
            if (item)
                mapMatriculas.set(name, (mapMatriculas.get(name) || 0) + 1);
        });

        return {
            listaMatriculados: matriculas,
            resultado: Array.from(mapMatriculas.entries()).map((v) => ({
                name: v[0],
                valor: v[1],
            })),
        };
    } else {
        const mapMatriculas = new Map<string, { [key: string]: any }>();
        const group = isSuperAdmin ? "igrejaNome" : "classeNome";

        matriculas.forEach((m) => {
            const item = mapLicoes.get(m.licaoId);
            if (item) {
                const name = m[group];
                const data = item.data_inicio
                    .toDate()
                    .toLocaleDateString("pt-BR");

                const value = mapMatriculas.get(data) || { name: data };
                value[name] = (value[name] || 0) + 1;
                mapMatriculas.set(data, value);
            }
        });

        return {
            listaMatriculados: matriculas,
            resultado: Array.from(mapMatriculas.values()),
        };
    }
}

async function getTotalMembros(
    db: admin.firestore.Firestore,
    isSuperAdmin: boolean,
    isSecretario: boolean,
    usuario: ValidarUsuario
) {
    const { user } = usuario;

    let baseQuery: any = db.collection("membros");
    if (isSuperAdmin)
        baseQuery = baseQuery.where("ministerioId", "==", user.ministerioId);
    else baseQuery = baseQuery.where("igrejaId", "==", user.igrejaId);

    const membrosSnap = await baseQuery.get();

    return membrosSnap;
}

admin.initializeApp();

export const getDashboard = functions.https.onCall(async (request) => {
    const usuario = await validarUsuario(request);
    const { isSecretario, isSuperAdmin, db } = usuario;

    const [qRegistros, qLicoes]: any[] = await Promise.all([
        baseDashboard(usuario, request, "registros_aula"),
        baseDashboard(usuario, request, "licoes"),
    ]);
    const docsRegistrosAula = (await qRegistros.get()).docs;

    const [
        total_ofertas,
        total_missoes,
        total_presentes,
        total_biblias,
        total_licoes,
        matriculados,
        membros,
    ] = await Promise.all([
        calcRegistrosAula(
            docsRegistrosAula,
            isSuperAdmin,
            isSecretario,
            "ofertas_total"
        ),
        calcRegistrosAula(
            docsRegistrosAula,
            isSuperAdmin,
            isSecretario,
            "missoes_total"
        ),
        calcRegistrosAula(
            docsRegistrosAula,
            isSuperAdmin,
            isSecretario,
            "total_presentes"
        ),
        calcRegistrosAula(
            docsRegistrosAula,
            isSuperAdmin,
            isSecretario,
            "biblias"
        ),
        calcRegistrosAula(
            docsRegistrosAula,
            isSuperAdmin,
            isSecretario,
            "licoes_trazidas"
        ),
        calcTotalMatriculados(qLicoes, db, isSuperAdmin, isSecretario),
        getTotalMembros(db, isSuperAdmin, isSecretario, usuario),
    ]);

    let total_membros_matriculados: any = {
        total_membros: 0,
        total_matriculados: 0,
    };
    if (!isSecretario && !membros.empty) {
        const membrosMap = new Map<
            string,
            { total_membros: number; total_matriculados: number }
        >();
        const matriculasSet = new Set(
            matriculados.listaMatriculados.map((v) => v.alunoId)
        );

        membros.docs.forEach((v: any) => {
            const membro = v.data();
            const value = membrosMap.get(membro.igrejaId) || {
                total_membros: 0,
                total_matriculados: 0,
            };
            value.total_membros += 1;

            if (membro?.alunoId && matriculasSet.has(membro?.alunoId))
                value.total_matriculados += 1;
            membrosMap.set(membro.igrejaId, value);
        });

        total_membros_matriculados = Object.fromEntries(membrosMap.entries());
    }

    const total_matriculados = matriculados.resultado;
    return {
        total_ofertas,
        total_missoes,
        total_presentes,
        total_biblias,
        total_licoes,
        total_matriculados,
        total_membros_matriculados,
    };
});

export const getRelatorioDominical = functions.https.onCall(async (request) => {
    const { db } = await validarUsuario(request);

    const { data, classes, igrejaId } = request.data;
    if (!data || (!classes && !igrejaId)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Data, classes ou igreja invalidos"
        );
    }

    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);
    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 59);

    const q = db
        .collection("registros_aula")
        .where("data", ">=", inicioDia)
        .where("data", "<=", fimDia);

    const promisesQ = [];
    for (let i = 0; i < classes.length; i += 30) {
        const classesSplit = classes.slice(i, i + 30);
        promisesQ.push(q.where("classeId", "in", classesSplit).get());
    }

    const todosRegistros = (await Promise.all(promisesQ)).flatMap(
        (v) => v.docs
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
        "missoes_total",
    ];

    registrosMap.forEach((r) => {
        colunas.forEach((c) => {
            const item = r[c];
            if (item) {
                const total = (totaisGeraisMap.get(c) || 0) + Number(item);
                totaisGeraisMap.set(c, total);
            }
        });
    });

    //Pegando aniversariantes da semana
    const inicioSemana = new Date(fimDia);
    inicioSemana.setDate(inicioSemana.getDate() - 6);
    const fimSemana = new Date(fimDia);

    const alunosSnap = await db
        .collection("alunos")
        .where("igrejaId", "==", igrejaId)
        .get();

    if (alunosSnap.empty)
        return {
            totais_gerais: Object.fromEntries(totaisGeraisMap.entries()),
            totais_classes: Object.fromEntries(registrosMap.entries()),
            classes_relatorio: classesRelatorio,
            aniversariantes: [],
        };

    const alunos = alunosSnap.docs.map((v) => ({
        id: v.id,
        ...v.data(),
    })) as any[];

    const alunosAtualizados = alunos.map((v) => ({
        ...v,
        data_nascimento: new Date(
            v["data_nascimento"].toDate().setFullYear(fimSemana.getFullYear())
        ),
    }));

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
        totais_gerais: Object.fromEntries(totaisGeraisMap.entries()),
        totais_classes: Object.fromEntries(registrosMap.entries()),
        classes_relatorio: classesRelatorio,
        aniversariantes: aniversariantes,
    };
});

// Abaixo as funções de adicionar dados

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

// Membros
export const salvarMembro = functions.https.onCall(async (request) => {
    const { db, user, isSecretario, isAdmin } = await validarUsuario(request);

    const { dados, igrejaId, membroId } = request.data as MembroFront;

    if (!igrejaId || !dados) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes."
        );
    }

    const igreja = await db.collection("igrejas").doc(igrejaId).get();
    if (isSecretario || user.ministerioId !== igreja.data()?.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso"
        );
    }

    const dadosParaSalvar: Membro = {
        contato: dados.contato || null,
        data_nascimento: Timestamp.fromDate(
            new Date(dados.data_nascimento + "T12:00:00")
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
                "Membro não encontrado"
            );
        }

        if (isAdmin) dadosParaSalvar.igrejaId = user.igrejaId; //Apenas por precaução

        await membroRef.update(dadosParaSalvar as any);

        const notificao: Notificacao = {
            evento: "SALVAR_MEMBRO",
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: {
                    dadosParaSalvar,
                    dadosAnteriores: membroSnap.data(),
                },
            },
            message: `Membro atualizado com sucesso por ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));

        return { id: membroId, ...membroSnap.data(), ...dadosParaSalvar };
    }

    dadosParaSalvar["alunoId"] = null;
    const membroRef = await db.collection("membros").add(dadosParaSalvar);

    const notificao: Notificacao = {
        evento: "SALVAR_MEMBRO",
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: { dadosParaSalvar },
        },
        message: `Membro salvo com sucesso por ${user.uid}`,
    };
    console.log(JSON.stringify(notificao));
    return { id: membroRef.id, ...dadosParaSalvar };
});
export const deletarMembro = functions.https.onCall(async (request) => {
    const { db, user, isAdmin, isSecretario } = await validarUsuario(request);

    const { membroId } = request.data;
    if (!membroId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }

    const membroRef = db.collection("membros").doc(membroId);
    const membroSnap = await membroRef.get();

    if (!membroSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Membro não encontrado"
        );
    }
    if (
        membroSnap.data()?.ministerioId !== user.ministerioId ||
        (isAdmin && membroSnap.data()?.igrejaId !== user.igrejaId) ||
        isSecretario
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso."
        );
    }

    try {
        const batch = db.batch();
        batch.delete(membroRef);

        const alunoQuery = db
            .collection("alunos")
            .where("membroId", "==", membroId);
        const alunoSnap = await alunoQuery.get();

        if (!alunoSnap.empty) {
            alunoSnap.docs.forEach((v) =>
                batch.update(v.ref, { membroId: null, isMembro: false })
            );
        }

        await batch.commit();
        const notificao: Notificacao = {
            evento: "DELETAR_MEMBRO",
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { membroId },
            },
            message: `Aluno deletado com sucesso pelo usuário: ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { message: "Membro deletado com suscesso." };
    } catch (error) {
        console.log("Ocorreu um erro ao deletar membro", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar membro"
        );
    }
});

// --- Aluno ---
interface AlunoFront {
    nome_completo: string;
    data_nascimento: string;
    contato: string;
    isMembro: boolean;
    membroId?: string;
}

export const salvarAluno = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    let { alunoId, igrejaId } = request.data;
    const dados = request.data.dados as AlunoFront;

    if (isSuperAdmin && !igrejaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Id igreja não enviado"
        );
    }
    if (!isSuperAdmin) igrejaId = user.igrejaId;

    const dadosAtualizados = {
        ...dados,
        data_nascimento: admin.firestore.Timestamp.fromDate(
            new Date(dados.data_nascimento + "T12:00:00")
        ),
        membroId: dados.membroId || null,
    };

    if (alunoId) {
        const alunoRef = db.collection("alunos").doc(alunoId);
        const alunoDoc = await alunoRef.get();

        if (!alunoDoc.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Aluno não encontrado"
            );
        }

        if (dados.membroId) {
            await db
                .collection("membros")
                .doc(dados.membroId)
                .update({ alunoId: alunoDoc.id });
        }

        await alunoRef.update(dadosAtualizados);
        const notificao: Notificacao = {
            evento: "SALVAR_ALUNO",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { aluno: alunoDoc.data() },
            },
            message: `Aluno editado pelo usuário ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return {
            id: alunoDoc.id,
            ...alunoDoc.data(),
            ...dadosAtualizados,
        };
    }

    const igreja = await db.collection("igrejas").doc(igrejaId).get();
    if (!igreja.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada"
        );
    }
    if (igreja.data()?.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão par isso"
        );
    }

    const aluno = {
        ...dadosAtualizados,
        igrejaId,
        ministerioId: user.ministerioId,
        igrejaNome: igreja.data()!.nome,
    };

    const docRef = await db.collection("alunos").add(aluno);

    if (dados.membroId) {
        await db
            .collection("membros")
            .doc(dados.membroId)
            .update({ alunoId: docRef.id });
    }

    const notificao: Notificacao = {
        evento: "SALVAR_ALUNO",
        actor: {
            uid: user.uid,
            email: user.email,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: aluno,
        },
        message: `Aluno salvo pelo usuário ${user.uid}`,
    };
    console.log(JSON.stringify(notificao));
    return { id: docRef.id, ...aluno };
});
export const onAlunoUpdate = onDocumentUpdated(
    "alunos/{alunoId}",
    async (event) => {
        const dadosAntigos = event.data?.before.data();
        const dadosNovos = event.data?.after.data();

        if (!dadosAntigos || !dadosNovos) {
            console.log(
                "Dados ausentes no evento de atualização, encerrando a função."
            );
            return;
        }

        if (dadosAntigos.nome_completo === dadosNovos.nome_completo) {
            return;
        }

        const { alunoId } = event.params;
        const novoNome = dadosNovos.nome_completo;
        const db = admin.firestore();
        const batch = db.batch();

        console.log(
            `Aluno ${alunoId} mudou de nome para "${novoNome}". Iniciando fan-out...`
        );

        const matriculasQuery = db
            .collection("matriculas")
            .where("alunoId", "==", alunoId);
        const matriculasSnap = await matriculasQuery.get();
        matriculasSnap.forEach((doc) => {
            batch.update(doc.ref, { alunoNome: novoNome });
        });

        const licoesIds = matriculasSnap.docs
            .map((doc) => doc.data().licaoId)
            .filter(Boolean);

        if (licoesIds.length > 0) {
            const licoesPromises: Promise<QuerySnapshot>[] = [];

            for (let i = 0; i < licoesIds.length; i += 30) {
                const l = licoesIds.slice(i, i + 30);
                licoesPromises.push(
                    db
                        .collection("registros_aula")
                        .where("licaoId", "in", l)
                        .get()
                );
            }

            const registrosSnap = (await Promise.all(licoesPromises)).flatMap(
                (v) => v.docs
            );

            await Promise.all(
                registrosSnap.map(async (doc) => {
                    const chamadaRef = doc.ref
                        .collection("chamada")
                        .doc(alunoId);
                    const chamadaDoc = await chamadaRef.get();

                    if (chamadaDoc.exists)
                        batch.update(chamadaRef, { nome: novoNome });
                })
            );
        }

        await batch.commit();
        console.log(`Fan-out para o aluno ${alunoId} concluído com sucesso!`);
    }
);
export const deletarAluno = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    const { alunoId } = request.data;

    if (!alunoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }
    const alunosRef = db.collection("alunos").doc(alunoId);
    const alunosSnap = await alunosRef.get();

    if (!alunosSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Aluno não encontrado"
        );
    }
    if (
        (!isSuperAdmin && alunosSnap.data()?.igrejaId !== user.igrejaId) ||
        alunosSnap.data()?.ministerioId !== user.ministerioId
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso"
        );
    }

    try {
        const refsDel: any[] = [alunosRef];
        const licoesUpt: any[] = [];
        let count = 0;
        let batch = db.batch();

        const matriculasSnaps = await db
            .collection("matriculas")
            .where("alunoId", "==", alunoId)
            .get();
        matriculasSnaps.forEach((v) => {
            const matricula = v.data();
            refsDel.push(v.ref);
            licoesUpt.push(matricula.licaoRef);
        });

        const licoesIds = matriculasSnaps.docs.map((v) => v.data().licaoId);
        const promises = [];
        if (licoesIds.length > 0) {
            for (let i = 0; i < licoesIds.length; i += 30) {
                const chunk = licoesIds.slice(i, i + 30);
                promises.push(
                    db
                        .collection("registros_aula")
                        .where("licaoId", "in", chunk)
                        .get()
                );
            }

            const registrosDocs = (await Promise.all(promises)).flatMap(
                (v) => v.docs
            );

            const chamadas = registrosDocs.map(async (v) => {
                const aluno = await v.ref
                    .collection("chamada")
                    .doc(alunoId)
                    .get();

                if (aluno.exists) refsDel.push(aluno.ref);
            });

            await Promise.all(chamadas);
        }

        const membros = await db
            .collection("membros")
            .where("alunoId", "==", alunoId)
            .get();

        if (!membros.empty) {
            membros.docs.forEach((v) => {
                batch.update(v.ref, { alunoId: null });
                count++;
            });
        }

        const batchs = [batch];
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

        const notificao: Notificacao = {
            evento: "DELETAR_ALUNO",
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { alunos: alunosSnap.data() },
            },
            message: `Aluno e ${
                refsDel.length - 1
            } dados associados foram deletados com sucesso pelo usuário: ${
                user.uid
            }`,
        };
        console.log(JSON.stringify(notificao));
        return {
            message: `Aluno e todos os seus dados foram deletados com sucesso.`,
        };
    } catch (error) {
        console.log("deu esse erro", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve algum erro ao deletar o Aluno. Tente de novo."
        );
    }
});

// Classe
interface ClasseFront {
    igrejaId: string;
    nome: string;
    idade_minima: number | null;
    idade_maxima: number | null;
}
interface Classe extends ClasseFront {
    igrejaNome: string;
    ministerioId: string;
}

export const salvarClasse = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin, isSecretario } = await validarUsuario(
        request
    );
    if (isSecretario) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Secretário de classe ou professor não podem cadastrar outras classes"
        );
    }

    const { classeId } = request.data;
    let { igrejaId, nome, idade_minima, idade_maxima } = request.data
        .dados as ClasseFront;

    if (isSuperAdmin && !igrejaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Id igreja não enviado"
        );
    }
    if (!isSuperAdmin) igrejaId = user.igrejaId;

    const igreja = await db.collection("igrejas").doc(igrejaId).get();
    if (!igreja.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada"
        );
    }
    if (igreja.data()!.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso"
        );
    }

    const dadosAtualizados = {
        igrejaId,
        igrejaNome: igreja.data()!.nome,
        nome,
        idade_minima: typeof idade_minima !== "number" ? null : idade_minima,
        idade_maxima: typeof idade_maxima !== "number" ? null : idade_maxima,
    };
    if (classeId) {
        const classeRef = db.collection("classes").doc(classeId);
        const classeSnap = await classeRef.get();

        if (!classeSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe não encontrada"
            );
        }

        await classeRef.update(dadosAtualizados);
        const notificao: Notificacao = {
            evento: "SALVAR_CLASSE",
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: {
                    dadosAtualizados,
                    classe: classeSnap.data(),
                },
            },
            message: `Aluno editado pelo usuário ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
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

    const docRef = await db.collection("classes").add(classe);

    const notificao: Notificacao = {
        evento: "SALVAR_CLASSE",
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: dadosAtualizados,
        },
        message: `Aluno cadastrado pelo usuário ${user.uid}`,
    };
    console.log(JSON.stringify(notificao));
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
        const db = admin.firestore();
        const batch = db.batch();

        console.log(
            `Nome antigo: ${dadosAntigos.nome} | Nome novo: ${dadosNovos.nome}`
        );

        const licoes = await db
            .collection("licoes")
            .where("classeId", "==", classeId)
            .get();
        licoes.docs.forEach((doc) => batch.update(doc.ref, novoNome));

        const matriculas = await db
            .collection("matriculas")
            .where("classeId", "==", classeId)
            .get();
        matriculas.docs.forEach((doc) => batch.update(doc.ref, novoNome));

        const registros = await db
            .collection("registros_aula")
            .where("classeId", "==", classeId)
            .get();
        registros.docs.forEach((doc) => batch.update(doc.ref, novoNome));

        const usuarios = await db
            .collection("usuarios")
            .where("classeId", "==", classeId)
            .get();
        usuarios.forEach((doc) => batch.update(doc.ref, novoNome));

        await batch.commit();
        console.log("Fan-out realizado, classe alterada!");
    }
);
export const deletarClasse = functions.https.onCall(async (request) => {
    const { db, isSecretario, isSuperAdmin, user } = await validarUsuario(
        request
    );

    const { classeId } = request.data;
    if (!classeId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }

    const classeRef = db.collection("classes").doc(classeId);
    const classeSnap = await classeRef.get();
    if (!classeSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Classe não encontrada"
        );
    }

    if (
        isSecretario ||
        (!isSuperAdmin && classeSnap.data()!.igrejaId !== user.igrejaId) ||
        (isSuperAdmin && classeSnap.data()!.ministerioId !== user.ministerioId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para apagar uma classe."
        );
    }

    const licao = await db
        .collection("licoes")
        .where("classeId", "==", classeId)
        .get();

    if (!licao.empty) {
        throw new functions.https.HttpsError(
            "aborted",
            "Você não pode excluir uma classe que já possui lições cadastradas. Por favor, remova as lições primeiro."
        );
    }
    try {
        const batch = db.batch();

        batch.delete(classeRef);

        const usuariosSnap = await db
            .collection("usuarios")
            .where("role", "in", [Roles.SECRETARIO_CLASSE, Roles.PROFESSOR])
            .where("classeId", "==", classeId)
            .get();

        const promises: Promise<any>[] = [];
        usuariosSnap.docs.forEach((v) => {
            batch.delete(v.ref);

            const uid = v.data().uid;
            if (uid) promises.push(admin.auth().deleteUser(uid));
        });

        await batch.commit();
        await Promise.all(promises);

        const notificao: Notificacao = {
            evento: "DELETAR_CLASSE",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { classe: classeSnap.data() },
            },
            message: `A classe ${classeId} e seus usuários associados foram deletados com sucesso.`,
        };
        console.log(JSON.stringify(notificao));
        return { message: "Classe deletada com sucesso!" };
    } catch (erro) {
        console.log("Erro ao apagar classe", erro);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar a classe. Tente novamente"
        );
    }
});

// Igreja
interface IgrejaFront {
    nome: string;
}
interface Igreja {
    nome: string;
    ministerioId: string;
}

export const salvarIgreja = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    if (!isSuperAdmin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Somente o super admin pode cadastrar igrejas"
        );
    }

    const { igrejaId } = request.data;
    const dados = request.data.dados as IgrejaFront;

    if (!dados) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Os dados da igreja são obrigatórios"
        );
    }

    if (igrejaId) {
        const igrejaRef = db.collection("igrejas").doc(igrejaId);
        const igrejaSnap = await igrejaRef.get();

        if (!igrejaSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "A igreja não foi encontrada"
            );
        }

        await igrejaRef.update({ nome: dados.nome });

        const notificao: Notificacao = {
            evento: "SALVAR_IGREJA",
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: {},
            },
            message: `Igreja editada pelo usuário : ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { id: igrejaSnap.id, ...igrejaSnap.data(), nome: dados.nome };
    }

    const newIgreja = await db
        .collection("igrejas")
        .add({ nome: dados.nome, ministerioId: user.ministerioId });

    const notificao: Notificacao = {
        evento: "SALVAR_IGREJA",
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: {
                newIgreja,
            },
        },
        message: `Igreja criada pelo usuário : ${user.uid}`,
    };
    console.log(JSON.stringify(notificao));
    return {
        id: newIgreja.id,
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
            `Nome ${dadosAntigos.nome}, foi alterado para ${dadosNovos.nome}`
        );

        const collections = [
            "alunos",
            "classes",
            "licoes",
            "matriculas",
            "membros",
            "registros_aula",
            "usuarios",
            "visitantes",
        ];
        const field = "igrejaId";
        const refs: any[] = [];

        const promises = collections.map(async (v) => {
            const item = await db
                .collection(v)
                .where(field, "==", igrejaId)
                .get();
            item.forEach((doc) => refs.push(doc.ref));
        });

        await Promise.all(promises);

        let batch = db.batch();
        const batches = [batch];
        let count = 0;

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
    }
);
export const deletarIgreja = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, user } = await validarUsuario(request);
    const { igrejaId } = request.data;

    if (!igrejaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }

    const igrejaRef = db.collection("igrejas").doc(igrejaId);
    const igrejaSnap = await igrejaRef.get();

    if (!igrejaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada"
        );
    }

    if (
        !isSuperAdmin ||
        igrejaSnap.data()?.ministerioId !== user.ministerioId
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso"
        );
    }

    try {
        const refs = [igrejaRef];

        const [
            classesSnap,
            alunosSnap,
            licoesSnap,
            matriculasSnap,
            registrosSnap,
            usuariosSnap,
            visitasSnap,
        ] = await Promise.all([
            db.collection("classes").where("igrejaId", "==", igrejaId).get(),
            db.collection("alunos").where("igrejaId", "==", igrejaId).get(),
            db.collection("licoes").where("igrejaId", "==", igrejaId).get(),
            db.collection("matriculas").where("igrejaId", "==", igrejaId).get(),
            db
                .collection("registros_aula")
                .where("igrejaId", "==", igrejaId)
                .get(),
            db.collection("usuarios").where("igrejaId", "==", igrejaId).get(),
            db.collection("visitas").where("igrejaId", "==", igrejaId).get(),
        ]);

        if (!classesSnap.empty) {
            classesSnap.forEach((v) => refs.push(v.ref));
        }

        if (!alunosSnap.empty) {
            alunosSnap.forEach((v) => refs.push(v.ref));
        }

        if (!licoesSnap.empty) {
            licoesSnap.forEach((v) => refs.push(v.ref));

            const aulasPromises = licoesSnap.docs.map((v) =>
                v.ref.collection("aulas").get()
            );

            (await Promise.all(aulasPromises)).forEach((v) =>
                v.forEach((a) => refs.push(a.ref))
            );
        }

        if (!matriculasSnap.empty) {
            matriculasSnap.forEach((v) => refs.push(v.ref));
        }

        if (!registrosSnap.empty) {
            registrosSnap.forEach((v) => refs.push(v.ref));

            const chamadaPromises = registrosSnap.docs.map((v) =>
                v.ref.collection("chamada").get()
            );
            (await Promise.all(chamadaPromises)).forEach((v) =>
                v.forEach((c) => refs.push(c.ref))
            );
        }

        const promisesUsers: any[] = [];
        if (!usuariosSnap.empty) {
            usuariosSnap.forEach((v) => {
                const usuario = v.data();
                const uid = usuario.uid;
                if (uid) promisesUsers.push(admin.auth().deleteUser(uid));
                refs.push(v.ref);
            });
        }

        if (!visitasSnap.empty) {
            visitasSnap.forEach((v) => refs.push(v.ref));
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

        const notificao: Notificacao = {
            evento: "DELETAR_IGREJA",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { igreja: igrejaSnap.data() },
            },
            message: `Igreja e ${
                refs.length - 1
            } dados associados, foram deletados com sucesso pelo usuário : ${
                user.uid
            }`,
        };
        console.log(JSON.stringify(notificao));
        return {
            message: "Igreja e dados associados foram deletados com sucesso!",
        };
    } catch (error) {
        console.log("Erro ao deletar igreja", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar a igreja. Tente novamente"
        );
    }
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
            "Dados incompletos"
        );
    }

    const igreja = await db.collection("igrejas").doc(dados.igrejaId).get();
    if (!igreja.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não foi encontrada"
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
            "Usuário não tem para usuários com este cargo"
        );
    }

    if (!usuarioId && (!dados.senha || dados.senha.length < 6)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "A senha precisa ter ao menos 6 caracteres"
        );
    }

    let classe;
    if (
        dados.role === Roles.SECRETARIO_CLASSE ||
        dados.role === Roles.PROFESSOR
    ) {
        if (!dados.classeId) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Secretários de classe ou professores precisam de uma classe associada"
            );
        }
        classe = await db.collection("classes").doc(dados.classeId).get();
        if (!classe.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe não encontrada"
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

        if (!usuarioSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "O usuário não foi encontrado"
            );
        }

        if (usuarioSnap.id === user.uid && dados.role !== user.role) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "O usuário não pode alterar seu próprio cargo"
            );
        }

        if (dados.senha && !isSecretario)
            admin.auth().updateUser(usuarioSnap.id, { password: dados.senha });
        if (dados.email && !isSecretario)
            admin.auth().updateUser(usuarioSnap.id, { email: dados.email });

        if (isSecretario) delete dadosAtualizados.email;

        await usuarioRef.update(dadosAtualizados as any);

        const notificao: Notificacao = {
            evento: "SALVAR_USUARIO",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { usuario: usuarioSnap.data() },
            },
            message: `Usuário editado pelo usuário ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
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
        await db.collection("usuarios").doc(newAuth.uid).set(newUser);

        const notificao: Notificacao = {
            evento: "SALVAR_USUARIO",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { newUser },
            },
            message: `Usuário salvo pelo usuário ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
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
                "Este e-mail já está em uso por outra conta."
            );
        }

        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao criar o usuário. Tente novamente."
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
            "Dados inválidos ou ausentes"
        );
    }

    const usuarioRef = db.collection("usuarios").doc(usuarioId);
    const usuario = await usuarioRef.get();

    if (!usuario.exists) {
        await admin
            .auth()
            .deleteUser(usuarioId)
            .catch(() => console.log("Usuário já não existia no Auth."));
        throw new functions.https.HttpsError(
            "not-found",
            "Usuário não encontrado"
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
            "Você não tem permissão para fazer isso."
        );
    }

    const uid = usuario.data()?.uid;
    if (!uid) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "O usuário cadastrada está invalido."
        );
    }

    try {
        await usuarioRef.delete();
        await admin.auth().deleteUser(usuarioId);

        const notificao = JSON.stringify({
            evento: "DELETAR_USUARIO",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: {},
            },
            message: `O usuário ${usuarioId} foi deletado pelo usuário ${user.uid}.`,
        });
        console.log(JSON.stringify(notificao));
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
            "Houve um erro ao deletar o usuário. Tente novamente."
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
    total_matriculados: number;
}

export const salvarNovoTrimestre = functions.https.onCall(async (request) => {
    const { user, isSuperAdmin, isSecretario, db } = await validarUsuario(
        request
    );

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
            "Dados invalidos ou ausentes"
        );
    }

    const igreja = await db.collection("igrejas").doc(igrejaId).get();
    if (!igreja.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada."
        );
    }
    const naoPodeCriar =
        (!isSuperAdmin && igrejaId !== user.igrejaId) ||
        (isSecretario && classeId !== user.classeId) ||
        (isSuperAdmin && user.ministerioId !== igreja.data()?.ministerioId);
    if (naoPodeCriar) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para criar essa lição"
        );
    }

    const classe = await db.collection("classes").doc(classeId).get();
    if (!classe.exists || classe.data()?.igrejaId !== igrejaId) {
        throw new functions.https.HttpsError(
            "not-found",
            "Classe inválida ou não pertence à igreja selecionada."
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

    try {
        const alunosIds = dados.alunosSelecionados.map((a) => a.alunoId);

        if (licaoId) {
            const licaoRef = db.collection("licoes").doc(licaoId);
            const licao = await licaoRef.get();

            if (!licao.exists) {
                throw new functions.https.HttpsError(
                    "not-found",
                    "A lição não foi encontrada"
                );
            }

            const matriculas = await db
                .collection("matriculas")
                .where("licaoId", "==", licaoId)
                .get();
            const todasMatriculasMap = new Map(
                matriculas.docs.map((v) => [
                    v.data()?.alunoId,
                    {
                        id: v.id,
                        alunoId: v.data()?.alunoId,
                    },
                ])
            );

            const alunosSelecionadosMap = new Map(
                dados.alunosSelecionados.map((v) => [v.alunoId, v])
            );

            todasMatriculasMap.forEach((v) => {
                const matriculaRef = db.collection("matriculas").doc(v.id);
                if (!alunosSelecionadosMap.get(v.alunoId))
                    batch.delete(matriculaRef);
                else if (alunosSelecionadosMap.get(v.alunoId))
                    batch.update(matriculaRef, {
                        possui_revista: alunosSelecionadosMap.get(v.alunoId)
                            ?.possui_revista,
                    });
            });

            const novosAlunos = dados.alunosSelecionados.filter(
                (v) => !todasMatriculasMap.get(v.alunoId)
            );

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
                                chunk
                            )
                            .get()
                    );
                }
                const alunosSnap = await Promise.all(alunosPromises);
                const todosOsAlunos = alunosSnap.flatMap((snap) => snap.docs);
                const alunosMap = new Map(
                    todosOsAlunos.map((doc) => [doc.id, doc.data()])
                );

                novosAlunos.forEach((aluno) => {
                    const alunoData = alunosMap.get(aluno.alunoId);
                    if (alunoData) {
                        const matriculaRef = db.collection("matriculas").doc();
                        batch.set(matriculaRef, {
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
                        });
                    }
                });
            }

            dadosParaSalvar.ativo = licao.data()!.ativo;
            batch.update(licaoRef, dadosParaSalvar);
            await batch.commit();

            const notificao: Notificacao = {
                evento: "SALVAR_NOVO_TRIMESTRE",
                actor: {
                    uid: user.uid,
                    email: user.email,
                    ip: request.rawRequest.ip,
                },
                dados: {
                    dados_enviados: request.data,
                    dados_importantes: { dadosParaSalvar, licao: licao.data() },
                },
                message: `Trimestre editado pelo usuário ${user.uid}`,
            };
            console.log(JSON.stringify(notificao));
            return { id: licaoId, ...dadosParaSalvar };
        }

        const licaoAtivaQuery = db
            .collection("licoes")
            .where("classeId", "==", classeId)
            .where("ativo", "==", true)
            .limit(1);
        const licaoAtivaSnap = await licaoAtivaQuery.get();

        if (licaoAtivaSnap.empty) dadosParaSalvar.ativo = true;
        else {
            const licaoAtivaDoc = licaoAtivaSnap.docs[0];
            const licaoAtivaData = licaoAtivaDoc.data();

            if (dataInicio >= licaoAtivaData.data_fim.toDate()) {
                dadosParaSalvar.ativo = true;
                batch.update(licaoAtivaDoc.ref, { ativo: false });
            } else if (dataFim <= licaoAtivaData.data_inicio.toDate())
                dadosParaSalvar.ativo = false;
            else if (dadosParaSalvar.ativo) {
                batch.update(licaoAtivaDoc.ref, { ativo: false });
            }
        }

        const novaLicaoRef = db.collection("licoes").doc();
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
                            chunk
                        )
                        .get()
                );
            }
            const alunosSnap = await Promise.all(alunosPromises);
            const todosOsAlunos = alunosSnap.flatMap((snap) => snap.docs);
            const alunosMap = new Map(
                todosOsAlunos.map((doc) => [doc.id, doc.data()])
            );

            dados.alunosSelecionados.forEach((aluno) => {
                const alunoData = alunosMap.get(aluno.alunoId);
                if (alunoData) {
                    const matriculaRef = db.collection("matriculas").doc();
                    batch.set(matriculaRef, {
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
                    });
                }
            });
        }

        await batch.commit();

        const notificao: Notificacao = {
            evento: "SALVAR_NOVO_TRIMESTRE",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { dadosParaSalvar },
            },
            message: `Trimestre criado pelo usuário ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { id: novaLicaoRef.id, ...dadosParaSalvar };
    } catch (error) {
        console.error("Erro ao salvar trimestre:", error);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao salvar o trimestre. Tente novamente."
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
            dadosNovos.data_inicio
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
                    `O titulo ${dadosAntigos.titulo} foi alterado para ${dadosNovos.titulo}`
                );

                const matriculas = await db
                    .collection("matriculas")
                    .where("licaoId", "==", licaoId)
                    .get();
                matriculas.forEach((v) => batch.update(v.ref, novoTitulo));
            }

            if (dataMudou) {
                console.log(
                    `Data de inicio ${dadosAntigos.data_inicio
                        .toDate()
                        .toLocaleDateString(
                            "pt-BR"
                        )} foi alterada para ${dadosNovos.data_inicio
                        .toDate()
                        .toLocaleDateString("pt-BR")}`
                );

                for (let i = 0; i < dadosNovos.numero_aulas; i++) {
                    const data = dadosNovos.data_inicio.toDate();
                    data.setDate(data.getDate() + i * 7);

                    const licaoRef = db.collection("licoes").doc(licaoId);
                    const aulaRef = licaoRef
                        .collection("aulas")
                        .doc(String(i + 1));
                    batch.update(aulaRef, {
                        data_prevista: Timestamp.fromDate(data),
                    });
                }
            }

            await batch.commit();

            console.log("Fan-out finalizado, matricula alterada!");
        } catch (err) {
            console.log("deu esse erro", err);
        }
    }
);
export const deletarLicao = functions.https.onCall(async (request) => {
    const { db, isSuperAdmin, isSecretario, user } = await validarUsuario(
        request
    );

    const { licaoId } = request.data;

    if (!licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }

    const licaoRef = db.collection("licoes").doc(licaoId);
    const licaoSnap = await licaoRef.get();
    if (!licaoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Lição não encontrada"
        );
    }

    if (
        (!isSuperAdmin && licaoSnap.data()?.igrejaId !== user.igrejaId) ||
        (isSecretario && licaoSnap.data()?.classeId !== user.classeId) ||
        (isSuperAdmin && licaoSnap.data()?.ministerioId !== user.ministerioId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão de deletar essa lição"
        );
    }

    try {
        const refs = [licaoRef];

        const aulasRef = licaoRef.collection("aulas");
        const matriculasRef = db
            .collection("matriculas")
            .where("licaoId", "==", licaoId);
        const registrosRef = db
            .collection("registros_aula")
            .where("licaoId", "==", licaoId);

        const [aulasSnap, matriculasSnap, registrosSnap] = await Promise.all([
            aulasRef.get(),
            matriculasRef.get(),
            registrosRef.get(),
        ]);

        aulasSnap.docs.forEach((v) => refs.push(v.ref));
        matriculasSnap.docs.forEach((v) => refs.push(v.ref));
        registrosSnap.docs.forEach((v) => refs.push(v.ref));

        const chamadasRefs = await Promise.all(
            registrosSnap.docs.map((v) => v.ref.collection("chamada").get())
        );

        chamadasRefs.forEach((v) => v.docs.forEach((c) => refs.push(c.ref)));

        let batch = db.batch();
        let count = 0;
        if (licaoSnap.data()?.ativo) {
            const ultimaLicao = await db
                .collection("licoes")
                .where("classeId", "==", licaoSnap.data()?.classeId)
                .where(
                    admin.firestore.FieldPath.documentId(),
                    "!=",
                    licaoSnap.id
                )
                .orderBy("data_inicio", "desc")
                .limit(1)
                .get();
            if (!ultimaLicao.empty) {
                batch.update(ultimaLicao.docs[0].ref, { ativo: true });
                count++;
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

        const notificao: Notificacao = {
            evento: "DELETAR_LICAO",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: {
                    aulas: aulasSnap.docs,
                    matriculas: matriculasSnap.docs,
                    registros: registrosSnap.docs,
                },
            },
            message: `A lição ${licaoId} foi deletada com sucesso pelo usuário: $${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { message: "Lição deletada com sucesso" };
    } catch (error) {
        console.log("Erro ao deletar a lição", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao deletar a lição. Tente novamente."
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
    ofertaDinheiro: number;
    ofertaPix: number;
    imgsPixOfertas: string[];
    missoesDinheiro: number;
    missoesPix: number;
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
}

export const salvarChamada = functions.https.onCall(async (request) => {
    const { db, user, isSecretario, isAdmin } = await validarUsuario(request);

    const { classeId, licaoId, numeroAula } = request.data;
    const dados = request.data.dados as ChamadaFront;

    if (!classeId || !licaoId || !numeroAula) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados invalidos"
        );
    }

    const licaoRef = db.collection("licoes").doc(licaoId);
    const aulaRef = db
        .collection("licoes")
        .doc(licaoId)
        .collection("aulas")
        .doc(numeroAula);

    const [classe, licao, aula] = await Promise.all([
        db.collection("classes").doc(classeId).get(),
        licaoRef.get(),
        aulaRef.get(),
    ]);

    if (!classe.exists || !licao.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Coleções não foram encontradas"
        );
    }

    if (
        (isSecretario && user.classeId !== classeId) ||
        (isAdmin && licao.data()?.igrejaId !== user.igrejaId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer essa chamada"
        );
    }

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
    };

    try {
        const batch = db.batch();

        let registrosRef;
        const isEditando = aula.exists && aula.data()?.realizada;

        if (isEditando) registrosRef = aula.data()!.registroRef;
        else registrosRef = db.collection("registros_aula").doc();

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
                    new Date(dados.data_chamada + "T12:00:00")
                ),
                numero_aula: Number(numeroAula),
                realizada: true,
                registroRef: registrosRef,
            });
        }

        const chamadaRef = registrosRef.collection("chamada");
        const alunosIds = Object.keys(dados.chamada);
        if (alunosIds.length) {
            const promises = [];
            for (let i = 0; i < alunosIds.length; i += 30) {
                const chunk = alunosIds.slice(i, i + 30);
                promises.push(
                    db
                        .collection("alunos")
                        .where(
                            admin.firestore.FieldPath.documentId(),
                            "in",
                            chunk
                        )
                        .get()
                );
            }

            const alunos = (await Promise.all(promises)).flatMap((v) => v.docs);
            const alunosMap = new Map(alunos.map((v) => [v.id, v.data()]));

            alunosIds.forEach((id) => {
                const aluno = alunosMap.get(id);
                if (aluno)
                    batch.set(chamadaRef.doc(id), {
                        nome: aluno.nome_completo,
                        status: dados.chamada[id],
                        trouxe_biblia: dados.bibliasTrazidas.includes(id),
                        trouxe_licao: dados.licoesTrazidas.includes(id),
                    });
            });
        }
        await batch.commit();

        const notificao: Notificacao = {
            evento: "SALVAR_CHAMADA",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: { dadosParaSalvar, isEditando },
            },
            message: `Chamada salva com sucesso pelo usuário: ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return {
            mensagem: "Chamada cadastrada com sucesso!",
            registro: registrosRef.id,
        };
    } catch (err: any) {
        console.log("Erro ao salvar chamda", err);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao salvar a chamada. Tente novamente."
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
            (v) => !dadosNovos.imgsPixMissoes?.includes(v)
        );
        const imgsOfertasDeletar = dadosAntigos.imgsPixOfertas?.filter(
            (v) => !dadosNovos.imgsPixOfertas?.includes(v)
        );

        const imgsDeletar = [
            ...(imgsMissoesDeletar || []),
            ...(imgsOfertasDeletar || []),
        ];

        if (!imgsDeletar.length) {
            console.log("As imagens não mudaram, encerrando trigger");
            return;
        }

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
    }
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
            "Dados inválidos ou ausentes"
        );
    }

    try {
        const matriculas = await db
            .collection("matriculas")
            .where("licaoId", "==", licaoId)
            .where("alunoId", "==", alunoId)
            .limit(1)
            .get();

        if (!matriculas.empty) {
            const matriculaDoc = matriculas.docs[0];

            await matriculaDoc.ref.update({
                ...dados,
                data_matricula: Timestamp.fromDate(
                    new Date(dados.data_matricula + "T12:00:00")
                ),
            });

            const notificao: Notificacao = {
                evento: "SALVAR_MATRICULA",
                actor: {
                    uid: user.uid,
                    email: user.email,
                    ip: request.rawRequest.ip,
                },
                dados: {
                    dados_enviados: request.data,
                    dados_importantes: {
                        dados,
                        matriculas: matriculaDoc.data(),
                    },
                },
                message: `Matricula salva com sucesso pelo usuário: ${user.uid}`,
            };
            console.log(JSON.stringify(notificao));
            return {
                mensagem: "Aluno atualizado com sucesso",
                matriculaId: matriculaDoc.id,
            };
        }

        const alunoRef = db.collection("alunos").doc(alunoId);
        const licaoRef = db.collection("licoes").doc(licaoId);
        const [aluno, licao] = await Promise.all([
            alunoRef.get(),
            licaoRef.get(),
        ]);

        if (!aluno.exists || !licao.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Aluno ou Lição não encontrado"
            );
        }

        const classeRef = db.collection("classes").doc(licao.data()!.classeId);
        const classe = await classeRef.get();

        if (!classe.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe associada à lição não foi encontrada."
            );
        }

        const dadosParaSalvar: Matriculas = {
            alunoId,
            alunoNome: aluno.data()!.nome_completo,
            classeId: classe.id,
            classeNome: classe.data()!.nome,
            classeRef: classeRef,
            data_matricula: Timestamp.fromDate(
                new Date(dados.data_matricula + "T12:00:00")
            ),
            igrejaId: classe.data()!.igrejaId,
            igrejaNome: classe.data()!.igrejaNome,
            licaoId,
            licaoNome: licao.data()!.titulo,
            licaoRef: licaoRef,
            ministerioId: user.ministerioId,
            possui_revista: dados.possui_revista,
        };

        const batch = db.batch();

        const matricula = db.collection("matriculas").doc();
        batch.set(matricula, dadosParaSalvar);

        batch.update(licaoRef, { total_matriculados: FieldValue.increment(1) });

        await batch.commit();

        const notificao: Notificacao = {
            evento: "SALVAR_MATRICULA",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: {
                    dadosParaSalvar,
                    classe: classe.data(),
                    aluno: aluno.data(),
                    licao: licao.data(),
                },
            },
            message: `Matricula salva com sucesso pelo usuário: ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return {
            mensagem: "Aluno salvo com sucesso",
            matriculaId: matricula.id,
        };
    } catch (err: any) {
        console.log("Erro ao salvar", err);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao fazer a matricula. Tente novamente."
        );
    }
});
export const deletarMatricula = functions.https.onCall(async (request) => {
    const { isSecretario, isSuperAdmin, db, user } = await validarUsuario(
        request
    );

    const { matriculaId } = request.data;

    if (!matriculaId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }

    const matriculaRef = db.collection("matriculas").doc(matriculaId);
    const matriculaSnap = await matriculaRef.get();

    if (!matriculaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Matricula não encontrada"
        );
    }

    if (
        (!isSuperAdmin && matriculaSnap.data()?.igrejaId !== user.igrejaId) ||
        (isSecretario && matriculaSnap.data()?.classeId !== user.classeId)
    ) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para deletar essa matricula"
        );
    }

    try {
        const batch = db.batch();
        const licaoRef = matriculaSnap.data()!.licaoRef;

        batch.update(licaoRef, {
            total_matriculados: FieldValue.increment(-1),
        });
        batch.delete(matriculaRef);

        await batch.commit();

        const notificao: Notificacao = {
            evento: "DELETAR_MATRICULA",
            actor: {
                uid: user.uid,
                email: user.email,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: {
                    matriculas: matriculaSnap.data(),
                },
            },
            message: `A matricula ${matriculaId} foi deletada com sucesso pelo usuário ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { message: "A matricula foi deletada com sucesso." };
    } catch (error) {
        console.log("Erro ao deletar matricula", error);
        throw new functions.https.HttpsError(
            "internal",
            "Ocorreu um erro ao deletar a matricula. Tente novamente."
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

export const gerarRelatorio = functions.https.onCall(async (request) => {
    const { user, db, isSecretario, isSuperAdmin, isAdmin } =
        await validarUsuario(request);

    const { agrupamento, classes, dataFim, dataInicio, igrejas, metrica } =
        request.data as GerarRelatorioInterface;

    if (!agrupamento || !dataFim || !dataInicio || !metrica) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }

    let baseQuery = db
        .collection("registros_aula")
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
        v.data()
    ) as RegistroAulaInterface[];

    if (metrica === "frequencia_alunos") {
        if (!registroDocs.length) return [];

        const totalAulasNoPeriodo = registroDocs.length;
        const presencas = new Map<string, any>();

        const promises = registroDocs.map(async (doc) => {
            const chamada = await doc.ref.collection("chamada").get();
            const docData = doc.data();
            let key = "desconhecido";
            switch (agrupamento) {
                case "classe":
                    key = docData.classeNome;
                    break;
                case "igreja":
                    key = docData.igrejaNome;
                    break;
            }

            chamada.docs.forEach((v) => {
                const aluno = v.data();
                if (agrupamento === "aluno") key = aluno.nome;
                let soma = 0;
                if (aluno.status === "Presente") soma = 1;
                else if (aluno.status === "Atrasado") soma = 0.9;
                const valor = presencas.get(key) || { [aluno.nome]: 0 };
                valor[aluno.nome] = (valor[aluno.nome] || 0) + soma;

                presencas.set(key, valor);
            });
        });

        await Promise.all(promises);

        return Array.from(presencas.entries()).map(([name, valor]) => {
            for (let key in valor) {
                const porcentagem = (
                    (valor[key] / totalAulasNoPeriodo) *
                    100
                ).toFixed(2);
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
                    .collection("licoes")
                    .where(admin.firestore.FieldPath.documentId(), "in", chunk)
                    .get()
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

        const promises = registroDocs.map((v) =>
            v.ref.collection("chamada").get()
        );
        (await Promise.all(promises)).forEach((v) =>
            v.forEach((a) => {
                const aluno = a.data();
                let valor = 0;

                switch (metrica) {
                    case "biblias":
                        valor = aluno.trouxe_biblia ? 1 : 0;
                        break;
                    case "licoes_trazidas":
                        valor = aluno.trouxe_licao ? 1 : 0;
                        break;
                    case "presentes_chamada":
                        valor = aluno.status === "Presente" ? 1 : 0;
                        break;
                    case "total_presentes":
                        valor =
                            aluno.status === "Atrasado" ||
                            aluno.status === "Presente"
                                ? 1
                                : 0;
                        break;
                    case "atrasados":
                        valor = aluno.status === "Atrasado" ? 1 : 0;
                        break;
                    case "total_ausentes":
                        valor =
                            aluno.status === "Falta" ||
                            aluno.status === "Falta Justificada"
                                ? 1
                                : 0;
                }

                alunosMap.set(
                    aluno.nome,
                    (alunosMap.get(aluno.nome) || 0) + valor
                );
            })
        );

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
                    data.setDate(data.getDate() - data.getDay())
                );
                key = `Semana de ${primeiroDiaDaSemana.toLocaleDateString(
                    "pt-BR"
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
            "Dados inválidos ou ausentes"
        );
    }

    if (isSecretario && colecao === "membros") {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso"
        );
    }
    const baseQuery = db.collection(
        colecao === "chamada" ? "registros_aula" : colecao
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
                "Dados inválidos ou ausentes"
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
            const chamadaSnap = await v.ref.collection("chamada").get();

            chamadaSnap.docs.forEach((c) => {
                d.push({
                    id: v.id,
                    igrejaNome: registro.igrejaNome,
                    classeNome: registro.classeNome,
                    data: registro.data.toDate().toLocaleDateString("pt-BR"),
                    ...c.data(),
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
            .join(";")
    );

    const table = [colunas.join(";"), ...linhas].join("\r\n");

    return table;
});

export const getResumoDaLicao = functions.https.onCall(async (request) => {
    const { isSuperAdmin, isSecretario, user, db } = await validarUsuario(
        request
    );

    const { licaoId } = request.data;

    if (!licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
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
            "Permissão inválida"
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
            (registro.atrasados * 0.9 || 0) + (registro.presentes_chamada || 0)
        );
        totalArrecadado.push(
            (registro.ofertas_total || 0) + (registro.missoes_total || 0)
        );

        const chamadaRef = await v.ref.collection("chamada").get();

        if (chamadaRef.empty) return;

        chamadaRef.docs.forEach((c) => {
            const chamada = c.data();

            const item = alunosMap.get(c.id) || {
                id: c.id,
                nome: chamada.nome,
                presente: 0,
                atrasado: 0,
                falta: 0,
                falta_justificada: 0,
            };

            const key = chamada.status.toLowerCase().replace(/\s/g, "_");
            if (key === "falta_justificada") totalPresenca.push(1);

            item[key] = (item[key] || 0) + 1;

            alunosMap.set(c.id, item);
        });
    });

    await Promise.all(promises);

    totalPresenca = totalPresenca.reduce(
        (prev: any, acc: any) => acc + prev,
        0.0
    );
    totalArrecadado = totalArrecadado.reduce(
        (prev: any, acc: any) => acc + prev,
        0
    );

    const frequenciaAlunos = Array.from(alunosMap.values()).map((v) => {
        const totalPontos =
            (v.presente || 0) +
            (v.atrasado || 0) * 0.9 +
            (v.falta_justificada || 0) * 0.5;
        const porcentagem = (totalPontos / (progresso.concluidas || 0)) * 100;
        return {
            ...v,
            presenca: Number.parseFloat(porcentagem.toFixed(1)) || 0,
        };
    });

    const mediaPresenca =
        Number.parseFloat(
            (
                (totalPresenca /
                    (frequenciaAlunos.length * progresso.concluidas)) *
                100
            ).toFixed(1)
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
            "Dados inválidos ou ausentes."
        );
    }

    if (!isSuperAdmin && user.igrejaId !== igrejaId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso."
        );
    }

    const igrejaSnap = await db.collection("igrejas").doc(igrejaId).get();
    if (!igrejaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Igreja não encontrada"
        );
    }

    if (visitaId) {
        let data;
        if (dados?.data_nascimento) {
            data = new Date(dados.data_nascimento);
            data.setHours(0, 0, 0, 0);
        }
        const visitaRef = db.collection("visitantes").doc(visitaId);
        const visita = await visitaRef.get();

        if (!visita.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Visita não encontrada"
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

        const notificao: Notificacao = {
            evento: "SALVAR_VISITA",
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: dadosAtualizados,
            },
            message: `Visita atualizada pelo usuário ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { ...dadosAtualizados };
    }

    try {
        if (visitas?.length) {
            const batch = db.batch();

            const nomesParaBuscar = visitas.map((v) =>
                v.nome_completo.toLowerCase()
            );
            const visitasExistentesQuery = db
                .collection("visitantes")
                .where("igrejaId", "==", igrejaId)
                .where("nome_completo", "in", nomesParaBuscar);

            const visitasSnap = await visitasExistentesQuery.get();
            const visitantesExistentesMap = new Map(
                visitasSnap.docs.map((doc) => [doc.data()?.nome_completo, doc])
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
                            isVisita ? 0 : 1
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
                                  new Date(visita.data_nascimento + "T12:00:00")
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

            const notificao: Notificacao = {
                evento: "SALVAR_VISITA",
                actor: {
                    email: user.email,
                    uid: user.uid,
                    ip: request.rawRequest.ip,
                },
                dados: {
                    dados_enviados: request.data,
                    dados_importantes: Array.from(
                        visitantesExistentesMap.values()
                    ),
                },
                message: `Visitas incluidas pelo usuário ${user.uid}`,
            };
            console.log(JSON.stringify(notificao));
            return {
                message: `${visitas.length} visitas registradas com sucesso.`,
            };
        } else {
            const notificao: Notificacao = {
                evento: "SALVAR_VISITA",
                actor: {
                    email: user.email,
                    uid: user.uid,
                    ip: request.rawRequest.ip,
                },
                dados: {
                    dados_enviados: request.data,
                    dados_importantes: {},
                },
                message: `Não houve visitas`,
            };
            console.log(JSON.stringify(notificao));
            return { message: "Não houve visitas" };
        }
    } catch (error) {
        console.log("erro ao salvar", error);
        throw new functions.https.HttpsError(
            "internal",
            "Houve um erro ao salvar a visita"
        );
    }
});
export const deletarVisita = functions.https.onCall(async (request) => {
    const { user, db, isSuperAdmin } = await validarUsuario(request);

    const { visitaId } = request.data;
    const visitaRef = db.collection("visitantes").doc(visitaId);
    const visitaSnap = await visitaRef.get();

    if (!visitaSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Visita não existe");
    }

    if (!isSuperAdmin && user.igrejaId !== visitaSnap.data()?.igrejaId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso."
        );
    }

    await visitaRef.delete();
    const notificao: Notificacao = {
        evento: "DELETAR_VISITA",
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: {},
        },
        message: `Visita deletada pelo usuário ${user.uid}`,
    };
    console.log(JSON.stringify(notificao));
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
            "Dados inválidos ou ausentes"
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
            "Você não tem permissão para fazer isso."
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
            "Igreja não encontrada ou de outro ministério"
        );
    }

    let classe;
    if (role === Roles.SECRETARIO_CLASSE || role === Roles.PROFESSOR) {
        const classeSnap = await db.collection("classes").doc(classeId).get();
        if (!classeSnap.exists || classeSnap.data()?.igrejaId !== igrejaId) {
            throw new functions.https.HttpsError(
                "not-found",
                "Classe não encontrada"
            );
        }

        classe = classeSnap.data();
    }

    const agora = new Date();
    const expiracao = new Date(agora.setDate(agora.getDate() + 2));

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
            "Dados inválidos ou ausentes."
        );
    }

    const db = admin.firestore();
    const codigoSnap = await db.collection("convites").doc(codigo).get();

    if (!codigoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Esse código não existe"
        );
    }

    const codigoData = codigoSnap.data() as CodigoConvite;

    if (codigoData.usado || codigoData.dataExpiracao < Timestamp.now()) {
        throw new functions.https.HttpsError(
            "data-loss",
            "Código já usado ou expirado"
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
                "Dados inválidos ou ausentes."
            );
        }
        if (senha.length < 6) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Senha deve ter no minimo 6 caracteres"
            );
        }

        const db = admin.firestore();
        const codigoRef = db.collection("convites").doc(codigo);
        const codigoSnap = await codigoRef.get();

        if (!codigoSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Convite não encontrado"
            );
        }

        const codigoData = codigoSnap.data() as CodigoConvite;
        const { igrejaId, classeId, dataExpiracao, role, criadoPorUid } =
            codigoData;

        if (codigoData.usado || dataExpiracao < Timestamp.now()) {
            throw new functions.https.HttpsError(
                "data-loss",
                "Código usado ou expirado"
            );
        }

        const promises = [
            db.collection("igrejas").doc(igrejaId).get(),
            db.collection("usuarios").doc(criadoPorUid).get(),
        ];
        if (classeId)
            promises.push(db.collection("classes").doc(classeId).get());
        const [igrejaSnap, criador, classeSnap] = await Promise.all(promises);

        if (!criador.exists) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Usuário não encontrado."
            );
        }
        if (
            !igrejaSnap.exists ||
            igrejaSnap.data()?.ministerioId !== criador.data()?.ministerioId
        ) {
            throw new functions.https.HttpsError(
                "not-found",
                "Igreja não encontrada ou de outro ministério"
            );
        }
        if (role === Roles.SECRETARIO_CLASSE || role === Roles.PROFESSOR) {
            if (!classeId || !classeSnap.exists) {
                throw new functions.https.HttpsError(
                    "not-found",
                    "Classe não encontrada."
                );
            }

            if (classeSnap.data()?.igrejaId !== igrejaId) {
                throw new functions.https.HttpsError(
                    "invalid-argument",
                    "Dados inválidos"
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
                "Você não tem permissão par isso"
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
            await db.collection("usuarios").doc(newAuth.uid).set(newUser);
            await codigoRef.update({
                usado: true,
                usadoPorUid: newAuth.uid,
            });
            const notificao: Notificacao = {
                evento: "SALVAR_USUARIO",
                actor: {
                    uid: criador.data()?.uid,
                    email: criador.data()?.email,
                    ip: request.rawRequest.ip,
                },
                dados: {
                    dados_enviados: request.data,
                    dados_importantes: { newUser },
                },
                message: `Usuário salvo pelo usuário `,
            };
            console.log(JSON.stringify(notificao));
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
                    "Este e-mail já está em uso por outra conta."
                );
            }

            throw new functions.https.HttpsError(
                "internal",
                "Ocorreu um erro ao criar o usuário. Tente novamente."
            );
        }
    }
);

export const limparconvitesexpirados = onSchedule(
    "every 24 hours",
    async (event) => {
        const db = admin.firestore();
        console.log(
            "INICIANDO TAREFA AGENDADA: Limpeza de convites expirados..."
        );

        try {
            const agora = Timestamp.now();
            const query = db
                .collection("convites")
                .where("dataExpiracao", "<", agora);
            const convitesExpiradosSnap = await query.get();

            if (convitesExpiradosSnap.empty) {
                console.log(
                    "Nenhum convite expirado para limpar. Trabalho concluído!"
                );
                return;
            }

            console.log(
                `Encontrados ${convitesExpiradosSnap.size} convites expirados para deletar.`
            );

            // 2. Usa o padrão de "loop de batches" para deletar de forma segura.
            const refsParaDeletar = convitesExpiradosSnap.docs.map(
                (doc) => doc.ref
            );

            const batches = [];
            let batch = db.batch();
            let operationCounter = 0;

            for (const ref of refsParaDeletar) {
                batch.delete(ref);
                operationCounter++;
                if (operationCounter === 499) {
                    batches.push(batch.commit());
                    batch = db.batch();
                    operationCounter = 0;
                }
            }
            if (operationCounter > 0) {
                batches.push(batch.commit());
            }

            await Promise.all(batches);

            console.log(
                "Limpeza de convites expirados finalizada com sucesso!"
            );
        } catch (error) {
            console.error("ERRO na limpeza de convites expirados:", error);
            return;
        }
    }
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
                "Dados inválidos ou ausentes."
            );
        }

        const igrejaSnap = await db.collection("igrejas").doc(igrejaId).get();

        if (!igrejaSnap.exists) {
            throw new functions.https.HttpsError(
                "not-found",
                "Igreja não encontrada."
            );
        }

        if (
            (isSuperAdmin &&
                igrejaSnap.data()?.ministerioId !== user.ministerioId) ||
            (!isSuperAdmin && igrejaId !== user.igrejaId)
        ) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para isso."
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

        const notificao: Notificacao = {
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: [],
            },
            evento: "BAIXAR_COMPROVANTES",
            message: `Comprovantes zipados com sucesso pelo usuário: ${user.uid}`,
        };

        console.log(JSON.stringify(notificao));

        const file = zipBuffer.toString("base64");
        return { file };
    }
);

export const limparimagenscomprovantes = onSchedule(
    {
        schedule: "0 3 1 * *",
        timeZone: "America/Sao_Paulo",
    },
    async (event) => {
        const bucket = admin.storage().bucket();
        console.log(
            "INICIANDO TAREFA AGENDADA: Limpeza de imagens com mais de 100 dias..."
        );

        try {
            const [files] = await bucket.getFiles({
                prefix: "comprovantes-pix/",
            });
            const dataLimite = new Date();
            dataLimite.setDate(dataLimite.getDate() - 100);
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
                "Limpeza de imagens fora do prazo finalizada com sucesso!"
            );
        } catch (error) {
            console.error("ERRO na limpeza de imagens:", error);
            return;
        }
    }
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
            "Dados inválidos ou ausentes"
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
                    .create({ token, data_criacao: Timestamp.now() })
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

    const notificao: Notificacao = {
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: [],
        },
        evento: "SALVAR_NOTIFICACAO",
        message: `Atualização de notificação realizada por ${user.uid}`,
    };
    console.log(JSON.stringify(notificao));

    return { message: "Permissão de notificação atualizado com sucesso" };
});

export const enviarNotificacao = functions.https.onCall(async (request) => {
    const { user, isSecretario, isSuperAdmin, db } = await validarUsuario(
        request
    );
    const { destinarios, titulo, mensagem } = request.data as any;

    if (!titulo || !mensagem || !destinarios) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
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
            "Você não tem permissão para fazer isso"
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
            })
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
                `Notificação enviada com sucesso por ${user.uid}. Total de envio:${resultado.successCount}. Não Houve falhas`
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
                        "messaging/registration-token-not-registered"
                    )
                ) {
                    const token = tokens[i];
                    const userId = tokensMap.get(token);
                    usuariosComErro.add(userId);

                    const listaTokens = listaTokensMap.get(userId) as any[];
                    listaTokens.splice(
                        listaTokens.findIndex((v) => v === token),
                        1
                    );

                    return db
                        .collection("usuarios")
                        .doc(userId)
                        .collection("tokens")
                        .doc(token)
                        .delete();
                }

                return;
            })
        );

        if (usuariosComErro.size) {
            usuariosComErro.forEach((v: any) => {
                db.collection("usuarios")
                    .doc(v)
                    .update({ tokens: listaTokensMap.get(v).length });
            });
        }

        console.log(
            `Notificação enviada com sucesso por ${user.uid}. Total de envio: ${resultado.successCount}. Total de erros: ${resultado.failureCount}. Limpeza realizada com sucesso!`
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
                "Você não tem permissão para fazer isso."
            );
        }

        const {
            licaoPreparoId,
            dados: { data_inicio, numero_aulas, titulo, trimestre, img },
        } = request.data as NovoTrimestreAulasFront;

        if (!data_inicio || !numero_aulas || !titulo || !trimestre) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Dados inválidos ou ausentes"
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
                    "Lição não encontrada ou ministério inválido"
                );
            }

            if (licaoSnap.data()?.numero_aulas !== numero_aulas) {
                const aulasMap = new Map(
                    Array.from(
                        Object.entries(licaoSnap.data()?.status_aulas || {})
                    )
                );

                const status_aulas = Array.from({ length: numero_aulas }).map(
                    (_, i) => {
                        return [
                            String(i + 1),
                            aulasMap.get(String(i + 1)) || false,
                        ];
                    }
                );

                dadosAtualizados["status_aulas"] =
                    Object.fromEntries(status_aulas);
            }

            await licaoRef.update(dadosAtualizados);
            const notificao: Notificacao = {
                actor: {
                    email: user.email,
                    uid: user.uid,
                    ip: request.rawRequest.ip,
                },
                dados: {
                    dados_enviados: request.data,
                    dados_importantes: [dadosAtualizados],
                },
                evento: "SALVAR_LICAO_AULAS_PREPARO",
                message: `Lição atualizada com sucesso pelo usuário: ${user.uid}`,
            };
            console.log(JSON.stringify(notificao));
            return { message: `Lição atualizada com sucesso.` };
        }

        const dadosParaSalvar = {
            ...dadosAtualizados,
            status_aulas: Object.fromEntries(
                Array.from({ length: numero_aulas }).map((_, i) => [
                    String(i + 1),
                    false,
                ])
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
                batch.update(v.ref, { ativo: false })
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

        const notificao: Notificacao = {
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: [dadosParaSalvar],
            },
            evento: "SALVAR_LICAO_AULAS_PREPARO",
            message: `Lição cadastrada com sucesso pelo usuário: ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { message: `Lição atualizada com sucesso.` };
    }
);

export const deletarLicaoAulaPreparo = functions.https.onCall(
    async (request) => {
        const { db, isSuperAdmin, user } = await validarUsuario(request);

        if (!isSuperAdmin) {
            throw new functions.https.HttpsError(
                "permission-denied",
                "Você não tem permissão para fazer isso"
            );
        }

        const { licaoPreparoId } = request.data;
        if (!licaoPreparoId) {
            throw new functions.https.HttpsError(
                "invalid-argument",
                "Argumentos inválidos ou ausentes"
            );
        }

        const licaoRef = db.collection("licoes_preparo").doc(licaoPreparoId);
        const licaoSnap = await licaoRef.get();
        const licaoAntetior = await db
            .collection("licoes_preparo")
            .where(admin.firestore.FieldPath.documentId(), "!=", licaoPreparoId)
            .orderBy("data_inicio", "desc")
            .limit(1)
            .get();

        if (
            !licaoSnap.exists ||
            user.ministerioId !== licaoSnap.data()?.ministerioId
        ) {
            throw new functions.https.HttpsError(
                "not-found",
                "Lição não encontrada ou de outro ministério"
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
        if (!licaoAntetior.empty && licaoSnap.data()?.ativo === true) {
            batch.update(licaoAntetior.docs[0].ref, { ativo: true });
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
        const notificao: Notificacao = {
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: [],
            },
            evento: "DELETAR_LICAO_AULAS_PREPARO",
            message: `Lição e todos os dados associados, foram deletados com sucesso pelo usuário: ${user.uid}`,
        };
        console.log(JSON.stringify(notificao));
        return { message: `Lição deletada com sucesso.` };
    }
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
            "Dados inválidos ou ausentes"
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
            "Lição ou aula não foram encontrados"
        );
    }

    if (!isSuperAdmin || licaoSnap.data()?.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso."
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
        0
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
    const notificacao: Notificacao = {
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: [],
        },
        evento: "SALVAR_AULA_PREPARO",
        message: `Aula salva com sucesso por ${user.uid}`,
    };
    console.log(JSON.stringify(notificacao));

    return { message: `Aula salva com sucesso!` };
});

export const deletarAulaPreparo = functions.https.onCall(async (request) => {
    const { isSuperAdmin, db, user } = await validarUsuario(request);

    const { aulaId, licaoId } = request.data;

    if (!aulaId || !licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
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
            "Lição ou aula não foram encontrados"
        );
    }

    if (!isSuperAdmin || licaoSnap.data()?.ministerioId !== user.ministerioId) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso."
        );
    }

    const status_aulas = {
        ...licaoSnap.data()!.status_aulas,
        [String(aulaId)]: false,
    };

    const ultima_aula = Object.entries(status_aulas).reduce(
        (prev, [aula, status]) =>
            status && Number(aula) > prev ? Number(aula) : prev,
        0
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

    const notificacao: Notificacao = {
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: [],
        },
        evento: "DELETAR_AULA_PREPARO",
        message: `Aula deletada com sucesso por ${user.uid}`,
    };
    console.log(JSON.stringify(notificacao));

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
            "Dados inválidos ou ausentes"
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
            "Lição não encontrada"
        );
    } else if (!aulaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Aula não encontrada"
        );
    }

    const dadosParaSalvar = {
        nome: user.nome,
        igreja: user.igrejaNome,
        classe: user.classeNome,
        ultima_visualizacao: Timestamp.now(),
    };

    const registroRef = aulaRef.collection("visualizacoes").doc(user.uid);
    const registroSnap = await registroRef.get();

    if (registroSnap.exists) {
        await registroRef.update({
            ...dadosParaSalvar,
            contagem_visualizacoes: FieldValue.increment(1),
        });
        const notificacao: Notificacao = {
            actor: {
                email: user.email,
                uid: user.uid,
                ip: request.rawRequest.ip,
            },
            dados: {
                dados_enviados: request.data,
                dados_importantes: dadosParaSalvar,
            },
            evento: "REGISTRAR_VISUALIZACAO",
            message: `Visualização do usuário ${user.uid} atualizada com sucesso!`,
        };
        console.log(JSON.stringify(notificacao));

        return { message: "Visualização contabilizada com sucesso" };
    }

    await registroRef.create({ ...dadosParaSalvar, contagem_visualizacoes: 1 });
    const notificacao: Notificacao = {
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: dadosParaSalvar,
        },
        evento: "REGISTRAR_VISUALIZACAO",
        message: `Visualização do usuário ${user.uid} contabilizada com sucesso!`,
    };
    console.log(JSON.stringify(notificacao));

    return { message: "Visualização contabilizada com sucesso" };
});

export const getVisualizacoes = functions.https.onCall(async (request) => {
    const { db, user, isSuperAdmin } = await validarUsuario(request);
    if (!isSuperAdmin) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para fazer isso."
        );
    }

    const { aulaId, licaoId } = request.data;
    if (!aulaId || !licaoId) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Dados inválidos ou ausentes"
        );
    }

    const licaoRef = db.collection("licoes_preparo").doc(licaoId);
    const aulaRef = licaoRef.collection("aulas").doc(aulaId);
    const visualizacoesRef = aulaRef.collection("visualizacoes");

    const [licaoSnap, aulaSnap, viewsSnap] = await Promise.all([
        licaoRef.get(),
        aulaRef.get(),
        visualizacoesRef.get(),
    ]);

    if (!licaoSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Lição não encontrada."
        );
    } else if (!aulaSnap.exists) {
        throw new functions.https.HttpsError(
            "not-found",
            "Aula não encontrada."
        );
    }

    const usuariosSnaps = await db
        .collection("usuarios")
        .where("ministerioId", "==", user.ministerioId)
        .where("role", "in", [
            Roles.PASTOR,
            Roles.PROFESSOR,
            Roles.SECRETARIO_CONGREGACAO,
        ])
        .get();

    const viewsMap = new Map(viewsSnap.docs.map((v) => [v.id, v.data()]));
    const usuariosMap = new Map();

    usuariosSnaps.docs.forEach((v) => {
        const usuario = v.data() as User;
        const view = viewsMap.get(usuario.uid) || {
            classe: usuario.classeNome,
            contagem_visualizacoes: 0,
            igreja: usuario.igrejaNome,
            nome: usuario.nome,
            ultima_visualizacao: null,
        };

        const obj = usuariosMap.get(usuario.igrejaId) || [];
        obj.push(view);

        usuariosMap.set(usuario.igrejaId, obj);
    });

    const notificacao: Notificacao = {
        actor: {
            email: user.email,
            uid: user.uid,
            ip: request.rawRequest.ip,
        },
        dados: {
            dados_enviados: request.data,
            dados_importantes: [],
        },
        evento: "GET_VISUALIZACOES",
        message: "Mensagens geradas com sucesso",
    };
    console.log(JSON.stringify(notificacao));

    return Object.fromEntries(usuariosMap.entries());
});

export const getLicoesPreparo = functions.https.onCall(async (request) => {
    const { db, user } = await validarUsuario(request);

    if (user.role === Roles.SECRETARIO_CLASSE) {
        throw new functions.https.HttpsError(
            "permission-denied",
            "Você não tem permissão para isso"
        );
    }

    const aulasDocs = await db
        .collection("licoes_preparo")
        .where("ministerioId", "==", user.ministerioId)
        .orderBy("data_inicio", "desc")
        .limit(10)
        .get();

    if (aulasDocs.empty) return [];

    const aulas = aulasDocs.docs.map((v) => {
        const id = v.id;
        const data = v.data();
        const aulas = Object.entries(data?.status_aulas || {}).map(
            ([id, status]) => ({ id, nome: id, status })
        );

        return {
            id,
            nome: `${data?.titulo || "Sem título"} - ${
                data?.trimestre || 1
            }º Trimestre de ${data?.data_inicio.toDate().getFullYear()}`,
            aulas,
        };
    });

    console.log("Aulas geradas com sucesso pelo usuário " + user.uid);
    return aulas;
});
