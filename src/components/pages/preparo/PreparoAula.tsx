import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Loading from "../../layout/loading/Loading";
import "./preparo-aula.scss";
import { useAuthContext } from "../../../context/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../utils/firebase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faChevronDown,
    faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import { FormProvider, useForm } from "react-hook-form";
import { AnimatePresence, motion } from "framer-motion";
import Dropdown from "../../ui/Dropdown";
import SearchInput from "../../ui/SearchInput";
import { getFunctions, httpsCallable } from "firebase/functions";
import YouTube from "react-youtube";
import { useDataContext } from "../../../context/DataContext";
import AlertModal from "../../ui/AlertModal";

interface Aula {
    aula: string;
    titulo_aula: string | null;
    link_youtube: string | null;
    trimestre: string;
    total_visualizacoes: number;
    realizado: boolean;
    licaoId?: string;
}

interface VideoForm {
    link_youtube: string;
    titulo_aula: string;
}

interface Visualicoes {
    [Key: string]: {
        classe: string;
        contagem_visualizacoes: number;
        igreja: string;
        nome: string;
        ultima_visualizacao: Timestamp | null;
    }[];
}

interface LicoesDropdown {
    id: string;
    nome: string;
    aulas: { id: string; nome: string; status: boolean }[];
}

const functions = getFunctions();
const salvarAulaPreparo = httpsCallable(functions, "salvarAulaPreparo");
const deletarAulaPreparo = httpsCallable(functions, "deletarAulaPreparo");
const registrarVisualizacao = httpsCallable(functions, "registrarVisualizacao");
const getVisualizacoes = httpsCallable(functions, "getVisualizacoes");
const getLicoesPreparo = httpsCallable(functions, "getLicoesPreparo");

