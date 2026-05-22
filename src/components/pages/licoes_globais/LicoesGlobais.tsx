import {
    faBoxesStacked,
    faCalendarDay,
    faCaretLeft,
    faCaretRight,
    faCircleExclamation,
    faFilePdf,
    faImage,
    faMagnifyingGlass,
    faPenToSquare,
    faThumbsUp,
    faTrash,
    faTriangleExclamation,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import SearchInput from "../../ui/SearchInput";
import "@/components/pages/aulas/licoes-grid.scss";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { useAuthContext } from "../../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import "./licoes-globais.scss";
import NovoTrimestreTemplate, {
    ListaDeAulas,
} from "../../ui/NovoTrimestreTemplate";
import type { LicaoGlobalInterface } from "../../../interfaces/LicaoInterface";
import {
    Controller,
    FormProvider,
    useForm,
    useFormContext,
    useWatch,
    type Control,
    type FieldError,
    type UseFormRegister,
} from "react-hook-form";
import AlertModal from "../../ui/AlertModal";
import Dropdown from "../../ui/Dropdown";
import { useDataContext } from "../../../context/DataContext";
import LicaoCard from "../../ui/LicaoCard";
import Loading from "../../layout/loading/Loading";
import { reduzirImagem } from "../../../utils/reduzirImagem";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";
import "@/components/ui/licao-modal.scss";

interface FormNovoTrimestreGlobal {
    img?: any;
    pdf?: any;
    rotuloId: string;
    data_inicio: string;
    numero_aulas: number;
    numero_trimestre: number;
    titulo: string;
    igrejas: string[];
}
const functions = getFunctions();
const cadastrarNovaLicaoGlobal = httpsCallable(
    functions,
    "cadastrarNovaLicaoGlobal",
);
const apagarLicaoGlobal = httpsCallable(functions, "apagarLicaoGlobal");

const DragContainer = ({ children }: { children: ReactNode }) => {
    const [left, setLeft] = useState(-100);
    const $dragContainerRef = useRef<HTMLDivElement>(null);
    const $dragRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!$dragContainerRef.current || !$dragRef.current) return;
        const diff =
            $dragContainerRef.current.scrollWidth -
            $dragRef.current.clientWidth;

        setLeft(diff * -1);
    }, []);
    return (
        <div ref={$dragContainerRef} className="licoes-globais__rotulos">
            <motion.div
                className="licoes-globais__rotulos-container"
                drag="x"
                dragConstraints={{
                    left,
                    right: 0,
                }}
                whileDrag={{ cursor: "grabbing" }}
                whileHover={{ cursor: "grab" }}
                ref={$dragRef}
                dragElastic={0.5}
            >
                {children}
            </motion.div>
        </div>
    );
};
const ErroComponent = ({ field }: { field?: FieldError }) => {
    return (
        <AnimatePresence>
            {field && (
                <motion.div
                    key={field.message}
                    className="novo-trimestre__input--erro"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    {field.message}
                </motion.div>
            )}
        </AnimatePresence>
    );
};
const IgrejasDestinoQtd = React.memo(
    ({
        control,
        totalIgrejas,
    }: {
        control: Control<any>;
        totalIgrejas: number;
    }) => {
        const igrejasForm = useWatch({ control, name: "igrejas" });
        return (
            <h3>
                Igrejas de destino ({igrejasForm?.length} / {totalIgrejas})
            </h3>
        );
    },
);
const IgrejasDestino = ({
    control,
    igrejas,
    register,
}: {
    igrejas: IgrejaInterface[];
    control: Control<any>;
    register: UseFormRegister<any>;
}) => {
    const [pesquisa, setPesquisa] = useState("");

    const igrejasMemo = useMemo(() => {
        if (pesquisa)
            return igrejas.filter((v) =>
                v.nome.toLowerCase().includes(pesquisa),
            );

        return igrejas;
    }, [igrejas, pesquisa]);
    return (
        <div className="matriculas">
            <div className="matriculas-alunos__search">
                <SearchInput texto="igreja" onSearch={(v) => setPesquisa(v)} />
            </div>

            <div className="matriculas-disponiveis">
                <IgrejasDestinoQtd
                    control={control}
                    totalIgrejas={igrejas?.length}
                />
                <ul className="novo-trimestre-global__lista">
                    {igrejasMemo.map((v) => (
                        <li key={v.id}>
                            <div className="novo-trimestre-global__check">
                                <input
                                    type="checkbox"
                                    id={"igreja-enviar" + v.id}
                                    value={v.id}
                                    {...register(`igrejas`)}
                                />
                                <label htmlFor={"igreja-enviar" + v.id}>
                                    {v.nome}
                                </label>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};
const Rotulos = ({
    rotulos,
    rotuloDefault,
    igrejas,
    isEdit,
    user,
    onLoadingEnd,
}: {
    isEdit: boolean;
    rotulos: RotulosClassesInterface[];
    rotuloDefault: RotulosClassesInterface;
    igrejas: IgrejaInterface[];
    user: any;
    onLoadingEnd: () => void;
}) => {
    const {
        formState: { errors },
        control,
        reset,
    } = useFormContext();
    const rotulo = useWatch({ control, name: "rotuloId" });

    useEffect(() => {
        if (!igrejas.length || isEdit) return;

        const getUltimaLicao = async () => {
            const lGlobalCll = collection(db, "licoes_globais");
            const q = query(
                lGlobalCll,
                where("ministerioId", "==", user!.ministerioId),
                where("rotuloId", "==", rotulo || rotuloDefault.id),
                where("ativo", "==", true),
                limit(1),
            );
            const lGlobalDocs = await getDocs(q);

            if (lGlobalDocs.empty) {
                const hoje = new Date();
                const trimestre = Math.floor(hoje.getMonth() / 3) + 1;
                const inicioTrimestre = new Date(
                    hoje.getFullYear(),
                    (trimestre - 1) * 3,
                    1,
                );
                const diaSemana = inicioTrimestre.getDay();
                const domingo = (7 - diaSemana) % 7;
                inicioTrimestre.setDate(inicioTrimestre.getDate() + domingo);

                reset({
                    numero_trimestre: trimestre,
                    numero_aulas: 13,
                    data_inicio: inicioTrimestre.toISOString().split("T")[0],
                    igrejas: igrejas.map((v) => v.id),
                    rotuloId: rotulo || rotuloDefault.id,
                });
                return;
            }

            const lGlobal = {
                ...lGlobalDocs.docs[0].data(),
                id: lGlobalDocs.docs[0].id,
            } as LicaoGlobalInterface;

            const dataInicio = lGlobal.data_fim.toDate();
            dataInicio.setDate(dataInicio.getDate() + 7);

            reset({
                data_inicio: dataInicio.toISOString().split("T")[0],
                numero_trimestre:
                    lGlobal.numero_trimestre + 1 > 4
                        ? 1
                        : lGlobal.numero_trimestre + 1,
                igrejas: igrejas.map((v) => v.id),
                numero_aulas: 13,
                rotuloId: rotulo || rotuloDefault.id,
            });
        };

        getUltimaLicao()
            .then(() => {
                onLoadingEnd();
            })
            .catch((err) => console.log("erro ao buscar última lição", err));
    }, [igrejas, rotulo]);
    return (
        <div className="novo-trimestre__input">
            <p className="novo-trimestre__input--label">
                Rótulo <i>*</i>
            </p>
            <Controller
                control={control}
                name="rotuloId"
                defaultValue={rotuloDefault.id}
                rules={{ required: "O rótulo é obrigatório" }}
                render={({ field }) => (
                    <Dropdown
                        current={
                            rotulos.find((v) => v.id === field.value)?.nome ||
                            ""
                        }
                        lista={!isEdit ? rotulos : [rotuloDefault]}
                        isErro={!!errors.rotuloId?.message}
                        isAll={false}
                        selectId={field.value}
                        onSelect={(v) => field.onChange(v?.id)}
                    />
                )}
            />

            <ErroComponent field={(errors as any).rotuloId} />
        </div>
    );
};

const LicaoGlobalModal = ({
    licao,
    onEditLicao,
}: {
    licao: LicaoGlobalInterface;
    onEditLicao: (licaoId: string) => void;
}) => {
    const [aulasDoTrimestre, setAulasDoTrimestre] = useState<any[]>([]);
    const navigate = useNavigate();
    useEffect(() => {
        const dataInicio = licao.data_inicio.toDate();

        const listaAulas = Array.from({ length: licao.numero_aulas }).map(
            (_, i) => {
                const numeroAula = i + 1;
                const dataAula = new Date(dataInicio);
                dataAula.setDate(dataAula.getDate() + i * 7);

                return {
                    numero: numeroAula,
                    data: dataAula,
                };
            },
        );
        setAulasDoTrimestre(listaAulas as any);
    }, []);
    return (
        <motion.div
            className="licao-modal__overlay"
            onClick={() => window.history.back()}
        >
            <motion.div
                className="licao-modal licoes-globais-modal"
                layoutId={licao.id}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`licao-modal__header`}>
                    <div className="licao-modal__header-config">
                        {!!licao.pdf && (
                            <motion.div
                                className="licao-modal__header--config"
                                onTap={() =>
                                    navigate("/ler-pdf", { state: licao.pdf })
                                }
                            >
                                <FontAwesomeIcon icon={faFilePdf} />
                            </motion.div>
                        )}
                        <motion.div
                            className="licao-modal__header--config"
                            onClick={() => onEditLicao(licao.id)}
                        >
                            <FontAwesomeIcon icon={faPenToSquare} />
                        </motion.div>
                        <div
                            className={`licao-modal__header--close`}
                            onClick={() => window.history.back()}
                        >
                            <FontAwesomeIcon icon={faXmark} />
                        </div>
                    </div>
                    <div className={`licao-modal__header-infos`}>
                        <div
                            key={"licao-modal-titulo"}
                            className="licao-modal__header--title"
                        >
                            <FontAwesomeIcon icon={faBoxesStacked} />
                            <h3>{licao.titulo}</h3>
                        </div>
                    </div>
                </div>

                <div className="licao-modal__body">
                    <ul className="licao-modal__registros">
                        {aulasDoTrimestre.map((aula) => (
                            <li key={aula.numero}>
                                <div className="licao-modal__registros-infos">
                                    <p>Lição {aula.numero}</p>
                                    <data
                                        value={aula.data.toLocaleDateString(
                                            "pt-BR",
                                        )}
                                    >
                                        {aula.data.toLocaleDateString("pt-BR")}
                                    </data>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </motion.div>
        </motion.div>
    );
};

const NovoTrimestreLicoesGlobais = ({
    licaoRef,
    rotulos,
    currentRotulo,
    onClose,
}: {
    licaoRef?: LicaoGlobalInterface;
    rotulos: RotulosClassesInterface[];
    currentRotulo: RotulosClassesInterface;
    onClose: () => void;
}) => {
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
    const [isLoading, setIsLoading] = useState(false);
    const [isEnviando, setIsEnviando] = useState(false);

    const methods = useForm<FormNovoTrimestreGlobal>({
        defaultValues: { numero_aulas: 13, igrejas: [] },
    });
    const {
        handleSubmit,
        register,
        reset,
        control,
        formState: { errors },
    } = methods;

    const { user } = useAuthContext();
    const { igrejas } = useDataContext();

    const img = useWatch({ control, name: "img" });
    const pdf = useWatch({ control, name: "pdf" });

    const apagarLicao = async (licaoId: string) => {
        setIsEnviando(true);
        setMensagem(null);
        try {
            await apagarLicaoGlobal({ licaoId });
            setMensagem({
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: "Lição apagada com sucesso",
                onCancel: () => {
                    window.history.back();
                    onClose();
                },
                onClose: () => {
                    window.history.back();
                    onClose();
                },
                onConfirm: () => {
                    window.history.back();
                    onClose();
                },
                title: "Sucesso",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
        } catch (error: any) {
            console.log("deu ao salvar revistas", error);
            setMensagem({
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: error.message,
                onCancel: () => {
                    window.history.back();
                    onClose();
                },
                onClose: () => {
                    window.history.back();
                    onClose();
                },
                onConfirm: () => {
                    window.history.back();
                    onClose();
                },
                title: "Erro ao salvar",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        } finally {
            setIsEnviando(false);
        }
    };
    const onSubmit = async (v: FormNovoTrimestreGlobal) => {
        // console.log(v);

        const dadosFinais = { ...v, licaoId: licaoRef?.id || null };
        setIsEnviando(true);

        try {
            if (dadosFinais?.img && dadosFinais.img.length) {
                const imagemRef = await reduzirImagem(
                    dadosFinais.img[0],
                    800,
                    800,
                );
                const storage = getStorage();
                const caminho = `capa-licoes-globais/${Date.now()}-${imagemRef.name}`;
                const storageRef = ref(storage, caminho);
                const imagemSnap = await uploadBytes(storageRef, imagemRef);
                const linkImagem = await getDownloadURL(imagemSnap.ref);

                dadosFinais.img = linkImagem;
            } else dadosFinais.img = licaoRef?.img || null;

            if (dadosFinais?.pdf && dadosFinais.pdf.length) {
                const pdfRef = dadosFinais.pdf[0] as File;
                const storage = getStorage();
                const caminho = `pdf-licoes-globais/${Date.now()}-${pdfRef.name}`;
                const storageRef = ref(storage, caminho);
                const pdfSnap = await uploadBytes(storageRef, pdfRef);
                const link = await getDownloadURL(pdfSnap.ref);

                dadosFinais.pdf = link;
            } else dadosFinais.pdf = licaoRef?.pdf || null;

            await cadastrarNovaLicaoGlobal(dadosFinais);

            setMensagem({
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: "Lições registradas com sucesso!",
                onCancel: () => {
                    window.history.back();
                    onClose();
                },
                onClose: () => {
                    window.history.back();
                    onClose();
                },
                onConfirm: () => {
                    window.history.back();
                    onClose();
                },
                title: "Sucesso",
                icon: <FontAwesomeIcon icon={faThumbsUp} />,
            });
        } catch (error: any) {
            console.log("deu ao salvar revistas", error);
            setMensagem({
                cancelText: "Cancelar",
                confirmText: "Ok",
                message: error.message,
                onCancel: () => {
                    window.history.back();
                    onClose();
                },
                onClose: () => {
                    window.history.back();
                    onClose();
                },
                onConfirm: () => {
                    window.history.back();
                    onClose();
                },
                title: "Erro ao salvar",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        } finally {
            setIsEnviando(false);
        }
    };
    const onLoadingEnd = useCallback(() => setIsLoading(false), []);

    useEffect(() => {
        if (!igrejas.length || !licaoRef) return;

        reset({
            data_inicio: licaoRef.data_inicio
                .toDate()
                .toISOString()
                .split("T")[0],
            numero_aulas: licaoRef.numero_aulas,
            numero_trimestre: licaoRef.numero_trimestre,
            rotuloId: licaoRef.rotuloId,
            titulo: licaoRef.titulo,
            igrejas: licaoRef.igrejas,
        });
    }, [igrejas]);
    return (
        <>
            <NovoTrimestreTemplate
                key={"novo-trimestre-template"}
                isEdit={!!licaoRef}
                title={licaoRef ? `${licaoRef.titulo}` : "Cadastrar Nova Lição"}
                isLoading={isLoading}
                isEnviando={isEnviando}
            >
                <FormProvider {...methods}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="novo-trimestre__form novo-trimestre-global"
                    >
                        <div className="novo-trimestre__input novo-trimestre__input--file">
                            <label htmlFor="imagem_capa">
                                <FontAwesomeIcon icon={faImage} />

                                <span>
                                    {img && img.length > 0
                                        ? (img as FileList)[0].name
                                        : licaoRef?.img
                                          ? "Alterar Imagem"
                                          : "Clique para adicionar capa da revista"}
                                </span>
                            </label>
                            <input
                                type="file"
                                id="imagem_capa"
                                accept="image/*"
                                {...register("img")}
                            />
                        </div>

                        <div className="novo-trimestre__input novo-trimestre__input--file">
                            <label htmlFor="pdf_revista">
                                <FontAwesomeIcon icon={faFilePdf} />
                                <span>
                                    {pdf && pdf.length > 0
                                        ? (pdf as FileList)[0].name
                                        : licaoRef?.pdf
                                          ? "Alterar PDF"
                                          : "Clique para adicionar PDF da revista"}
                                </span>
                            </label>
                            <input
                                type="file"
                                id="pdf_revista"
                                accept=".pdf"
                                {...register("pdf")}
                            />
                        </div>

                        <Rotulos
                            igrejas={igrejas}
                            isEdit={!!licaoRef}
                            rotuloDefault={currentRotulo}
                            rotulos={rotulos}
                            user={user}
                            onLoadingEnd={onLoadingEnd}
                        />

                        <div className="novo-trimestre__input-group">
                            <div className="novo-trimestre__input">
                                <label htmlFor="titulo">
                                    Titulo da lição <i>*</i>
                                </label>
                                <input
                                    type="text"
                                    id="titulo"
                                    className={
                                        errors.titulo ? "input-error" : ""
                                    }
                                    {...register("titulo", {
                                        required:
                                            "O título da lição é obrigatório",
                                    })}
                                />
                                <ErroComponent field={errors.titulo} />
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
                                        errors.numero_trimestre
                                            ? "input-error"
                                            : ""
                                    }
                                    {...register("numero_trimestre", {
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
                                <ErroComponent
                                    field={errors.numero_trimestre}
                                />
                            </div>
                        </div>

                        <div className="novo-trimestre__input-group">
                            <div className="novo-trimestre__input">
                                <label htmlFor="data_inicio">
                                    Data de Início <i>*</i>
                                </label>
                                <input
                                    type="date"
                                    id="data_inicio"
                                    className={
                                        errors.data_inicio ? "input-error" : ""
                                    }
                                    {...register("data_inicio", {
                                        required:
                                            "A data de início é obrigatória.",
                                        validate: (value) => {
                                            if (!value) return true;
                                            const dia = new Date(
                                                value,
                                            ).getUTCDay();
                                            return (
                                                dia === 0 ||
                                                "A data de início precisa ser um domingo!"
                                            );
                                        },
                                    })}
                                />
                                <ErroComponent field={errors.data_inicio} />
                            </div>
                            <div className="novo-trimestre__input">
                                <label htmlFor="numero_aulas">
                                    Quantidade de Aulas <i>*</i>
                                </label>
                                <input
                                    type="number"
                                    id="numero_aulas"
                                    className={
                                        errors.numero_aulas ? "input-error" : ""
                                    }
                                    {...register("numero_aulas", {
                                        required:
                                            "A quantidade de aulas é obrigatória",
                                        valueAsNumber: true,
                                        min: {
                                            value: 1,
                                            message: "O valor mínimo é 1",
                                        },
                                    })}
                                />
                                <ErroComponent field={errors.numero_aulas} />
                            </div>
                        </div>

                        <ListaDeAulas
                            control={control}
                            nameAulas="numero_aulas"
                            nameData="data_inicio"
                        />

                        <IgrejasDestino
                            control={control}
                            igrejas={igrejas}
                            register={register}
                        />

                        <div
                            className={`novo-trimestre__actions ${
                                licaoRef ? "novo-trimestre__actions--edit" : ""
                            }`}
                        >
                            {!!licaoRef && (
                                <button
                                    type="button"
                                    className="button-delete"
                                    onClick={() => {
                                        setMensagem({
                                            title: "Deletar lição",
                                            message: (
                                                <>
                                                    <span>
                                                        Você está prestes a
                                                        remover a lição{" "}
                                                        <strong>
                                                            {licaoRef?.titulo}
                                                        </strong>{" "}
                                                        de todas as igrejas
                                                        vinculadas.
                                                    </span>
                                                    <span>
                                                        Apenas as lições que
                                                        ainda não possuem
                                                        nenhuma chamada
                                                        registrada serão
                                                        excluídas. As demais
                                                        continuarão normalmente.
                                                    </span>
                                                    <span>Tem certeza?</span>
                                                </>
                                            ),
                                            onClose: () => {
                                                window.history.back();
                                            },
                                            onConfirm: () =>
                                                apagarLicao(licaoRef.id),
                                            onCancel: () => {
                                                window.history.back();
                                            },
                                            cancelText: "Cancelar",
                                            confirmText: "Sim, deletar lição",
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
                                    onClick={() => {
                                        window.history.back();
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="button-primary"
                                >
                                    {licaoRef ? "Atualizar" : "Criar Trimestre"}
                                </button>
                            </div>
                        </div>
                    </form>
                </FormProvider>
            </NovoTrimestreTemplate>
            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
};

const LIMITE = 5;
const ITENS_PAGINA = LIMITE;
function LicoesGlobais() {
    const [rotulos, setRotulos] = useState<RotulosClassesInterface[]>([]);
    const [criarLicao, setCriarLicao] = useState(false);
    const [editLicao, setEditLicao] = useState<LicaoGlobalInterface | null>(
        null,
    );
    const [showLicao, setShowLicao] = useState<LicaoGlobalInterface | null>(
        null,
    );
    const [currentRotulo, setCurrentRotulo] =
        useState<RotulosClassesInterface | null>(null);
    const [licoes, setLicoes] = useState<LicaoGlobalInterface[]>([]);
    const [limite, setLimite] = useState(LIMITE);
    const [paginaAtual, setPaginaAtual] = useState(1);
    const [pesquisa, setPesquisa] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const { user } = useAuthContext();

    const licoesMemo = useMemo(() => {
        if (pesquisa)
            return licoes.filter(
                (v) =>
                    v.data_inicio
                        .toDate()
                        .toLocaleDateString("pt-BR")
                        .includes(pesquisa) ||
                    v.titulo.toLocaleLowerCase().includes(pesquisa) ||
                    `${v.numero_trimestre} trimestre de ${v.data_inicio.toDate().getFullYear()}`.includes(
                        pesquisa,
                    ),
            );
        return licoes;
    }, [pesquisa, licoes]);
    const itensPaginados = useMemo(() => {
        const totalPaginas = Math.ceil(licoesMemo.length / ITENS_PAGINA);
        const indice = (paginaAtual - 1) * ITENS_PAGINA;
        const lista = [...licoesMemo].splice(indice, indice + ITENS_PAGINA);

        return { lista, totalPaginas };
    }, [licoesMemo, paginaAtual]);

    const onUpdateLimit = useCallback(() => {
        setLimite((v) => v + LIMITE);
    }, []);
    const onClose = useCallback(() => {
        window.location.reload();
    }, []);
    const onSelectLicao = useCallback(
        (licaoId: string) => {
            const licao = licoes.find((v) => v.id === licaoId);
            if (!licao) return;

            setShowLicao(licao);
        },
        [licoes],
    );
    const onEditLicao = useCallback(
        (licaoId: string) => {
            const licao = licoes.find((v) => v.id === licaoId);
            if (!licao) return;
            setShowLicao(null);
            setEditLicao(licao);
        },
        [licoes],
    );

    useEffect(() => {
        if (!currentRotulo || !user) return;

        const getLicoesGlobais = async () => {
            const rGlobaisCol = collection(db, "licoes_globais");
            const q = query(
                rGlobaisCol,
                where("ministerioId", "==", user.ministerioId),
                where("rotuloId", "==", currentRotulo.id),
                limit(limite),
            );
            const rGlobaisDocs = await getDocs(q);

            if (rGlobaisDocs.empty) return [];

            const rGlobais = rGlobaisDocs.docs
                .map(
                    (v) =>
                        ({
                            id: v.id,
                            ...v.data(),
                        }) as LicaoGlobalInterface,
                )
                .sort(
                    (a, b) =>
                        b.data_inicio.toDate().getTime() -
                        a.data_inicio.toDate().getTime(),
                );

            return rGlobais;
        };

        getLicoesGlobais()
            .then((v) => {
                setLicoes(v);
            })
            .catch((err) => console.log("Erro ao pegar lições", err));
    }, [currentRotulo, limite]);
    useEffect(() => {
        const getRotulos = async () => {
            const rotulosCollection = collection(db, "rotulos_classes");
            const q = query(
                rotulosCollection,
                where("ministerioId", "==", user!.ministerioId),
            );
            const rotulosDocs = await getDocs(q);

            if (rotulosDocs.empty) return [];

            const rotulosSnaps = rotulosDocs.docs.map((v) => {
                const r = { id: v.id, ...v.data() } as RotulosClassesInterface;
                const comIdade =
                    typeof r?.idade_minima === "number" ||
                    typeof r?.idade_maxima === "number";
                const idadeMinima = `${r.idade_minima}`;
                const idadeMaxima = ` - ${r.idade_maxima ? `${r.idade_maxima} anos` : "N/A anos"}`;
                r.name = r.nome;
                r.nome = `${r?.nome}${comIdade ? ` (${idadeMinima}${idadeMaxima})` : ""}`;
                return r;
            });

            const listaRotulos = rotulosSnaps.sort((a, b) => {
                if (a.nome === "OUTRO") return 1;
                if (b.nome === "OUTRO") return -1;

                return a.idade_minima - b.idade_minima;
            });
            setCurrentRotulo(listaRotulos[0]);
            return listaRotulos;
        };

        getRotulos()
            .then((v) => {
                setRotulos(v);
            })
            .catch((err) => console.log("erro ao procurar rotulos", err))
            .finally(() => setIsLoading(false));

        const voltar = () => {
            setCriarLicao(false);
            setEditLicao(null);
            setShowLicao(null);
        };
        window.addEventListener("popstate", voltar);

        return () => {
            window.removeEventListener("popstate", voltar);
        };
    }, []);
    if (isLoading) return <Loading />;
    return (
        <>
            <div className="licoes-globais">
                <div className="licoes-globais__header">
                    <h2>Gestão Lições Globais</h2>

                    <div className="licoes-grid__header--controls">
                        <div className="licoes-grid__header--novo-trimestre">
                            <motion.button
                                onTap={() => {
                                    setCriarLicao(true);
                                    window.history.pushState(
                                        { modal: true },
                                        "",
                                    );
                                }}
                            >
                                <FontAwesomeIcon icon={faCalendarDay} />
                                <span>Cadastrar um novo trimestre</span>
                            </motion.button>
                        </div>

                        <SearchInput
                            onSearch={(texto: string) => setPesquisa(texto)}
                            texto="Ano, Trimestre, Nome"
                        />
                    </div>
                </div>

                <div className="licoes-globais__body">
                    {rotulos.length > 1 ? (
                        <div className="licoes-globais__lista">
                            <DragContainer>
                                <>
                                    {rotulos.map((v) => (
                                        <motion.button
                                            key={v.id}
                                            className={`licoes-globais__rotulo ${v.id === currentRotulo?.id ? "licoes-globais__rotulo--selected" : ""}`}
                                            onTap={() => setCurrentRotulo(v)}
                                            title="Escolher Rotúlo"
                                            type="button"
                                        >
                                            {v.name}
                                        </motion.button>
                                    ))}
                                </>
                            </DragContainer>

                            {licoes.length > 0 ? (
                                <div className="licoes-globais__licoes">
                                    <div className="licoes-grid__grid">
                                        {itensPaginados.lista.length > 0 ? (
                                            <>
                                                {itensPaginados.lista.map(
                                                    (v) => (
                                                        <LicaoCard
                                                            dataInicio={v.data_inicio
                                                                .toDate()
                                                                .toLocaleDateString(
                                                                    "pt-BR",
                                                                    {
                                                                        month: "2-digit",
                                                                        year: "numeric",
                                                                    },
                                                                )}
                                                            isAtivo={v.ativo}
                                                            licaoId={v.id}
                                                            numeroAulas={
                                                                v.numero_aulas
                                                            }
                                                            titulo={v.titulo}
                                                            trimestre={`${v.numero_trimestre}º Trimestre de ${v.data_inicio.toDate().getFullYear()}`}
                                                            img={v.img}
                                                            onClick={
                                                                onSelectLicao
                                                            }
                                                            key={v.id}
                                                        />
                                                    ),
                                                )}

                                                {licoes.length >= limite && (
                                                    <motion.button
                                                        className="licao-card__more"
                                                        onTap={onUpdateLimit}
                                                    >
                                                        <p>
                                                            Clique aqui para
                                                            carregar lições mais
                                                            antigas.
                                                        </p>
                                                        <i>
                                                            <FontAwesomeIcon
                                                                icon={
                                                                    faMagnifyingGlass
                                                                }
                                                            />
                                                        </i>
                                                    </motion.button>
                                                )}
                                            </>
                                        ) : (
                                            <motion.div
                                                className="licoes-grid__vazia"
                                                initial={{
                                                    opacity: 0,
                                                    y: -10,
                                                }}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                }}
                                                exit={{
                                                    opacity: 0,
                                                    y: -10,
                                                }}
                                            >
                                                <p>Nenhuma lição encontrada</p>

                                                <div className="licoes-grid__header--novo-trimestre">
                                                    <button
                                                        onClick={() => {
                                                            setCriarLicao(true);
                                                            window.history.pushState(
                                                                { modal: true },
                                                                "",
                                                            );
                                                        }}
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faCalendarDay}
                                                        />
                                                        <span>
                                                            Iniciar um novo
                                                            trimestre
                                                        </span>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                    {itensPaginados.totalPaginas > 1 && (
                                        <div className="licoes-grid__paginacao">
                                            <motion.button
                                                onTap={() =>
                                                    setPaginaAtual((p) => p - 1)
                                                }
                                                disabled={paginaAtual === 1}
                                            >
                                                <FontAwesomeIcon
                                                    icon={faCaretLeft}
                                                />
                                            </motion.button>
                                            <span>
                                                {paginaAtual} de{" "}
                                                {itensPaginados.totalPaginas}
                                            </span>
                                            <motion.button
                                                onTap={() =>
                                                    setPaginaAtual((p) => p + 1)
                                                }
                                                disabled={
                                                    paginaAtual >=
                                                    itensPaginados.totalPaginas
                                                }
                                            >
                                                <FontAwesomeIcon
                                                    icon={faCaretRight}
                                                />
                                            </motion.button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="licoes-globais__licoes-vazio">
                                    <p>
                                        Nenhuma lição foi cadastrada para o
                                        rótulo {currentRotulo?.nome}
                                    </p>
                                    <div className="licoes-grid__header--novo-trimestre">
                                        <motion.button
                                            onTap={() => {
                                                setCriarLicao(true);
                                                window.history.pushState(
                                                    { modal: true },
                                                    "",
                                                );
                                            }}
                                        >
                                            <FontAwesomeIcon
                                                icon={faCalendarDay}
                                            />
                                            <span>
                                                Cadastrar um novo trimestre
                                            </span>
                                        </motion.button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="licoes-globais__sem-rotulos">
                            <div className="licoes-globais__sem-rotulos--texto">
                                <p>
                                    <i>
                                        <FontAwesomeIcon
                                            icon={faCircleExclamation}
                                        />
                                    </i>
                                    Não existem rótulos de classes cadastrados
                                    nesse ministério.
                                </p>
                                <p>
                                    Clique no link abaixo para realizar os
                                    cadastros
                                </p>
                            </div>

                            <Link
                                to={"/rotulos-classes"}
                                className="licoes-globais__sem-rotulos--link"
                            />
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {currentRotulo && (criarLicao || editLicao) && (
                    <NovoTrimestreLicoesGlobais
                        currentRotulo={currentRotulo}
                        rotulos={rotulos}
                        key={"novo-trimestre-global"}
                        licaoRef={editLicao || undefined}
                        onClose={onClose}
                    />
                )}
                {showLicao && !(criarLicao || editLicao) && (
                    <LicaoGlobalModal
                        licao={showLicao}
                        key={"licao-global-modal"}
                        onEditLicao={onEditLicao}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default LicoesGlobais;
