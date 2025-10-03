import { AnimatePresence, motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faChurch,
    faFilePen,
    faImage,
    faRulerVertical,
    faSquarePen,
    faTrash,
    faTriangleExclamation,
    faUserPlus,
    faUsersRectangle,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
    collection,
    documentId,
    getDocs,
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
    type FieldError,
} from "react-hook-form";
import AlertModal from "./AlertModal";
import SearchInput from "./SearchInput";
import CadastroAlunoModal from "./CadastroAlunoModal";
import type { MatriculasInterface } from "../../interfaces/MatriculasInterface";
import LoadingModal from "../layout/loading/LoadingModal";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { AlunoInterface } from "../../interfaces/AlunoInterface";
import { getIdade } from "../../utils/getIdade";
import { useAuthContext } from "../../context/AuthContext";

interface AlunoSelecionado {
    alunoId: string;
    possui_revista: boolean;
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

async function reduzirImagem(
    file: File,
    maxWidth: number,
    maxHeight: number
): Promise<File> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(
                        maxWidth / width,
                        maxHeight / height
                    );
                    width = width * ratio;
                    height = height * ratio;
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (!blob) return reject("Sem imagem");
                        const novoArquivo = new File([blob], file.name, {
                            type: "image/jpeg",
                        });
                        resolve(novoArquivo);
                    },
                    "image/jpeg",
                    0.7
                );
            };
            img.src = event.target?.result as string;
        };

        reader.readAsDataURL(file);
    });
}

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
    const [alunos, setAlunos] = useState<
        (AlunoInterface & { nome: string; idade: number })[]
    >([]);
    const [pesquisa, setPesquisa] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [showCadastroAluno, setShowCadastroAluno] = useState<boolean>(false);
    const [dataAulas, setDataAulas] = useState<string[][]>([]);
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
    const licaoRef = useRef<LicaoInterface>(licao);
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
        watch,
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

    const { isSuperAdmin, user } = useAuthContext();

    const imagem = watch("img");
    const dataInicio = watch("data_inicio");
    const numeroAulas = watch("numero_aulas");

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
                        800
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
            window.location.reload();
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
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (dados: NovaLicaoForm) => {
        dadosFinaisRef.current = dados;

        if (licaoRef.current) {
            const dataUsuario = normalizeDate(dados.data_inicio + "T00:00:00");
            const dataInicio = normalizeDate(
                licaoRef.current.data_inicio.toDate()
            );
            const dataFim = normalizeDate(licaoRef.current.data_fim.toDate());

            if (dataUsuario >= dataInicio && dataUsuario < dataFim) {
                return setMensagem({
                    title: "Datas conflitantes",
                    message: (
                        <span>
                            A lição <strong>{licao!.titulo}</strong> está com
                            data de finalização prevista para o dia:{" "}
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
    const ErroComponent = (field: FieldError | undefined) => {
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

    const alunosMap = useMemo(
        () => new Map(alunos.map((v) => [v.id, v])),
        [alunos]
    );

    const listaAlunosMemo = useMemo(() => {
        const as = fields.map((v) => v.alunoId);
        const lista = alunos.filter(
            (v) => !as.includes(v.id) && v.nome.toLowerCase().includes(pesquisa)
        );

        return lista;
    }, [alunosMap, pesquisa, fields]);

    const alunosForaDaIdadeMemo = useMemo(() => {
        const alunosForaMap = new Map();

        if (classe?.idade_minima || classe?.idade_maxima) {
            fields.forEach((v) => {
                const aluno = alunosMap.get(v.alunoId);
                if (aluno && aluno.idade < classe.idade_minima)
                    alunosForaMap.set(v.alunoId, "abaixo");
                if (aluno && aluno.idade > classe.idade_maxima)
                    alunosForaMap.set(v.alunoId, "acima");
            });
        }

        return alunosForaMap;
    }, [fields, alunos]);

    const listaAlunosSelecionadosMemo = useMemo(() => {
        return fields
            .filter((v) =>
                alunosMap.get(v.alunoId)?.nome.toLowerCase().includes(pesquisa)
            )
            .sort(
                (a, b) =>
                    alunosMap.get(a.alunoId)!.idade -
                    alunosMap.get(b.alunoId)!.idade
            );
    }, [alunosMap, pesquisa, fields]);

    const fieldIndex = (field: any) =>
        fields.findIndex((f) => f.id === field.id);

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
                        <strong>{classe?.idade_minima} anos</strong> e idade
                        máxima de <strong>{classe?.idade_maxima} anos</strong>.
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
        if (dataInicio && numeroAulas > 0) {
            const data = new Date(dataInicio + "T00:00:00");

            if (data.getUTCDay() !== 0) return setDataAulas([]);

            const listaDatas: string[][] = Array.from({
                length: numeroAulas,
            }).map((_, i) => {
                const dataAula = new Date(data);
                dataAula.setUTCDate(dataAula.getUTCDate() + i * 7);
                return [
                    "Aula " + (i + 1),
                    dataAula.toLocaleDateString("pt-BR"),
                ];
            });

            setDataAulas(listaDatas);
        }
    }, [dataInicio, numeroAulas]);
    useEffect(() => {
        licaoRef.current = licao;
        const getTrimestreAnterior = async (licaoId: string) => {
            const matriculasCollection = collection(db, "matriculas");
            const q = query(
                matriculasCollection,
                where("licaoId", "==", licaoId),
                !isSuperAdmin.current
                    ? where("igrejaId", "==", user!.igrejaId)
                    : where("ministerioId", "==", user!.ministerioId)
            );
            const matriculasSnap = await getDocs(q);

            if (matriculasSnap.empty) return [];

            return matriculasSnap.docs.map((v) => ({
                id: v.id,
                ...v.data(),
            })) as MatriculasInterface[];
        };

        if (licaoReference) {
            getTrimestreAnterior(licaoReference.id)
                .then((a) => {
                    const result = a?.map((v) => ({
                        alunoId: v.alunoId,
                        possui_revista: v.possui_revista,
                    }));
                    trimestreAnterior.current = result;
                    reset({
                        alunosSelecionados: result,
                        data_inicio: licaoReference.data_inicio
                            .toDate()
                            .toISOString()
                            .split("T")[0],
                        numero_aulas: licaoReference.numero_aulas,
                        trimestre: licaoReference?.numero_trimestre || 1,
                        titulo: licaoReference.titulo,
                        img: undefined,
                        isInativa: licaoReference.ativo,
                    });
                })
                .catch((err) => console.log("deu esse erro", err));
        } else if (licao)
            getTrimestreAnterior(licao.id)
                .then(
                    (a) =>
                        (trimestreAnterior.current = a.map((v) => ({
                            alunoId: v.alunoId,
                            possui_revista: v.possui_revista,
                        })))
                )
                .catch((err) => console.log("deu esse erro", err));
    }, [licao]);
    useEffect(() => {
        const getClasse = async () => {
            const collClasse = collection(db, "classes");
            const q = query(
                collClasse,
                where(documentId(), "==", classeId),
                isSuperAdmin.current
                    ? where("ministerioId", "==", user!.ministerioId)
                    : where("igrejaId", "==", user!.igrejaId)
            );
            const classeSnap = await getDocs(q);

            if (classeSnap.empty) throw new Error("classe não encontrada");

            const classe = {
                ...classeSnap.docs[0].data(),
                id: classeSnap.docs[0].id,
            } as ClasseInterface;

            return classe;
        };
        const getLicao = async () => {
            if (!licaoReference) {
                const licoesCollection = collection(db, "licoes");
                const q = query(
                    licoesCollection,
                    where("classeId", "==", classeId),
                    where("ativo", "==", true),
                    isSuperAdmin.current
                        ? where("ministerioId", "==", user!.ministerioId)
                        : where("igrejaId", "==", user!.igrejaId)
                );
                const licoesSnap = await getDocs(q);

                if (licoesSnap.empty) return null;

                const licoes = {
                    ...licoesSnap.docs[0].data(),
                    id: licoesSnap.docs[0].id,
                } as LicaoInterface;
                setValue(
                    "trimestre",
                    (licoes?.numero_trimestre || 0) + 1 === 5
                        ? 1
                        : (licoes?.numero_trimestre || 0) + 1
                );

                return licoes;
            } else {
                setValue("isInativa", !licaoReference!.ativo);
                return null;
            }
        };
        const getAlunos = async () => {
            const alunosCollection = collection(db, "alunos");
            const q = query(
                alunosCollection,
                where("igrejaId", "==", igrejaId)
            );
            const alunosSnap = await getDocs(q);

            if (alunosSnap.empty) return [];

            const alunos = alunosSnap.docs
                .map(
                    (v) =>
                        ({
                            id: v.id,
                            nome: v.data().nome_completo,
                            idade: getIdade(v.data().data_nascimento),
                            ...v.data(),
                        } as AlunoInterface & { nome: string; idade: number })
                )
                .sort((a, b) => a.idade - b.idade);

            return alunos;
        };
        Promise.all([getClasse(), getLicao(), getAlunos()])
            .then(([c, l, a]) => {
                setClasse(c);
                setLicao(l);
                setAlunos(a);
            })
            .catch((err) => {
                console.log("deu esse erro", err);
                navigate("/aulas");
            })
            .finally(() => setIsLoading(false));
    }, []);

    return (
        <>
            <motion.div
                className="novo-trimestre"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
            >
                {isLoading ? (
                    <img
                        className="novo-trimestre__loading"
                        src="/loading.gif"
                        alt="Carregando..."
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
                                        <h2>Preencha os dados da nova lição</h2>
                                    )}
                                </div>
                                <div className="novo-trimestre__header--infos">
                                    {isSuperAdmin.current && (
                                        <p>
                                            <FontAwesomeIcon icon={faChurch} />
                                            <strong>Igreja:</strong>{" "}
                                            {classe?.igrejaNome}
                                        </p>
                                    )}
                                    <p>
                                        <FontAwesomeIcon
                                            icon={faUsersRectangle}
                                        />
                                        <strong>Classe:</strong> {classe?.nome}
                                    </p>
                                    {classe?.idade_minima && (
                                        <p>
                                            <FontAwesomeIcon
                                                icon={faRulerVertical}
                                            />
                                            <strong>Faixa Etária:</strong>{" "}
                                            {classe?.idade_minima || "N/A"} -{" "}
                                            {classe?.idade_maxima || "N/A"} anos
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
                                            Já existe uma lição ativa para esta
                                            classe.
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
                                    <div className="novo-trimestre__input novo-trimestre__input--file">
                                        <label htmlFor="imagem_capa">
                                            <FontAwesomeIcon icon={faImage} />
                                            <span>
                                                {imagem && imagem.length > 0
                                                    ? imagem[0].name
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
                                    <div className="novo-trimestre__input-group">
                                        <div className="novo-trimestre__input">
                                            <label htmlFor="titulo">
                                                Titulo da lição
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
                                            {ErroComponent(errors.titulo)}
                                        </div>

                                        <div className="novo-trimestre__input">
                                            <label htmlFor="novo-trimestre-trimestre">
                                                Nº do Trimestre
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
                                            {ErroComponent(errors.trimestre)}
                                        </div>
                                    </div>

                                    <div className="novo-trimestre__input-group">
                                        <div className="novo-trimestre__input">
                                            <label htmlFor="data_inicio">
                                                Data de Início
                                            </label>
                                            <input
                                                type="date"
                                                id="data_inicio"
                                                className={
                                                    errors.data_inicio
                                                        ? "input-error"
                                                        : ""
                                                }
                                                {...register("data_inicio", {
                                                    required:
                                                        "A data de início é obrigatória.",
                                                    validate: (value) => {
                                                        if (!value) return true;
                                                        const dia = new Date(
                                                            value
                                                        ).getUTCDay();
                                                        return (
                                                            dia === 0 ||
                                                            "A data de início precisa ser um domingo!"
                                                        );
                                                    },
                                                })}
                                            />
                                            {ErroComponent(errors.data_inicio)}
                                        </div>
                                        <div className="novo-trimestre__input">
                                            <label htmlFor="numero_aulas">
                                                Quantidade de Aulas
                                            </label>
                                            <input
                                                type="number"
                                                id="numero_aulas"
                                                className={
                                                    errors.numero_aulas
                                                        ? "input-error"
                                                        : ""
                                                }
                                                {...register("numero_aulas", {
                                                    required:
                                                        "A quantidade de aulas é obrigatória",
                                                    valueAsNumber: true,
                                                    min: {
                                                        value: 1,
                                                        message:
                                                            "O valor mínimo é 1",
                                                    },
                                                })}
                                            />
                                            {ErroComponent(errors.numero_aulas)}
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {dataAulas.length && (
                                            <motion.div
                                                initial={{
                                                    opacity: 0,
                                                    scale: 0,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    scale: 1,
                                                }}
                                                exit={{ opacity: 0, scale: 0 }}
                                                onTap={() =>
                                                    setIsOpen((v) => !v)
                                                }
                                                className={`novo-trimestre__previsao-aulas ${
                                                    isOpen ? "is-open" : ""
                                                }`}
                                                key={"previsao-aulas"}
                                            >
                                                <h3>
                                                    Lista de aulas{" "}
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={faChevronDown}
                                                        />
                                                    </span>
                                                </h3>
                                                <AnimatePresence>
                                                    {isOpen && (
                                                        <motion.ul
                                                            key={
                                                                "previsao-aulas-container"
                                                            }
                                                            initial={{
                                                                y: -10,
                                                                height: 0,
                                                            }}
                                                            animate={{
                                                                y: 0,
                                                                height: "auto",
                                                            }}
                                                            exit={{
                                                                y: -10,
                                                                height: 0,
                                                            }}
                                                            className="novo-trimestre__previsao-aulas--lista"
                                                        >
                                                            {dataAulas.map(
                                                                ([
                                                                    aula,
                                                                    data,
                                                                ]) => (
                                                                    <motion.li
                                                                        key={
                                                                            aula +
                                                                            data
                                                                        }
                                                                    >
                                                                        <p>
                                                                            {
                                                                                aula
                                                                            }
                                                                        </p>
                                                                        <data
                                                                            value={
                                                                                data
                                                                            }
                                                                        >
                                                                            {
                                                                                data
                                                                            }
                                                                        </data>
                                                                    </motion.li>
                                                                )
                                                            )}
                                                        </motion.ul>
                                                    )}
                                                </AnimatePresence>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="matriculas">
                                        <div className="matriculas-alunos__search">
                                            <SearchInput
                                                onSearch={(v) => setPesquisa(v)}
                                            />
                                        </div>
                                        <div className="matriculas-disponiveis">
                                            <h3>Alunos não matriculados</h3>
                                            <button
                                                type="button"
                                                className="matriculas-cadastrar"
                                                onClick={() =>
                                                    setShowCadastroAluno(true)
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faUserPlus}
                                                />
                                                Cadastrar novo aluno
                                            </button>
                                            <motion.ul
                                                layout
                                                className="matriculas--lista"
                                            >
                                                <AnimatePresence>
                                                    {listaAlunosMemo.map(
                                                        (v) => (
                                                            <motion.li
                                                                className="matriculas--item"
                                                                key={v.id}
                                                                onTap={() => {
                                                                    append({
                                                                        alunoId:
                                                                            v.id,
                                                                        possui_revista:
                                                                            true,
                                                                    });
                                                                }}
                                                            >
                                                                <motion.p
                                                                    layoutId={
                                                                        v.id
                                                                    }
                                                                >
                                                                    {v.nome}{" "}
                                                                    <span className="matriculas--lista-idade">
                                                                        {alunosMap.has(
                                                                            v.id
                                                                        ) && (
                                                                            <>
                                                                                (
                                                                                {
                                                                                    alunosMap.get(
                                                                                        v.id
                                                                                    )
                                                                                        ?.idade
                                                                                }{" "}
                                                                                anos)
                                                                            </>
                                                                        )}
                                                                    </span>
                                                                </motion.p>
                                                            </motion.li>
                                                        )
                                                    )}
                                                </AnimatePresence>
                                            </motion.ul>
                                        </div>

                                        <div className="matriculas-matriculados">
                                            <h3>
                                                Alunos Matriculados: (
                                                {fields.length})
                                            </h3>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const ids = fields.map(
                                                        (v) => v.alunoId
                                                    );
                                                    const filtro =
                                                        trimestreAnterior.current.filter(
                                                            (v) =>
                                                                !ids.includes(
                                                                    v.alunoId
                                                                )
                                                        );

                                                    setValue(
                                                        "alunosSelecionados",
                                                        [...fields, ...filtro]
                                                    );
                                                }}
                                                className="matriculas-importar"
                                            >
                                                <FontAwesomeIcon
                                                    icon={faUsersRectangle}
                                                />
                                                Importar do trimestre anterior?
                                            </button>
                                            <motion.ul
                                                layout
                                                className="matriculas--lista"
                                            >
                                                <AnimatePresence>
                                                    {listaAlunosSelecionadosMemo.map(
                                                        (v, i) => (
                                                            <motion.li
                                                                key={v.id}
                                                                layout
                                                                layoutId={
                                                                    v.alunoId
                                                                }
                                                                className={
                                                                    alunosForaDaIdadeMemo.has(
                                                                        v.alunoId
                                                                    )
                                                                        ? "matriculas--fora-da-faixa"
                                                                        : ""
                                                                }
                                                            >
                                                                <motion.div
                                                                    className="matriculas-item__nome"
                                                                    onTap={() =>
                                                                        remove(
                                                                            fieldIndex(
                                                                                v
                                                                            )
                                                                        )
                                                                    }
                                                                >
                                                                    <span>
                                                                        {
                                                                            alunosMap.get(
                                                                                v.alunoId
                                                                            )
                                                                                ?.nome
                                                                        }
                                                                    </span>{" "}
                                                                    <span className="matriculas--lista-idade">
                                                                        (
                                                                        {
                                                                            alunosMap.get(
                                                                                v.alunoId
                                                                            )
                                                                                ?.idade
                                                                        }{" "}
                                                                        anos)
                                                                    </span>
                                                                </motion.div>

                                                                <div className="matriculas-item__licao">
                                                                    <label
                                                                        htmlFor={
                                                                            "matriculados-revista" +
                                                                            i
                                                                        }
                                                                    >
                                                                        Revista?
                                                                    </label>
                                                                    <input
                                                                        type="checkbox"
                                                                        id={
                                                                            "matriculados-revista" +
                                                                            i
                                                                        }
                                                                        {...register(
                                                                            `alunosSelecionados.${fieldIndex(
                                                                                v
                                                                            )}.possui_revista`
                                                                        )}
                                                                    />
                                                                </div>
                                                            </motion.li>
                                                        )
                                                    )}
                                                </AnimatePresence>
                                            </motion.ul>
                                        </div>
                                    </div>

                                    <div
                                        className={`novo-trimestre__actions ${
                                            licaoReference &&
                                            "novo-trimestre__actions--edit"
                                        }`}
                                    >
                                        {licaoReference && (
                                            <button
                                                type="button"
                                                className="button-delete"
                                                onClick={() => {
                                                    setMensagem({
                                                        title: "Deletar lição",
                                                        message: (
                                                            <>
                                                                <span>
                                                                    Tem certeza
                                                                    que deseja
                                                                    deletar a
                                                                    lição:{" "}
                                                                    <strong>
                                                                        {
                                                                            licaoReference?.titulo
                                                                        }
                                                                    </strong>
                                                                    ?
                                                                </span>
                                                                <span>
                                                                    Isso irá
                                                                    apagar{" "}
                                                                    <strong>
                                                                        TODOS
                                                                    </strong>{" "}
                                                                    os dados
                                                                    associados a
                                                                    ela.
                                                                </span>
                                                            </>
                                                        ),
                                                        onClose: () => {
                                                            setMensagem(null);
                                                            onClose();
                                                        },
                                                        onConfirm: () =>
                                                            apagarLicao(
                                                                licaoReference!
                                                                    .id
                                                            ),
                                                        onCancel: () => {
                                                            setMensagem(null);
                                                            onClose();
                                                        },
                                                        cancelText: "Cancelar",
                                                        confirmText:
                                                            "Sim, deletar lição",
                                                        icon: (
                                                            <FontAwesomeIcon
                                                                icon={faTrash}
                                                            />
                                                        ),
                                                    });
                                                }}
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

                <div
                    className="novo-trimestre-close"
                    onClick={() => (!isEnviando ? onClose() : null)}
                ></div>
            </motion.div>
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
                            setAlunos((a) => [
                                ...a,
                                {
                                    nome: v.nome_completo,
                                    idade: getIdade(v.data_nascimento),
                                    ...v,
                                },
                            ]);
                            setValue("alunosSelecionados", [
                                ...fields,
                                { alunoId: v.id, possui_revista: true },
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