function PreparoAula() {
    const { licaoId, aulaId } = useParams();
    const navigate = useNavigate();
    const { isSuperAdmin } = useAuthContext();
    const { igrejas } = useDataContext();
    const [aula, setAula] = useState<Aula | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [update, setUpdate] = useState(false);
    const [isOpenCadastro, setIsOpenCadastro] = useState(false);
    const [isOpenChamada, setIsOpenChamada] = useState(false);
    const [views, setViews] = useState<Visualicoes | null>(null);
    const [loadingViews, setLoadingViews] = useState(true);
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null
    );
    const [pesquisa, setPesquisa] = useState("");
    const [currentLicao, setCurrentLicao] = useState<LicoesDropdown | null>(
        null
    );
    const [currentAulaId, setCurrentAulaId] = useState<string | null>(null);
    const [listaLicoes, setListaLicoes] = useState<LicoesDropdown[]>([]);
    const [isLoadingVideo, setIsLoadingVideo] = useState(true);
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

    const jaViu = useRef(false);

    const methods = useForm<VideoForm>();
    const {
        register,
        reset,
        handleSubmit,
        formState: { errors },
    } = methods;

    const onSubmit = async (dados: VideoForm) => {
        if (!isSuperAdmin.current) return;
        setIsLoading(true);
        try {
            await salvarAulaPreparo({ dados, aulaId, licaoId });
            setUpdate((v) => !v);
            setIsOpenCadastro(false);
        } catch (Error: any) {
            console.log("deu esse erro", Error);
            setMensagem({
                title: "Erro ao salvar lição",
                message: Error.message,
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

    const onDelete = async () => {
        if (!isSuperAdmin.current) return;
        setIsLoading(true);
        try {
            await deletarAulaPreparo({ aulaId, licaoId });
            setUpdate((v) => !v);
            setIsOpenCadastro(false);
        } catch (Error: any) {
            console.log("deu esse erro", Error);
            setMensagem({
                title: "Erro ao salvar lição",
                message: Error.message,
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

    const countVisualizacao = async () => {
        if (jaViu.current) return;

        try {
            const { data } = await registrarVisualizacao({ licaoId, aulaId });
            console.log((data as any).message);
        } catch (Error: any) {
            console.log("deu esse erro", Error);
        }
    };

    const viewsMemo = useMemo(() => {
        if (!views) return null;
        let v = Object.values(views).flat();
        if (currentIgreja) v = views[currentIgreja.id];
        if (pesquisa)
            v = v.filter(
                (v) =>
                    v.nome.toLowerCase().includes(pesquisa) ||
                    v.contagem_visualizacoes == Number(pesquisa)
            );
        return v.sort(
            (a, b) => b.contagem_visualizacoes - a.contagem_visualizacoes
        );
    }, [views, currentIgreja, pesquisa]);

    useEffect(() => {
        const getAula = async () => {
            if (!licaoId || !aulaId) {
                navigate("/preparo");
                return;
            }

            try {
                const aulaRef = doc(
                    db,
                    "licoes_preparo",
                    licaoId,
                    "aulas",
                    aulaId
                );
                const docSnap = await getDoc(aulaRef);

                if (docSnap.exists()) {
                    const aulaData = docSnap.data() as Aula;
                    setAula(aulaData);
                    if (aulaData.realizado) {
                        reset({
                            link_youtube: aulaData.link_youtube!,
                            titulo_aula: aulaData.titulo_aula!,
                        });

                        // setTimeout(
                        //     () =>
                        //         window.scroll({ top: 500, behavior: "smooth" }),
                        //     1000
                        // );
                    }
                } else console.log("Aula não encontrada!");
            } catch (error) {
                console.error("deu esse erro:", error);
            } finally {
                setIsLoading(false);
            }
        };
        const pegarViews = async () => {
            if (!isSuperAdmin.current) return;
            setLoadingViews(true);

            try {
                const { data } = await getVisualizacoes({ aulaId, licaoId });
                const dados = data as any;
                setViews(dados);
            } catch (Error: any) {
                console.log("deu esse erro", Error);
            } finally {
                setLoadingViews(false);
            }
        };

        getAula();
        pegarViews();
    }, [licaoId, aulaId, update]);
    useEffect(() => {
        getLicoesPreparo().then(({ data }) => {
            const result = data as LicoesDropdown[];
            setListaLicoes(result);
            setCurrentAulaId(aulaId || "1");
            setCurrentLicao(result.find((v) => v.id === licaoId) || null);
        });
    }, []);

    if (isLoading) return <Loading />;
    if (!aula)
        return <div className="preparo-aula--vazio">Aula não encontrada.</div>;
    return (
        <>
            <div className="preparo-aula">
                {isSuperAdmin.current && (
                    <motion.div
                        className="preparo-aula__painel"
                        onClick={() => setIsOpenCadastro((v) => !v)}
                    >
                        <div className="preparo-aula__painel-container">
                            <motion.button
                                title="Cadastrar Vídeo"
                                type="button"
                            >
                                {aula.realizado ? "Editar" : "Cadastrar"} Vídeo{" "}
                                <span
                                    className={
                                        isOpenCadastro
                                            ? "preparo-aula--open"
                                            : "preparo-aula--close"
                                    }
                                >
                                    <FontAwesomeIcon icon={faChevronDown} />
                                </span>
                            </motion.button>

                            <FormProvider {...methods}>
                                <AnimatePresence>
                                    {isOpenCadastro && (
                                        <motion.form
                                            className="preparo-aula__form"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{
                                                height: "auto",
                                                opacity: 1,
                                            }}
                                            exit={{ height: 0, opacity: 0 }}
                                            onSubmit={handleSubmit(onSubmit)}
                                            onClick={(evt) =>
                                                evt.stopPropagation()
                                            }
                                            key={"cadastrar-video"}
                                        >
                                            <div className="preparo-aula__input">
                                                <label htmlFor="titulo-aula">
                                                    Título
                                                </label>
                                                <input
                                                    type="text"
                                                    id="titulo-aula"
                                                    className={
                                                        errors.titulo_aula &&
                                                        "input-error"
                                                    }
                                                    {...register(
                                                        "titulo_aula",
                                                        {
                                                            required:
                                                                "O título é obrigatório",
                                                        }
                                                    )}
                                                />
                                                <AnimatePresence>
                                                    {errors.titulo_aula && (
                                                        <motion.div
                                                            className="preparo-aula__input--error"
                                                            initial={{
                                                                y: -5,
                                                                opacity: 0,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                y: 0,
                                                            }}
                                                            exit={{
                                                                y: 5,
                                                                opacity: 0,
                                                            }}
                                                        >
                                                            <p>
                                                                {
                                                                    errors
                                                                        .titulo_aula
                                                                        .message
                                                                }
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="preparo-aula__input">
                                                <label htmlFor="link-aula">
                                                    Link do Youtube
                                                </label>
                                                <input
                                                    type="text"
                                                    id="link-aula"
                                                    className={
                                                        errors.link_youtube &&
                                                        "input-error"
                                                    }
                                                    {...register(
                                                        "link_youtube",
                                                        {
                                                            required:
                                                                "O link é obrigatório",
                                                        }
                                                    )}
                                                />
                                                <AnimatePresence>
                                                    {errors.link_youtube && (
                                                        <motion.div
                                                            className="preparo-aula__input--error"
                                                            initial={{
                                                                y: -5,
                                                                opacity: 0,
                                                            }}
                                                            animate={{
                                                                opacity: 1,
                                                                y: 0,
                                                            }}
                                                            exit={{
                                                                y: 5,
                                                                opacity: 0,
                                                            }}
                                                        >
                                                            <p>
                                                                {
                                                                    errors
                                                                        .link_youtube
                                                                        .message
                                                                }
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                            <div className="preparo-aula__buttons">
                                                {aula.realizado && (
                                                    <motion.button
                                                        whileTap={{
                                                            scale: 0.9,
                                                        }}
                                                        title="Salvar Vídeo"
                                                        type="button"
                                                        className="button-deletar"
                                                        onTap={onDelete}
                                                    >
                                                        Deletar Vídeo
                                                    </motion.button>
                                                )}
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    title="Salvar Vídeo"
                                                    type="submit"
                                                >
                                                    Salvar{" "}
                                                    {aula.realizado &&
                                                        "edição do "}{" "}
                                                    Vídeo
                                                </motion.button>
                                            </div>
                                        </motion.form>
                                    )}
                                </AnimatePresence>
                            </FormProvider>
                        </div>
                    </motion.div>
                )}

                {isSuperAdmin.current && (
                    <div className="preparo-aula__chamada">
                        <h2 onClick={() => setIsOpenChamada((v) => !v)}>
                            Visualizações{" "}
                            <span
                                className={
                                    isOpenChamada
                                        ? "preparo-aula--open"
                                        : "preparo-aula--close"
                                }
                            >
                                <FontAwesomeIcon icon={faChevronDown} />
                            </span>
                        </h2>
                        <AnimatePresence>
                            {isOpenChamada && !loadingViews ? (
                                <motion.div
                                    className="preparo-aula__chamada-table-container"
                                    initial={{
                                        height: 0,
                                        opacity: 0,
                                        paddingBottom: 0,
                                    }}
                                    animate={{
                                        height: "auto",
                                        opacity: 1,
                                        paddingBottom: "2rem",
                                    }}
                                    exit={{
                                        height: 0,
                                        opacity: 0,
                                        paddingBottom: 0,
                                    }}
                                    key={"preparo-aula-tabela"}
                                >
                                    <div className="preparo-aula__chamada--filtros">
                                        <Dropdown
                                            current={
                                                currentIgreja?.nome || null
                                            }
                                            onSelect={(v) =>
                                                setCurrentIgreja(v)
                                            }
                                            lista={igrejas}
                                            selectId={currentIgreja?.id}
                                        />
                                        <SearchInput
                                            onSearch={(v) => setPesquisa(v)}
                                        />
                                    </div>
                                    <table className="preparo-aula__chamada-table">
                                        <thead>
                                            <tr>
                                                <th>
                                                    <p>Nome</p>
                                                </th>
                                                <th>
                                                    <p>Igreja</p>
                                                </th>
                                                <th>
                                                    <p>Classe</p>
                                                </th>
                                                <th>
                                                    <p>Visualições</p>
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {viewsMemo?.map((v, i) => (
                                                <tr key={i}>
                                                    <td data-label="Nome">
                                                        <p>{v.nome}</p>
                                                    </td>
                                                    <td data-label="Igreja">
                                                        <p>{v.igreja}</p>
                                                    </td>
                                                    <td data-label="Classe">
                                                        <p>
                                                            {v.classe ||
                                                                "(Sem Classe)"}
                                                        </p>
                                                    </td>
                                                    <td data-label="Visualizações">
                                                        <p>
                                                            {
                                                                v?.contagem_visualizacoes
                                                            }
                                                        </p>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </motion.div>
                            ) : (
                                isOpenChamada && (
                                    <motion.div
                                        key={"table-skeleton"}
                                        className="table-skeleton"
                                    >
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th></th>
                                                    <th></th>
                                                    <th></th>
                                                    <th></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                </tr>
                                                <tr>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                </tr>
                                                <tr>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                    <td></td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </motion.div>
                                )
                            )}
                        </AnimatePresence>
                    </div>
                )}
                <div className="preparo-aula__video">
                    <div className="preparo-aula__title">
                        <h1>{aula.titulo_aula || "Aula sem título"}</h1>
                        <div className="preparo-aula__desc">
                            <div className="preparo-aula__trimestre">
                                <p>{aula.trimestre}</p>
                            </div>
                            <div className="preparo-aula__numero">
                                <p>Aula {aulaId}</p>
                            </div>
                        </div>
                    </div>

                    {aula.realizado ? (
                        <div className="preparo-aula__video-container">
                            {isLoadingVideo && (
                                <div className="video-loader"></div>
                            )}
                            <YouTube
                                videoId={aula.link_youtube?.slice(
                                    aula.link_youtube.lastIndexOf("/") + 1,
                                    aula.link_youtube.lastIndexOf("?")
                                )}
                                onPlay={() => {
                                    if (!jaViu.current) {
                                        countVisualizacao();
                                        jaViu.current = true;
                                    }
                                }}
                                onReady={() =>
                                    setTimeout(
                                        () => setIsLoadingVideo(false),
                                        500
                                    )
                                }
                            />
                        </div>
                    ) : (
                        <div className="preparo-aula__video--vazio">
                            <p>
                                Nenhum vídeo foi adicionado para esta aula
                                ainda.
                            </p>
                        </div>
                    )}

                    <div className="preparo-aula__filtros">
                        <div className="preparo-aula__filtros--item">
                            <p>Lição:</p>
                            <Dropdown
                                isAll={false}
                                lista={listaLicoes}
                                current={currentLicao?.nome || null}
                                isLoading={!currentLicao}
                                onSelect={(v) => {
                                    setCurrentLicao(v);
                                    setCurrentAulaId(null);
                                }}
                                selectId={currentLicao?.id || ""}
                            />
                        </div>
                        <div className="preparo-aula__filtros--item">
                            <p>Aula:</p>
                            <Dropdown
                                isAll={false}
                                lista={currentLicao?.aulas || []}
                                current={currentAulaId}
                                selectId={currentAulaId || ""}
                                onSelect={(v) => {
                                    if (v?.id) {
                                        setCurrentAulaId(v.id);
                                        navigate(
                                            `/preparo/licao/${
                                                currentLicao!.id
                                            }/aula/${v?.id}`
                                        );
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
}

export default PreparoAula;
