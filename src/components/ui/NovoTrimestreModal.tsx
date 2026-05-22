import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChurch,
    faFilePen,
    faImage,
    faRulerVertical,
    faSquarePen,
    faStar,
    faTrash,
    faTriangleExclamation,
    faUserPlus,
    faUsersRectangle,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import {
    collection,
    doc,
    documentId,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    where,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { db } from "../../utils/firebase";
import { useNavigate } from "react-router-dom";
import "./novo-trimestre-modal.scss";
import type { LicaoInterface } from "../../interfaces/LicaoInterface";
import {
    FormProvider,
    useFieldArray,
    useForm,
    useWatch,
    type FieldError,
    type UseFieldArrayAppend,
    type UseFieldArrayRemove,
    type UseFormRegister,
} from "react-hook-form";
import AlertModal from "./AlertModal";
import SearchInput from "./SearchInput";
import CadastroAlunoModal from "./CadastroAlunoModal";
import type { CacheMatriculasInterface } from "../../interfaces/MatriculasInterface";
import LoadingModal from "../layout/loading/LoadingModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import type {
    AlunoInterface,
    CacheAlunoInteface,
} from "../../interfaces/AlunoInterface";
import { getIdade } from "../../utils/getIdade";
import { useAuthContext } from "../../context/AuthContext";
import { reduzirImagem } from "../../utils/reduzirImagem";
import { useDataContext } from "../../context/DataContext";
import { ListaDeAulas } from "./NovoTrimestreTemplate";

interface AlunoSelecionado {
    alunoId: string;
    possui_revista: boolean;
    idade: number;
    nome: string;
}
interface NovaLicaoForm {
    titulo: string;
    numero_aulas: number;
    data_inicio: string;
    img?: FileList;
    alunosSelecionados: AlunoSelecionado[];
    isInativa: boolean;
    trimestre: number;
}

const functions = getFunctions();
const salvarNovoTrimestre = httpsCallable(functions, "salvarNovoTrimestre");
const deletarLicao = httpsCallable(functions, "deletarLicao");

const ItemAlunoMatriculado = React.memo(
    ({
        alunoId,
        alunoIdade,
        alunoNome,
        isForaDaFaixa,
        remove,
        index,
        register,
    }: {
        alunoId: string;
        alunoIdade: string;
        alunoNome: string;
        isForaDaFaixa: boolean;
        remove: UseFieldArrayRemove;
        index: number;
        register: UseFormRegister<any>;
    }) => {
        return (
            <motion.li
                layoutId={alunoId}
                className={isForaDaFaixa ? "matriculas--fora-da-faixa" : ""}
            >
                <motion.div
                    className="matriculas-item__nome"
                    onTap={() => remove(index)}
                >
                    <span>{alunoNome}</span>{" "}
                    <span className="matriculas--lista-idade">
                        ({alunoIdade} anos)
                    </span>
                </motion.div>

                <div className="matriculas-item__licao">
                    <label htmlFor={"matriculados-revista" + alunoId}>
                        Revista?
                    </label>
                    <input
                        type="checkbox"
                        id={"matriculados-revista" + alunoId}
                        {...register(
                            `alunosSelecionados.${index}.possui_revista`,
                        )}
                    />
                </div>
            </motion.li>
        );
    },
);

const AlunosDisponiveis = ({
    listaAlunos,
    append,
}: {
    listaAlunos: (AlunoInterface & { nome: string; idade: number })[];
    append: UseFieldArrayAppend<any>;
}) => {
    return (
        <ul className="matriculas--lista">
            {listaAlunos.map((v) => (
                <motion.li
                    className="matriculas--item"
                    key={v.id}
                    onTap={() => {
                        append({
                            alunoId: v.id,
                            possui_revista: true,
                            nome: v.nome,
                            idade: v.idade,
                        });
                    }}
                >
                    <motion.p layoutId={v.id}>
                        {v.nome}{" "}
                        <span className="matriculas--lista-idade">
                            ({v.idade}) anos
                        </span>
                    </motion.p>
                </motion.li>
            ))}
        </ul>
    );
};
const AlunosMatriculados = ({
    listaAlunosSelecionados,
    alunosForaDaFaixa,
    remove,
    fieldIndex,
    register,
}: {
    listaAlunosSelecionados: any[];
    alunosForaDaFaixa: Map<any, any>;
    remove: UseFieldArrayRemove;
    fieldIndex: (v: any) => number;
    register: UseFormRegister<any>;
}) => {
    return (
        <ul className="matriculas--lista">
            {listaAlunosSelecionados.map((v) => (
                <ItemAlunoMatriculado
                    alunoId={v.alunoId}
                    alunoIdade={v?.idade}
                    alunoNome={v?.nome}
                    index={fieldIndex(v)}
                    isForaDaFaixa={alunosForaDaFaixa.has(v.alunoId)}
                    register={register}
                    remove={remove}
                    key={v.id}
                />
            ))}
        </ul>
    );
};

