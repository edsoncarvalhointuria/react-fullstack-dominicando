import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useDataContext } from "../../../context/DataContext";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Loading from "../../layout/loading/Loading";
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    query,
    where,
} from "firebase/firestore";
import { db } from "../../../utils/firebase";
import type { MatriculasInterface } from "../../../interfaces/MatriculasInterface";
import type { LicaoInterface } from "../../../interfaces/LicaoInterface";
import { AnimatePresence, motion } from "framer-motion";
import ListaChamada from "./ListaChamada";
import DadosGeraisChamada from "./DadosGeraisChamada";
import { useForm, FormProvider } from "react-hook-form";
import {
    faBookmark,
    faBookOpen,
    faCheck,
    faCircleCheck,
    faClock,
    faMountainSun,
    faPlus,
    faSquarePen,
    faThumbsUp,
    faTriangleExclamation,
    faWandMagicSparkles,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./chamada.scss";
import type { AulaInterface } from "../../../interfaces/AulaInterface";
import type { RegistroAulaInterface } from "../../../interfaces/RegistroAulaInterface";
import SearchInput from "../../ui/SearchInput";
import ResumoChamada from "./ResumoChamada";
import AlertModal from "../../ui/AlertModal";
import MatriculaModal from "../../ui/MatriculaModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuthContext } from "../../../context/AuthContext";
import CadastroAlunoModal from "../../ui/CadastroAlunoModal";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

interface ChamadaForm {
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

const functions = getFunctions();
const salvarChamada = httpsCallable(functions, "salvarChamada");
const salvarVisita = httpsCallable(functions, "salvarVisita");

function ChamadaPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [licao, setLicao] = useState<LicaoInterface | null>(null);
    const [domingo, setDomingo] = useState<Date | null>(null);
    const [matriculas, setMatriculas] = useState<MatriculasInterface[]>([]);
    const [etapa, setEtapa] = useState(1);
    const [realizada, setRealizada] = useState<"rascunho" | "realizada" | null>(
        null
    );
    const [matricularNovoAluno, setMatricularNovoAluno] = useState(false);
    const [isEnviando, setIsEnviando] = useState(false);
    const [update, setUpdate] = useState(0);
    const [addVisita, setAddVisita] = useState(false);
    const [editAluno, setEditAluno] = useState("");
    const [visitas, setVisitas] = useState<VisitaFront[]>([]);
    const [openAction, setOpenAction] = useState(false);
    const [pixOfertas, setPixOfertas] = useState<File[]>([]);
    const [pixMissoes, setPixMissoes] = useState<File[]>([]);
    const [mensagem, setMensagem] = useState<{
        message: string | ReactNode;
        title: string;
        confirmText: string;
        cancelText: string;
        onCancel: () => void;
        onClose: () => void;
        onConfirm: () => void;
        icon?: any;
    } | null>(null);

    const matriculasRef = useRef(matriculas);
    const isEdit = useRef(false);

    const navigate = useNavigate();
    const { classeId, licaoId, numeroAula, igrejaId } = useParams();
    const { classes, isLoadingData } = useDataContext();
    const { isSuperAdmin, isAdmin, user } = useAuthContext();
    const rascunhoLocalStorage = `rascunho_chamada_${licaoId}_${numeroAula}`;

    const methods = useForm<ChamadaForm>({
        defaultValues: {
            chamada: {},
            licoesTrazidas: [],
            bibliasTrazidas: [],
            visitas: 0,
            visitasLista: [],
            ofertaDinheiro: 0,
            ofertaPix: 0,
            missoesDinheiro: 0,
            missoesPix: 0,
            descricao: "",
            totalAtrasados: 0,
            totalAusentes: 0,
            imgsPixMissoes: [],
            imgsPixOfertas: [],
        },
        shouldUnregister: false,
    });

    const totalVisitas = methods.watch("visitas");
    const { chamada } = methods.watch();

    const proximo = () => {
        setMatriculas(matriculasRef.current);
        setEtapa((v) => (v == 3 ? v : v + 1));
        window.history.pushState({ etapa: etapa + 1 }, "");
        window.scrollTo(0, 0);
    };
    const voltar = () => {
        window.history.back();
    };
    const alterarPresenca = (
        label: "Presente" | "Falta" | "Atrasado" | "Falta Justificada"
    ) => {
        const presentes = matriculasRef.current.reduce(
            (prev, acc) => ({ [acc.alunoId]: label, ...prev }),
            {}
        );
        methods.setValue("chamada", presentes as any);
        if (label === "Falta" || label === "Falta Justificada") {
            methods.setValue("bibliasTrazidas", []);
            methods.setValue("licoesTrazidas", []);
        }
        setOpenAction(false);
    };
    const alterarItens = (
        item: "biblia" | "licao",
        acao: "remover" | "adicionar"
    ) => {
        const opcao = item === "biblia" ? "bibliasTrazidas" : "licoesTrazidas";
        if (acao === "remover") methods.setValue(opcao, []);
        else {
            const ids = matriculasRef.current
                .filter((v) => (item === "licao" ? v.possui_revista : true))
                .map((v) => v.alunoId)
                .filter(
                    (v) =>
                        chamada[v] !== "Falta" &&
                        chamada[v] !== "Falta Justificada"
                );
            methods.setValue(opcao, ids);
        }
        setOpenAction(false);
    };
    const navigateChamadaSalva = () => {
        if (isSuperAdmin.current)
            navigate(`/aulas/igreja/${igrejaId}/classe/${classeId}`);
        else if (isAdmin.current) navigate(`/aulas/classe/${classeId}`);
        else navigate("/aulas");
    };
    const onSubmit = async (dados: ChamadaForm) => {
        setIsEnviando(true);
        salvarVisita({ visitas: dados.visitasLista, igrejaId }).catch((v) =>
            console.log(v)
        );
        try {
            if (pixMissoes.length || pixOfertas.length) {
                const itens = [
                    ...pixMissoes.map((v) => ({ file: v, tipo: "missoes" })),
                    ...pixOfertas.map((v) => ({ file: v, tipo: "ofertas" })),
                ];
                const storage = getStorage();

                const arquivosSnap = await Promise.all(
                    itens.map(async (v) => {
                        const caminho = `comprovantes-pix/${licaoId}/${numeroAula}/${v.tipo}/${v.file.name}`;
                        const storageRef = ref(storage, caminho);
                        const arquivoSnap = await uploadBytes(
                            storageRef,
                            v.file
                        );
                        return { tipo: v.tipo, arquivo: arquivoSnap };
                    })
                );

                const links = await Promise.all(
                    arquivosSnap.map(async (v) => {
                        const link = await getDownloadURL(v.arquivo.ref);
                        return { tipo: v.tipo, link: link };
                    })
                );

                dados.imgsPixMissoes = [
                    ...links
                        .filter((v) => v.tipo === "missoes")
                        .map((v) => v.link),
                    ...(dados?.imgsPixMissoes || []),
                ];
                dados.imgsPixOfertas = [
                    ...links
                        .filter((v) => v.tipo === "ofertas")
                        .map((v) => v.link),
                    ...(dados?.imgsPixOfertas || []),
                ];
            }

            const envio = {
                dados: {
                    ...dados,
                    data_chamada:
                        domingo?.toISOString()?.split("T")[0] ||
                        new Date().toISOString().split("T")[0],
                },
                classeId,
                licaoId,
                numeroAula,
            };
            const { data } = await salvarChamada(envio);
            localStorage.removeItem(rascunhoLocalStorage);
            console.log((data as any).mensagem);
            setMensagem({
                message: "Chamada salva com sucesso!",
                onCancel: navigateChamadaSalva,
                onClose: navigateChamadaSalva,
                onConfirm: navigateChamadaSalva,
                title: "Sucesso ao salvar!",
                cancelText: "Cancelar",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
        } catch (err: any) {
            setMensagem({
                message: err.message,
                onCancel: () => setMensagem(null),
                onClose: () => setMensagem(null),
                onConfirm: () => window.location.reload(),
                title: "Erro ao salvar chamada",
                confirmText: "Atualizar Página",
                cancelText: "Cancelar",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        } finally {
            setIsEnviando(false);
        }
    };
    const limparFomulario = () => {
        localStorage.removeItem(rascunhoLocalStorage);
        window.location.reload();
    };

    useEffect(() => {
        try {
            if (matriculasRef.current && !isEdit.current) {
                const m = matriculasRef.current
                    .filter((v) => v.possui_revista)
                    .map((v) => v.alunoId);
                methods.setValue("licoesTrazidas", m, {
                    shouldDirty: false,
                    shouldValidate: false,
                });

                const b = matriculasRef.current.map((v) => v.alunoId);
                methods.setValue("bibliasTrazidas", b, {
                    shouldDirty: false,
                    shouldValidate: false,
                });
            }
        } catch (err) {
            console.log("deu esse erro: ", err);
        }
    }, [matriculasRef.current]);
    useEffect(() => {
        const popstate = (event: PopStateEvent) => {
            const etapaAnterior = event.state?.etapa || 1;
            setEtapa(etapaAnterior);
        };
        window.addEventListener("popstate", popstate);

        return () => window.removeEventListener("popstate", popstate);
    }, []);
    useEffect(() => {
        const getLicao = async () => {
            const collLicao = collection(db, "licoes");
            const q = query(
                collLicao,
                where(documentId(), "==", licaoId!),
                isSuperAdmin.current
                    ? where("ministerioId", "==", user!.ministerioId)
                    : where("igrejaId", "==", user!.igrejaId)
            );
            const licaoSnapshot = await getDocs(q);

            const licoes = {
                ...licaoSnapshot.docs[0].data(),
                id: licaoSnapshot.docs[0].id,
            } as LicaoInterface;

            const n = Number(numeroAula);

            if (
                Number.isNaN(n) ||
                n > licoes.numero_aulas ||
                n < 1 ||
                licaoSnapshot.empty
            )
                navigate("/aulas");

            const domingo = licoes?.data_inicio?.toDate();
            domingo?.setDate(domingo?.getDate() + (n - 1) * 7);
            setDomingo(domingo);
            return licoes;
        };

        const getMatriculas = async () => {
            setIsLoading(true);

            const collectionAlunos = collection(db, "matriculas");
            const q = query(
                collectionAlunos,
                where("licaoId", "==", licaoId),
                isSuperAdmin.current
                    ? where("ministerioId", "==", user!.ministerioId)
                    : where("igrejaId", "==", user!.igrejaId)
            );
            const alunosSnapshot = await getDocs(q);

            return alunosSnapshot.docs.map((v) => ({
                ...v.data(),
                id: v.id,
            })) as unknown as MatriculasInterface[];
        };

        const getAula = async () => {
            const aulaDoc = doc(db, `licoes/${licaoId}/aulas/${numeroAula}`);
            const aulaSnapshot = await getDoc(aulaDoc);

            if (!aulaSnapshot.exists()) return;

            const aula = aulaSnapshot.data() as AulaInterface;

            if (!aula.registroRef) return;

            const registrosSnap = await getDoc(aula.registroRef);

            if (!registrosSnap.exists()) return;

            const registros = {
                ...(registrosSnap.data() || {}),
                id: registrosSnap.id,
            } as unknown as RegistroAulaInterface;
            setVisitas(registros.visitas_lista || []);

            const chamadaCollection = collection(aula.registroRef, "chamada");
            const chamadaSnap = await getDocs(chamadaCollection);

            if (chamadaSnap.empty) return;

            const chamada = chamadaSnap.docs.map((v) => ({
                id: v.id,
                ...v.data(),
            })) as ChamadaInterface[];

            if (!chamada.length) return;

            const formReset = {
                chamada: Object.fromEntries(
                    chamada.map((v) => [v.id, v.status])
                ),
                licoesTrazidas: chamada
                    .filter((v) => v.trouxe_licao)
                    .map((v) => v.id),
                bibliasTrazidas: chamada
                    .filter((v) => v.trouxe_biblia)
                    .map((v) => v.id),
                visitas: registros.visitas,
                ofertaDinheiro: registros.ofertas.dinheiro,
                ofertaPix: registros.ofertas.pix,
                missoesDinheiro: registros.missoes.dinheiro,
                missoesPix: registros.missoes.pix,
                imgsPixMissoes: registros.imgsPixMissoes
                    ? registros.imgsPixMissoes!
                    : [],
                imgsPixOfertas: registros.imgsPixOfertas
                    ? registros.imgsPixOfertas!
                    : [],
                descricao: registros.descricao,
            };

            methods.reset(formReset);

            return chamada;
        };

        Promise.all([getLicao(), getMatriculas(), getAula()])
            .then(([l, m, a]) => {
                setLicao(l);
                if (a) {
                    isEdit.current = true;
                    setRealizada("realizada");
                    const alunosMatriculados = a.map((v) => v.id);
                    const listaAtualizada = m.filter((v) =>
                        alunosMatriculados.includes(v.alunoId)
                    );
                    setMatriculas(listaAtualizada);
                    matriculasRef.current = listaAtualizada;
                } else {
                    const rascunho = localStorage.getItem(rascunhoLocalStorage);
                    if (rascunho) {
                        setRealizada("rascunho");
                        console.log("Rascunho recuperado...");
                        const r = JSON.parse(rascunho);

                        setVisitas(r.visitas_lista || []);

                        methods.reset({
                            ...r,
                            imgsPixMissoes: [],
                            imgsPixOfertas: [],
                        });
                    }

                    setMatriculas(m);
                    matriculasRef.current = m;
                }
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                navigate("/aulas");
            })
            .finally(() => setIsLoading(false));
    }, [update]);
    if (
        !isLoadingData &&
        classes.length &&
        !classes.find((v) => v.id === classeId)
    ) {
        return <Navigate to={"/aulas"} />;
    }
    if (isLoading || isLoadingData) return <Loading />;
    return (
        <>
            {isEnviando ? (
                <Loading />
            ) : (
                <div className="chamada-page">
                    <div className="chamada-page__infos">
                        <h2 className="chamada-page__title">{licao?.titulo}</h2>
                        <p className="chamada-page__data">
                            <data value={domingo?.toLocaleDateString()}>
                                {domingo?.toLocaleDateString("pt-BR", {
                                    weekday: "long",
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                })}
                            </data>
                        </p>
                        <div className="chamada-page__infos--aula">
                            <p className="chamada-page__aula">
                                Aula: {numeroAula}
                            </p>

                            {realizada === "realizada" ? (
                                <span className="chamada-page__status--realizada">
                                    <FontAwesomeIcon icon={faCircleCheck} />
                                    Chamada Realizada
                                </span>
                            ) : (
                                realizada === "rascunho" && (
                                    <button
                                        title="Reiniciar Formulário"
                                        type="button"
                                        className="chamada-page__status--rascunho"
                                        onClick={() =>
                                            setMensagem({
                                                message:
                                                    "Você tem certeza que deseja descartar este rascunho? Todo o progresso não salvo será perdido.",
                                                onCancel: () =>
                                                    setMensagem(null),
                                                onClose: () =>
                                                    setMensagem(null),
                                                onConfirm: limparFomulario,
                                                title: "Resetar Formulário?",
                                                confirmText:
                                                    "Sim, resetar formulário",
                                                cancelText: "Cancelar",
                                                icon: (
                                                    <FontAwesomeIcon
                                                        icon={
                                                            faTriangleExclamation
                                                        }
                                                    />
                                                ),
                                            })
                                        }
                                    >
                                        <FontAwesomeIcon icon={faSquarePen} />
                                        Rascunho
                                    </button>
                                )
                            )}
                        </div>
                    </div>
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(onSubmit)}>
                            <AnimatePresence mode="wait">
                                {etapa === 1 ? (
                                    <>
                                        <div className="chamada-page__filtro">
                                            <SearchInput
                                                onSearch={(texto) =>
                                                    setMatriculas(
                                                        matriculasRef.current.filter(
                                                            (v) =>
                                                                v.alunoNome
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        texto
                                                                    ) ||
                                                                v.alunoId.toLowerCase() ===
                                                                    texto
                                                        )
                                                    )
                                                }
                                            />

                                            <div className="chamada-page__filtro--buttons">
                                                <div className="chamada-page__filtro__actions">
                                                    <button
                                                        title="Abrir Menu"
                                                        className="chamada-page__filtro__actions--button"
                                                        type="button"
                                                        onClick={() =>
                                                            setOpenAction(
                                                                (v) => !v
                                                            )
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            className="chamada-page__filtro__varinha"
                                                            icon={
                                                                faWandMagicSparkles
                                                            }
                                                        />
                                                    </button>
                                                    <AnimatePresence>
                                                        {openAction && (
                                                            <motion.div
                                                                key={
                                                                    "chamada-page-lista-actions"
                                                                }
                                                                className="chamada-page__filtro__actions-lista"
                                                                initial={{
                                                                    opacity: 0,
                                                                    x: 10,
                                                                }}
                                                                animate={{
                                                                    opacity: 1,
                                                                    x: 0,
                                                                }}
                                                                exit={{
                                                                    opacity: 0,
                                                                    x: 20,
                                                                }}
                                                                transition={{
                                                                    duration: 0.3,
                                                                }}
                                                            >
                                                                <div className="chamada-page__filtro__actions-action">
                                                                    <button
                                                                        type="button"
                                                                        title="Todos Presentes"
                                                                        onClick={() =>
                                                                            alterarPresenca(
                                                                                "Presente"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faCheck
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T.
                                                                        Presente
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Todos Atrasados"
                                                                        onClick={() =>
                                                                            alterarPresenca(
                                                                                "Atrasado"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faClock
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T.
                                                                        Atrasado
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Todos com Falta"
                                                                        onClick={() =>
                                                                            alterarPresenca(
                                                                                "Falta"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faXmark
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T. Falta
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Todos com Falta Justificada"
                                                                        onClick={() =>
                                                                            alterarPresenca(
                                                                                "Falta Justificada"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faMountainSun
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T. F.
                                                                        Justificada
                                                                    </button>
                                                                </div>
                                                                <hr />
                                                                <div className="chamada-page__filtro__actions-action">
                                                                    <button
                                                                        type="button"
                                                                        title="Todos Com Revista"
                                                                        onClick={() =>
                                                                            alterarItens(
                                                                                "licao",
                                                                                "adicionar"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faBookOpen
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T. c/
                                                                        Revista
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Todos Sem Revista"
                                                                        onClick={() =>
                                                                            alterarItens(
                                                                                "licao",
                                                                                "remover"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faBookmark
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T. s/
                                                                        Revista
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Todos Com Bíblia"
                                                                        onClick={() =>
                                                                            alterarItens(
                                                                                "biblia",
                                                                                "adicionar"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faBookOpen
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T. c/
                                                                        Bíblia
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Todos Sem Bíblia"
                                                                        onClick={() =>
                                                                            alterarItens(
                                                                                "biblia",
                                                                                "remover"
                                                                            )
                                                                        }
                                                                    >
                                                                        <span>
                                                                            <FontAwesomeIcon
                                                                                icon={
                                                                                    faBookmark
                                                                                }
                                                                            />
                                                                        </span>
                                                                        T. s/
                                                                        Bíblia
                                                                    </button>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                {realizada !== "realizada" && (
                                                    <button
                                                        className="chamada-page__filtro__button-new"
                                                        type="button"
                                                        onClick={() =>
                                                            setMatricularNovoAluno(
                                                                true
                                                            )
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            className="chamada-page__filtro__add-new"
                                                            icon={faPlus}
                                                        />

                                                        <span>
                                                            matricular aluno
                                                        </span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <ListaChamada
                                            key="etapa1"
                                            setEditAluno={setEditAluno}
                                            matriculas={matriculas}
                                        />
                                    </>
                                ) : etapa === 2 ? (
                                    <DadosGeraisChamada
                                        pixOfertas={pixOfertas}
                                        pixMissoes={pixMissoes}
                                        setPixMissoes={setPixMissoes}
                                        setPixOfertas={setPixOfertas}
                                        setVisitas={setVisitas}
                                        visitas={visitas}
                                        setAddVisita={setAddVisita}
                                        key="etapa2"
                                    />
                                ) : (
                                    <ResumoChamada
                                        matriculados={matriculas}
                                        visitas_lista={visitas}
                                    />
                                )}
                            </AnimatePresence>

                            <div
                                className={`chamada-page__navegacao chamada-page__navegacao-${etapa}`}
                            >
                                {etapa !== 1 && (
                                    <button
                                        type="button"
                                        onClick={voltar}
                                        className="chamada-page__navegacao--voltar"
                                    >
                                        Voltar
                                    </button>
                                )}
                                {etapa !== 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            proximo();

                                            if (!isEdit.current) {
                                                const values =
                                                    methods.getValues();

                                                localStorage.setItem(
                                                    rascunhoLocalStorage,
                                                    JSON.stringify(values)
                                                );
                                            }
                                        }}
                                        className="chamada-page__navegacao--avancar"
                                    >
                                        Avançar
                                    </button>
                                ) : (
                                    <motion.button
                                        type="submit"
                                        onTap={() => {
                                            if (etapa !== 3) {
                                                proximo();
                                                // setMatriculas(matriculasRef.current);
                                            }
                                        }}
                                        className="chamada-page__navegacao--avancar"
                                    >
                                        Salvar Chamada
                                    </motion.button>
                                )}
                            </div>
                        </form>
                    </FormProvider>
                </div>
            )}
            <AnimatePresence>
                {licao && matricularNovoAluno && (
                    <MatriculaModal
                        key={"matricular-aluno-modal"}
                        igrejaId={licao.igrejaId}
                        licao={licao}
                        licaoId={licao.id}
                        onClose={() => setMatricularNovoAluno(false)}
                        onSave={() => setUpdate((v) => v + 1)}
                    />
                )}

                {addVisita && (
                    <CadastroAlunoModal
                        igrejaId={licao?.igrejaId || ""}
                        onCancel={() => setAddVisita(false)}
                        onSave={(v) => {
                            setAddVisita(false);
                            setVisitas((a) => [...a, v as any]);
                            methods.setValue("visitas", totalVisitas + 1);
                        }}
                        key={"adicionar-visita"}
                        type="visita"
                    />
                )}

                {editAluno && (
                    <CadastroAlunoModal
                        igrejaId={licao?.igrejaId || ""}
                        onCancel={() => setEditAluno("")}
                        onSave={() => {
                            setTimeout(() => setUpdate((v) => v + 1), 2000);
                            setMensagem({
                                message: (
                                    <>
                                        <span>
                                            Aluno atualizado com sucesso!
                                        </span>
                                        <span>
                                            Pode levar alguns segundos até que
                                            os dados do seu aluno sejam
                                            atualizados totalmente.
                                        </span>
                                        <strong>
                                            Pode continuar a chamada
                                            normalmente!
                                        </strong>
                                    </>
                                ),

                                confirmText: "OK",
                                cancelText: "Cancelar",
                                onCancel: () => setMensagem(null),
                                onClose: () => setMensagem(null),
                                onConfirm: () => setMensagem(null),
                                title: "Atualização concluída",
                            });
                        }}
                        key={"editar-alunos"}
                        alunoId={editAluno}
                    />
                )}
            </AnimatePresence>
            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default ChamadaPage;