const ErroComponent = ({ field }: { field: FieldError | undefined }) => {
    return (
        <AnimatePresence>
            {field && (
                <motion.span
                    key={field.message}
                    className="novo-trimestre__input--erro"
                >
                    {field.message}
                </motion.span>
            )}
        </AnimatePresence>
    );
};

function NovoTrimestreModal({
    classeId,
    onClose,
    onSave,
    igrejaId,
    licaoReference = null,
}: {
    classeId: string;
    igrejaId: string;
    onClose: () => void;
    onSave: (dados: LicaoInterface) => void;
    licaoReference?: LicaoInterface | null;
}) {
    const [isLoading, setIsLoading] = useState(true);
    const [classe, setClasse] = useState<ClasseInterface | null>(null);
    const [licao, setLicao] = useState<LicaoInterface | null>(null);
    const [alunosMap, setAlunosMap] = useState<
        Map<string, AlunoInterface & { nome: string; idade: number }>
    >(new Map());
    const [pesquisa, setPesquisa] = useState("");
    const [showCadastroAluno, setShowCadastroAluno] = useState<boolean>(false);
    const [isEnviando, setIsEnviando] = useState(false);
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
    const navigate = useNavigate();

    const trimestreAnterior = useRef<AlunoSelecionado[]>([]);
    const messageForaDaIdade = useRef<boolean>(false);
    const alunosForaDaIdadeRef = useRef<any>(null);
    const dadosFinaisRef = useRef<any>(null);

    const methods = useForm<NovaLicaoForm>({
        defaultValues: {
            numero_aulas: 13,
            alunosSelecionados: [],
            isInativa: false,
            trimestre: 1,
        },
        shouldUnregister: false,
    });
    const {
        register,
        setValue,
        handleSubmit,
        reset,
        control,
        formState: { errors },
    } = methods;
    const { fields, append, remove } = useFieldArray({
        control,
        name: "alunosSelecionados",
    });
    const { isSuperAdmin, user, isSecretario } = useAuthContext();
    const { classes } = useDataContext();

    const imagem = useWatch({ control, name: "img" });

    const normalizeDate = (data: any) => {
        const d = new Date(data);
        d.setHours(0, 0, 0, 0);
        return d;
    };
    const apagarLicao = async (licaoId: string) => {
        try {
            setIsLoading(true);
            setMensagem(null);
            await deletarLicao({ licaoId });
            location.reload();
        } catch (error: any) {
            console.log("deu esse erro", error);
            setMensagem({
                title: "Erro ao deletar lição",
                message: error.message,
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                onCancel: () => setMensagem(null),
                cancelText: "Cancelar",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        }
    };
    const importarAlunos = () => {
        const ids = fields.map((v) => v.alunoId);
        const filtro = trimestreAnterior.current.filter(
            (v) => !ids.includes(v.alunoId),
        );

        setValue("alunosSelecionados", [...fields, ...filtro]);
    };
    const deletarRevista = () => {
        setMensagem({
            title: "Deletar lição",
            message: (
                <>
                    <span>
                        Tem certeza que deseja deletar a lição:{" "}
                        <strong>{licaoReference?.titulo}</strong>?
                    </span>
                    <span>
                        Isso irá apagar <strong>TODOS</strong> os dados
                        associados a ela.
                    </span>
                </>
            ),
            onClose: () => {
                setMensagem(null);
                onClose();
            },
            onConfirm: () => apagarLicao(licaoReference!.id),
            onCancel: () => {
                setMensagem(null);
                onClose();
            },
            cancelText: "Cancelar",
            confirmText: "Sim, deletar lição",
            icon: <FontAwesomeIcon icon={faTrash} />,
        });
    };

    const save = async () => {
        setMensagem(null);
        setIsEnviando(true);
        try {
            let urlImg: string | null = null;
            if (
                dadosFinaisRef.current.img &&
                dadosFinaisRef.current.img.length
            ) {
                const uploadImagem = async () => {
                    const arquivoOriginal = dadosFinaisRef.current.img[0];
                    const arquivo = await reduzirImagem(
                        arquivoOriginal,
                        800,
                        800,
                    );
                    const storage = getStorage();
                    const caminho = `capas-licoes/${Date.now()}-${
                        arquivo.name
                    }`;
                    const storageRef = ref(storage, caminho);
                    const arquivoSnap = await uploadBytes(storageRef, arquivo);
                    const link = await getDownloadURL(arquivoSnap.ref);
                    return link;
                };
                if (licaoReference) {
                    if (licaoReference.img !== dadosFinaisRef.current.img)
                        urlImg = await uploadImagem();
                } else urlImg = await uploadImagem();
            } else if (licaoReference) urlImg = licaoReference.img;
            const dadosAtualizados = {
                ...dadosFinaisRef.current,
                img: urlImg,
            };
            const { data }: any = await salvarNovoTrimestre({
                dados: dadosAtualizados,
                igrejaId,
                classeId,
                licaoId: licaoReference?.id,
            });
            onSave(data);
            onClose();
        } catch (error: any) {
            console.log("deu esse erro", error);
            setMensagem({
                title: "Erro ao salvar lição",
                message: error.message,
                onClose: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
                onCancel: () => setMensagem(null),
                cancelText: "Cancelar",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        } finally {
            setIsEnviando(false);
        }
    };
    const onSubmit = async (dados: NovaLicaoForm) => {
        dadosFinaisRef.current = dados;

        if (licao) {
            const dataUsuario = normalizeDate(dados.data_inicio + "T00:00:00");
            const dataInicio = normalizeDate(licao.data_inicio.toDate());
            const dataFim = normalizeDate(licao.data_fim.toDate());

            if (dataUsuario >= dataInicio && dataUsuario < dataFim) {
                return setMensagem({
                    title: "Datas conflitantes",
                    message: (
                        <span>
                            A lição anterior <strong>{licao!.titulo}</strong>{" "}
                            está com data de finalização prevista para o dia:{" "}
                            <strong>
                                {licao!.data_fim
                                    .toDate()
                                    .toLocaleDateString("pt-BR")}
                            </strong>
                            .<br />
                            <br />O que você deseja fazer?
                        </span>
                    ),
                    onClose: () => setMensagem(null),
                    onConfirm: () => {
                        dadosFinaisRef.current.isInativa = false;
                        save();
                    },
                    onCancel: () => {
                        dadosFinaisRef.current.isInativa = true;
                        save();
                    },
                    cancelText: "Cadastrar essa lição como inativa.",
                    confirmText:
                        "Desativar a lição anterior e cadastrar essa como ativa.",
                    icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
                });
            }
        }
        if (licaoReference) {
            return setMensagem({
                title: "Salvar alterações",
                message: (
                    <span>
                        Você deseja salvar as alterações da lição{" "}
                        <strong>{licaoReference!.titulo}</strong>?
                    </span>
                ),
                onClose: () => setMensagem(null),
                onConfirm: () => save(),
                onCancel: () => setMensagem(null),
                cancelText: "Cancelar",
                confirmText: "Salvar alterações",
                icon: <FontAwesomeIcon icon={faFilePen} />,
            });
        }

        save();
    };

    const listaAlunosMemo = useMemo(() => {
        const as = fields.map((v) => v.alunoId);
        const lista = Array.from(alunosMap?.values() || []).filter(
            (v) =>
                !as.includes(v.id) &&
                (v.nome.toLowerCase().includes(pesquisa) ||
                    v.idade.toString().includes(pesquisa)),
        );

        return lista;
    }, [alunosMap, pesquisa, fields]);
    const alunosForaDaIdadeMemo = useMemo(() => {
        const alunosForaMap = new Map();

        if (classe?.idade_minima || classe?.idade_maxima) {
            fields.forEach((v) => {
                const aluno = alunosMap.get(v.alunoId);
                if (
                    aluno &&
                    classe.idade_minima &&
                    aluno.idade < classe.idade_minima
                )
                    alunosForaMap.set(v.alunoId, "abaixo");
                if (
                    aluno &&
                    classe.idade_maxima &&
                    aluno.idade > classe.idade_maxima
                )
                    alunosForaMap.set(v.alunoId, "acima");
            });
        }

        return alunosForaMap;
    }, [fields, alunosMap]);
    const listaAlunosSelecionadosMemo = useMemo(() => {
        return fields
            .filter((v) => {
                const aluno = alunosMap.get(v.alunoId);

                return (
                    aluno?.nome.toLowerCase().includes(pesquisa) ||
                    aluno?.idade.toString().includes(pesquisa)
                );
            })
            .sort((a, b) => {
                if (alunosForaDaIdadeMemo.get(a.alunoId)) return -1;
                if (alunosForaDaIdadeMemo.get(b.alunoId)) return 1;

                return (
                    alunosMap.get(a.alunoId)!.idade -
                    alunosMap.get(b.alunoId)!.idade
                );
            });
    }, [alunosMap, pesquisa, fields, alunosForaDaIdadeMemo]);

    const fieldIndex = useCallback(
        (field: any) => fields.findIndex((f) => f.id === field.id),
        [fields],
    );

    useEffect(() => {
        if (messageForaDaIdade.current) return;

        if (!alunosForaDaIdadeMemo.size) {
            alunosForaDaIdadeRef.current = alunosForaDaIdadeMemo;
            return;
        }
        const prev = alunosForaDaIdadeRef.current;
        if (prev && prev.size === alunosForaDaIdadeMemo.size) return;

        const acima = [...alunosForaDaIdadeMemo.entries()]
            .filter(([_, status]) => status === "acima")
            .map(([id, _]) => alunosMap.get(id)?.nome_completo);
        const abaixo = [...alunosForaDaIdadeMemo.entries()]
            .filter(([_, status]) => status === "abaixo")
            .map(([id, _]) => alunosMap.get(id)?.nome_completo);
        setMensagem({
            title: "Fora da faixa",
            message: (
                <>
                    <span>
                        Prezado, a classe tem a idade mínima de{" "}
                        <strong>{classe?.idade_minima || 0} anos</strong> e
                        idade máxima de{" "}
                        <strong>{classe?.idade_maxima} anos</strong>.
                    </span>
                    {abaixo.length > 0 && (
                        <>
                            <br />
                            <span>
                                Os alunos abaixo estão abaixo da idade mínima:
                            </span>
                            <span>
                                <strong>{abaixo.join(", ")}.</strong>
                            </span>
                        </>
                    )}

                    {acima.length > 0 && (
                        <>
                            <br />
                            <span>
                                Os alunos abaixo estão acima da idade máxima:
                            </span>
                            <span>
                                <strong>{acima.join(", ")}.</strong>
                            </span>
                        </>
                    )}
                </>
            ),
            onClose: () => setMensagem(null),
            onConfirm: () => setMensagem(null),
            onCancel: () => {
                setMensagem(null);
                messageForaDaIdade.current = true;
            },
            cancelText: "Não mostrar novamente",
            confirmText: "Continuar",
            icon: <FontAwesomeIcon icon={faRulerVertical} />,
        });

        alunosForaDaIdadeRef.current = alunosForaDaIdadeMemo;
    }, [alunosForaDaIdadeMemo]);
    useEffect(() => {
        const getLicao = async () => {
            if (!licaoReference) {
                const licoesCollection = collection(db, "licoes");
                const q = query(
                    licoesCollection,
                    where("classeId", "==", classeId),
                    where("ativo", "==", true),
                    isSuperAdmin.current
                        ? where("ministerioId", "==", user!.ministerioId)
                        : where("igrejaId", "==", user!.igrejaId),
                );
                const licoesSnap = await getDocs(q);

                if (licoesSnap.empty) {
                    const hoje = new Date();
                    const mes = Math.floor(hoje.getMonth() / 3) + 1;
                    setValue("trimestre", mes);
                    return null;
                }

                const licoes = {
                    ...licoesSnap.docs[0].data(),
                    id: licoesSnap.docs[0].id,
                } as LicaoInterface;

                const dataFim = licoes.data_fim.toDate();
                dataFim.setDate(dataFim.getDate() + 7);

                setValue(
                    "trimestre",
                    (licoes?.numero_trimestre || 0) + 1 === 5
                        ? 1
                        : (licoes?.numero_trimestre || 0) + 1,
                );
                setValue("data_inicio", dataFim.toISOString().split("T")[0]);

                return licoes;
            } else {
                setValue("isInativa", !licaoReference!.ativo);
                return null;
            }
        };
        const getAlunos = async () => {
            const alunosDoc = doc(db, "cache_alunos", igrejaId);

            const alunosSnap = await getDoc(alunosDoc);

            if (!alunosSnap.exists()) return [];

            const alunosCache = alunosSnap.data() as CacheAlunoInteface;
            const alunos = Object.values(alunosCache.lista).map((v) => ({
                nome: v.nome_completo,
                idade: getIdade(v.data_nascimento),
                ...v,
            }));

            return alunos;
        };
        const getTrimestreAnterior = async (
            licaoId: string,
            isPrimeiroAcesso?: boolean,
        ) => {
            let licaoIdFinal = licaoId;
            if (isPrimeiroAcesso) {
                const ultimaLicaoCll = collection(db, "licoes");
                const q = query(
                    ultimaLicaoCll,
                    where(documentId(), "!=", licaoId),
                    where("classeId", "==", classeId),
                    isSuperAdmin.current
                        ? where("ministerioId", "==", user!.ministerioId)
                        : where("igrejaId", "==", user!.igrejaId),
                    orderBy("data_inicio", "desc"),
                    limit(1),
                );

                const ultimaLicaoDocs = await getDocs(q);

                if (!ultimaLicaoDocs.empty) {
                    const ultimaLicaoId = ultimaLicaoDocs.docs[0].id;
                    licaoIdFinal = ultimaLicaoId;
                }
            }

            const matriculasCollection = doc(
                db,
                "cache_matriculas",
                `${igrejaId}_${licaoIdFinal}`,
            );

            const matriculasSnap = await getDoc(matriculasCollection);

            if (!matriculasSnap.exists()) return [];

            const matriculas =
                matriculasSnap.data() as CacheMatriculasInterface;

            return Object.values(matriculas.lista);
        };
        Promise.all([getLicao(), getAlunos()])
            .then(([licao, aluno]) => {
                const classe = classes.find((v) => v.id === classeId);
                const alunosOrdenados = aluno.sort((a, b) => {
                    const aEstaNaFaixa =
                        a.idade >=
                        (typeof classe?.idade_minima === "number"
                            ? classe!.idade_minima
                            : 0);
                    const bEstaNaFaixa =
                        b.idade >=
                        (typeof classe?.idade_minima === "number"
                            ? classe!.idade_minima
                            : 0);

                    if (aEstaNaFaixa && !bEstaNaFaixa) return -1;

                    if (!aEstaNaFaixa && bEstaNaFaixa) return 1;

                    return a.idade - b.idade;
                });
                const alunoMap = new Map(alunosOrdenados.map((v) => [v.id, v]));

                if (!classe) navigate("/aulas");

                setClasse(classe!);
                setLicao(licao);
                setAlunosMap(alunoMap as any);

                if (licaoReference) {
                    if (licaoReference.primeiroAcesso) {
                        setMensagem({
                            message: (
                                <>
                                    <span>
                                        Esta lição foi{" "}
                                        <strong>
                                            cadastrada automaticamente
                                        </strong>{" "}
                                        para você.
                                    </span>
                                    <br />
                                    <span>
                                        👉 Próximo passo:{" "}
                                        <strong>
                                            matricule os alunos deste trimestre
                                        </strong>
                                        .
                                    </span>
                                    <br />
                                    <span>
                                        💡 Dica: use o botão{" "}
                                        <strong>
                                            "Importar alunos do trimestre
                                            anterior"
                                        </strong>{" "}
                                        para preencher mais rápido.
                                    </span>
                                </>
                            ),
                            title: "Primeiro Acesso",
                            onClose: () => setMensagem(null),
                            onConfirm: () => setMensagem(null),
                            onCancel: () => setMensagem(null),
                            cancelText: "Ok",
                            confirmText: "Ok",
                            icon: <FontAwesomeIcon icon={faStar} />,
                        });
                    }
                    getTrimestreAnterior(
                        licaoReference.id,
                        licaoReference.primeiroAcesso,
                    )
                        .then((matricula) => {
                            const result = matricula?.map(
                                (v) =>
                                    ({
                                        alunoId: v.alunoId,
                                        possui_revista: v.possui_revista,
                                        nome: v.alunoNome,
                                        idade: getIdade(
                                            alunoMap.get(v.alunoId)!
                                                .data_nascimento,
                                        ),
                                    }) as any,
                            );
                            trimestreAnterior.current = result;

                            reset({
                                alunosSelecionados:
                                    licaoReference.primeiroAcesso ? [] : result,
                                data_inicio: licaoReference.data_inicio
                                    .toDate()
                                    .toISOString()
                                    .split("T")[0],
                                numero_aulas: licaoReference.numero_aulas,
                                trimestre:
                                    licaoReference?.numero_trimestre || 1,
                                titulo: licaoReference.titulo,
                                img: undefined,
                                isInativa: licaoReference.ativo,
                            });
                        })
                        .catch((err) => console.log("deu esse erro", err));
                } else if (licao) {
                    getTrimestreAnterior(licao.id)
                        .then((a) => {
                            trimestreAnterior.current = a.map(
                                (v) =>
                                    ({
                                        alunoId: v.alunoId,
                                        possui_revista: true,
                                        nome: v.alunoNome,
                                        idade: getIdade(
                                            alunoMap.get(v.alunoId)!
                                                .data_nascimento,
                                        ),
                                    }) as any,
                            );
                        })
                        .catch((err) => console.log("deu esse erro", err));
                }
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                navigate("/aulas");
            })
            .finally(() => setIsLoading(false));
    }, []);
    return (
        <>
            <div
                className="novo-trimestre-close"
                onClick={() => (!isEnviando ? onClose() : null)}
            >
                <motion.div
                    className="novo-trimestre"
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isLoading ? (
                        <LoadingModal
                            isEnviando={isLoading}
                            mensagem="Carregando"
                        />
                    ) : (
                        <>
                            <LoadingModal isEnviando={isEnviando} />
                            <div className="novo-trimestre__header">
                                <div className="novo-trimestre__header--title-group">
                                    <div className="novo-trimestre__header--title">
                                        {licaoReference ? (
                                            <h2>{licaoReference.titulo}</h2>
                                        ) : (
                                            <h2>
                                                Preencha os dados da nova lição
                                            </h2>
                                        )}
                                    </div>
                                    <div className="novo-trimestre__header--infos">
                                        {isSuperAdmin.current && (
                                            <p>
                                                <FontAwesomeIcon
                                                    icon={faChurch}
                                                />
                                                <strong>Igreja:</strong>{" "}
                                                {classe?.igrejaNome}
                                            </p>
                                        )}
                                        <p>
                                            <FontAwesomeIcon
                                                icon={faUsersRectangle}
                                            />
                                            <strong>Classe:</strong>{" "}
                                            {classe?.nome}
                                        </p>
                                        {(classe?.idade_minima ||
                                            classe?.idade_maxima) && (
                                            <p>
                                                <FontAwesomeIcon
                                                    icon={faRulerVertical}
                                                />
                                                <strong>Faixa Etária:</strong>{" "}
                                                {typeof classe?.idade_minima ===
                                                "number"
                                                    ? classe?.idade_minima
                                                    : "N/A"}{" "}
                                                -{" "}
                                                {typeof classe?.idade_maxima ===
                                                "number"
                                                    ? classe?.idade_maxima
                                                    : "N/A"}{" "}
                                                anos
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div
                                    className="novo-trimestre__header--close"
                                    onClick={() => onClose()}
                                >
                                    <FontAwesomeIcon icon={faXmark} />
                                </div>

                                {licaoReference ? (
                                    <div className="novo-trimestre__header--aviso">
                                        <FontAwesomeIcon icon={faSquarePen} />
                                        <span>
                                            Atenção: você está editando a lição
                                        </span>
                                    </div>
                                ) : (
                                    licao && (
                                        <div className="novo-trimestre__header--aviso">
                                            <FontAwesomeIcon
                                                icon={faTriangleExclamation}
                                            />
                                            <span>
                                                Já existe uma lição ativa para
                                                esta classe.
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                            <div className="novo-trimestre__body">
                                <FormProvider {...methods}>
                                    <form
                                        onSubmit={handleSubmit(onSubmit)}
                                        className="novo-trimestre__form"
                                    >
                                        {/* Imagem */}
                                        <div className="novo-trimestre__input novo-trimestre__input--file">
                                            <label htmlFor="imagem_capa">
                                                <FontAwesomeIcon
                                                    icon={faImage}
                                                />
                                                <span>
                                                    {imagem && imagem.length > 0
                                                        ? imagem[0].name
                                                        : licaoReference?.img
                                                          ? "Alterar capa revista"
                                                          : "Adicionar capa da revista"}
                                                </span>
                                            </label>
                                            <input
                                                type="file"
                                                id="imagem_capa"
                                                accept="image/*"
                                                {...register("img")}
                                            />
                                        </div>

                                        {/* Título e Trimestre */}
                                        <div className="novo-trimestre__input-group">
                                            <div className="novo-trimestre__input">
                                                <label htmlFor="titulo">
                                                    Titulo da lição <i>*</i>
                                                </label>
                                                <input
                                                    type="text"
                                                    id="titulo"
                                                    className={
                                                        errors.titulo
                                                            ? "input-error"
                                                            : ""
                                                    }
                                                    {...register("titulo", {
                                                        required:
                                                            "O título da lição é obrigatório",
                                                    })}
                                                />
                                                {
                                                    <ErroComponent
                                                        field={errors.titulo}
                                                    />
                                                }
                                            </div>

                                            <div className="novo-trimestre__input">
                                                <label htmlFor="novo-trimestre-trimestre">
                                                    Nº do Trimestre <i>*</i>
                                                </label>
                                                <input
                                                    type="number"
                                                    step={1}
                                                    id="novo-trimestre-trimestre"
                                                    className={
                                                        errors.trimestre
                                                            ? "input-error"
                                                            : ""
                                                    }
                                                    {...register("trimestre", {
                                                        required:
                                                            "O Nº do trimestre é obrigatório.",
                                                        min: {
                                                            value: 1,
                                                            message:
                                                                "Número do trimestre está inválido",
                                                        },
                                                        max: {
                                                            value: 4,
                                                            message:
                                                                "Número do trimestre está inválido",
                                                        },
                                                        valueAsNumber: true,
                                                    })}
                                                />
                                                {
                                                    <ErroComponent
                                                        field={errors.trimestre}
                                                    />
                                                }
                                            </div>
                                        </div>

                                        {/* Data Início e Quantidade de Aulas */}
                                        <div className="novo-trimestre__input-group">
                                            <div className="novo-trimestre__input">
                                                <label htmlFor="data_inicio">
                                                    Data de Início <i>*</i>
                                                </label>
                                                <input
                                                    type="date"
                                                    id="data_inicio"
                                                    className={
                                                        errors.data_inicio
                                                            ? "input-error"
                                                            : ""
                                                    }
                                                    {...register(
                                                        "data_inicio",
                                                        {
                                                            required:
                                                                "A data de início é obrigatória.",
                                                            validate: (
                                                                value,
                                                            ) => {
                                                                if (!value)
                                                                    return true;
                                                                const dia =
                                                                    new Date(
                                                                        value,
                                                                    ).getUTCDay();
                                                                return (
                                                                    dia === 0 ||
                                                                    "A data de início precisa ser um domingo!"
                                                                );
                                                            },
                                                        },
                                                    )}
                                                />
                                                {
                                                    <ErroComponent
                                                        field={
                                                            errors.data_inicio
                                                        }
                                                    />
                                                }
                                            </div>
                                            <div className="novo-trimestre__input">
                                                <label htmlFor="numero_aulas">
                                                    Quantidade de Aulas <i>*</i>
                                                </label>
                                                <input
                                                    type="number"
                                                    id="numero_aulas"
                                                    className={
                                                        errors.numero_aulas
                                                            ? "input-error"
                                                            : ""
                                                    }
                                                    {...register(
                                                        "numero_aulas",
                                                        {
                                                            required:
                                                                "A quantidade de aulas é obrigatória",
                                                            valueAsNumber: true,
                                                            min: {
                                                                value: 1,
                                                                message:
                                                                    "O valor mínimo é 1",
                                                            },
                                                        },
                                                    )}
                                                />
                                                {
                                                    <ErroComponent
                                                        field={
                                                            errors.numero_aulas
                                                        }
                                                    />
                                                }
                                            </div>
                                        </div>

                                        <ListaDeAulas
                                            control={control}
                                            nameAulas="numero_aulas"
                                            nameData="data_inicio"
                                        />
                                        <div className="matriculas">
                                            <div className="matriculas-alunos__search">
                                                <SearchInput
                                                    texto="aluno (nome, idade)"
                                                    onSearch={(v) =>
                                                        setPesquisa(v)
                                                    }
                                                />
                                            </div>
                                            <div className="matriculas-disponiveis">
                                                <h3>Alunos não matriculados</h3>
                                                <button
                                                    type="button"
                                                    className="matriculas-cadastrar"
                                                    onClick={() =>
                                                        setShowCadastroAluno(
                                                            true,
                                                        )
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faUserPlus}
                                                    />
                                                    Cadastrar novo aluno
                                                </button>
                                                <AlunosDisponiveis
                                                    append={append}
                                                    listaAlunos={
                                                        listaAlunosMemo
                                                    }
                                                />
                                            </div>

                                            <div className="matriculas-matriculados">
                                                <h3>
                                                    Alunos Matriculados: (
                                                    {fields.length})
                                                </h3>
                                                <button
                                                    type="button"
                                                    onClick={importarAlunos}
                                                    className="matriculas-importar"
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faUsersRectangle}
                                                    />
                                                    Importar do trimestre
                                                    anterior?
                                                </button>
                                                <AlunosMatriculados
                                                    alunosForaDaFaixa={
                                                        alunosForaDaIdadeMemo
                                                    }
                                                    fieldIndex={fieldIndex}
                                                    listaAlunosSelecionados={
                                                        listaAlunosSelecionadosMemo
                                                    }
                                                    register={register}
                                                    remove={remove}
                                                />
                                            </div>
                                        </div>

                                        <div
                                            className={`novo-trimestre__actions ${
                                                licaoReference &&
                                                !isSecretario.current
                                                    ? "novo-trimestre__actions--edit"
                                                    : ""
                                            }`}
                                        >
                                            {licaoReference &&
                                                !isSecretario.current && (
                                                    <button
                                                        type="button"
                                                        className="button-delete"
                                                        onClick={deletarRevista}
                                                    >
                                                        Deletar
                                                    </button>
                                                )}
                                            <div className="novo-trimestre__actions-btn">
                                                <button
                                                    type="button"
                                                    className="button-secondary"
                                                    onClick={() => onClose()}
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="button-primary"
                                                >
                                                    {licaoReference
                                                        ? "Salvar"
                                                        : "Criar Trimestre"}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </FormProvider>
                            </div>
                        </>
                    )}
                </motion.div>
            </div>
            <AnimatePresence>
                <AlertModal
                    key={"mensagem-alert-modal-novo-trimestre"}
                    isOpen={!!mensagem}
                    {...mensagem!}
                />

                {showCadastroAluno && (
                    <CadastroAlunoModal
                        key={"adicionar-aluno"}
                        igrejaId={igrejaId}
                        onCancel={() => setShowCadastroAluno(false)}
                        onSave={(v) => {
                            setAlunosMap(
                                (a) =>
                                    new Map([
                                        ...Array.from(a.values()).map((v) => [
                                            v.id,
                                            v,
                                        ]),
                                        [
                                            v.id,
                                            {
                                                nome: v.nome_completo,
                                                idade: getIdade(
                                                    v.data_nascimento,
                                                ),
                                                ...v,
                                            },
                                        ],
                                    ] as any),
                            );
                            setValue("alunosSelecionados", [
                                ...fields,
                                {
                                    alunoId: v.id,
                                    possui_revista: true,
                                    idade: getIdade(v.data_nascimento),
                                    nome: v.nome_completo,
                                },
                            ]);
                            setShowCadastroAluno(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default NovoTrimestreModal;
