import {
    faArrowLeft,
    faAward,
    faBatteryThreeQuarters,
    faBolt,
    faBookBible,
    faBookBookmark,
    faBookmark,
    faBookOpen,
    faBookOpenReader,
    faBrain,
    faCalendarDays,
    faChartPie,
    faChartSimple,
    faCheck,
    faChurch,
    faClock,
    faClockRotateLeft,
    faCrown,
    faDiceD6,
    faEllipsisVertical,
    faFeather,
    faFire,
    faFlag,
    faGear,
    faGem,
    faGhost,
    faHandshake,
    faHandsPraying,
    faHeart,
    faLightbulb,
    faMedal,
    faMountain,
    faPeopleGroup,
    faPercent,
    faPersonRunning,
    faPlus,
    faRightFromBracket,
    faRightToBracket,
    faSeedling,
    faShieldHalved,
    faSmile,
    faSnowflake,
    faStar,
    faStopwatch,
    faSun,
    faTableList,
    faThumbsUp,
    faTriangleExclamation,
    faTrophy,
    faUserTie,
    faX,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getFunctions, httpsCallable } from "firebase/functions";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import React, {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import Loading from "../../layout/loading/Loading";
import { useNavigate, useParams } from "react-router-dom";
import AlertModal from "../../ui/AlertModal";
import type {
    ConquistaInterface,
    HistoricoPortalInterface,
    ResponseGetPortalAluno,
} from "../../../interfaces/CachePortalAluno";
import "./portal-aluno.scss";
import useIsMobile from "../../../hooks/useIsMobile";
import { faFreeCodeCamp } from "@fortawesome/free-brands-svg-icons";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { GraficoRosca, PanoramaPieChart } from "../../ui/PanoramaLicao";
import Dropdown from "../../ui/Dropdown";
import LoadingModal from "../../layout/loading/LoadingModal";
import { useAuthContext } from "../../../context/AuthContext";
import { Timestamp } from "firebase/firestore";

interface PortalAlunoLogin {
    dia: string;
    mes: string;
    ano: string;
    manterConectado: boolean;
}

const functions = getFunctions();
const getPortalAluno = httpsCallable(functions, "getPortalAluno");

const frequenciaVariants: Variants = {
    initial: {},
    animate: { transition: { delayChildren: stagger(0.13) } },
    exit: {},
};
const frequenciaItensVariants: Variants = {
    initial: { scale: 0 },
    animate: { scale: 1 },
    exit: { scale: 0 },
};
const frequenciaLottieVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
};
const formVariants: Variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { delayChildren: stagger(0.3) } },
    exit: { opacity: 0 },
};
const inputVariants: Variants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
};

export const TROFEUS: any = {
    faTrophy,
    faSeedling,
    faBookOpen,
    faBookOpenReader,
    faBookBookmark,
    faBookBible,
    faStopwatch,
    faUserTie,
    faMountain,
    faBatteryThreeQuarters,
    faGhost,
    faFreeCodeCamp,
    faChurch,

    faStar,
    faMedal,
    faCrown,
    faFire,
    faBolt,
    faHeart,
    faHandsPraying,
    faHandshake,
    faLightbulb,
    faBrain,
    faSmile,
    faPeopleGroup,
    faPersonRunning,
    faShieldHalved,
    faFlag,
    faGem,
    faAward,
    faThumbsUp,
    faSun,
    faFeather,
};
const MENSAGENS = [
    "Hora de começar.",
    "Você deu o primeiro passo.",
    "Isso já está virando hábito.",
    "Firmado na rocha, não na areia.",
    "Muito bem, continue firme.",
    "Você está consistente!",
    "Sua lamparina continua acesa.",
    "7 é o número da perfeição.",
    "Crescendo de glória em glória.",
    "Você já é exemplo.",
    "Poucos chegam até aqui!",
    "Nível de dedicação alto!",
    "Combatendo o bom combate.",
    "Fiel até o fim. Sua constância glorifica a Deus.",
];
const ABAS = [
    { nome: "Visão Geral", icon: faDiceD6, id: "visao-geral" },
    { nome: "Conquistas", icon: faTrophy, id: "conquistas" },
    { nome: "Histórico", icon: faClockRotateLeft, id: "historia" },
];

const CoachMark = React.memo(
    ({
        refs,
        isOpen,
        onClose,
    }: {
        refs: { mensagem: string; id: string }[];
        isOpen: boolean;
        onClose?: () => void;
    }) => {
        const [index, setIndex] = useState(0);
        const [close, setClose] = useState(false);
        const [destaque, setDestaque] = useState({});

        const balaoRef = useRef<HTMLDivElement>(null);

        useEffect(() => {
            if (!isOpen || close || !balaoRef.current) return;
            if (!refs[index]) {
                setClose(true);
                onClose && onClose();
                return;
            }

            const balaoRect = balaoRef.current.getBoundingClientRect();
            const ref = document.getElementById(refs[index].id);

            if (!ref) {
                console.log("elemento não encontrado");
                setIndex((v) => v + 1);
                return;
            }

            ref.scrollIntoView({ behavior: "instant", block: "center" });

            const refRect = ref.getBoundingClientRect();
            const espacoAbaixo = window.innerHeight - refRect.bottom;
            const alturaBalao = balaoRect.height;
            const margem = 8;

            let translateX =
                refRect.left + refRect.width / 2 - balaoRect.width / 2;
            const margemTela = 5;
            let translateY = 0;

            if (translateX < margemTela) translateX = margemTela;
            else if (
                translateX + balaoRect.width >
                window.innerWidth - margemTela
            ) {
                translateX = window.innerWidth - balaoRect.width - margemTela;
            }
            if (espacoAbaixo > alturaBalao) {
                balaoRef.current.classList.add("balao-baixo");
                balaoRef.current.classList.remove("balao-topo");
                translateY = refRect.bottom + margem;
            } else {
                balaoRef.current.classList.add("balao-topo");
                balaoRef.current.classList.remove("balao-baixo");
                translateY = refRect.top - alturaBalao - margem;
            }

            setDestaque({
                top: refRect.top,
                left: refRect.left,
                width: refRect.width,
                height: refRect.height,
            });

            balaoRef.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
            ref.style.zIndex = "3000";
            ref.style.position = "relative";

            return () => {
                ref.style.removeProperty("z-index");
                ref.style.removeProperty("position");
                setDestaque({});
            };
        }, [refs, isOpen, index]);
        return (
            <AnimatePresence>
                {!isOpen || close ? (
                    <></>
                ) : (
                    <motion.div
                        className="coach-mark"
                        onClick={() => setIndex((v) => v + 1)}
                        exit={{ opacity: 0 }}
                        key={"coach-mark"}
                    >
                        <div
                            className="coach-mark__destaque"
                            style={destaque}
                        ></div>
                        <motion.div
                            ref={balaoRef}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="coach-mark__balao"
                        >
                            <p>{refs[index]?.mensagem}</p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    },
);
const PortalAlunoOpcoes = React.memo(
    ({ onSelectOption }: { onSelectOption: (v: any) => void }) => {
        const isMobile = useIsMobile(480);

        return (
            <div
                className={`portal_aluno__opcoes ${isMobile ? "mobile-footer" : ""}`}
            >
                <div className="portal_aluno__lista">
                    {ABAS.map((v, i) =>
                        isMobile ? (
                            <div
                                className="portal_aluno__opcao"
                                key={v.id}
                                id={i === 1 ? "nav-bar-portal" : undefined}
                            >
                                <label htmlFor={`opcoes-${i}`}>
                                    <i>
                                        <FontAwesomeIcon icon={v.icon} />
                                    </i>
                                    <span>{v.nome}</span>
                                </label>
                                <input
                                    type="radio"
                                    name="opcoes"
                                    id={`opcoes-${i}`}
                                    defaultChecked={i === 0}
                                    onChange={() => {
                                        onSelectOption(v.id);
                                    }}
                                />
                            </div>
                        ) : (
                            <div
                                className="portal_aluno__opcao"
                                key={v.id}
                                id={i === 1 ? "nav-bar-portal" : undefined}
                            >
                                <label htmlFor={`opcoes-${i}`}>{v.nome}</label>
                                <input
                                    type="radio"
                                    name="opcoes"
                                    id={`opcoes-${i}`}
                                    defaultChecked={i === 0}
                                    onChange={() => {
                                        onSelectOption(v.id);
                                    }}
                                />
                            </div>
                        ),
                    )}
                </div>
            </div>
        );
    },
);

// Visão Geral
const jaViuVisaoGeral = () => {
    localStorage.setItem("ja-viu-visao-geral-coach", "true");
};
const MensagemOfensiva = ({ ofensiva }: { ofensiva: number }) => {
    return (
        <div className="visao_geral_portal__frequencia-mensagem">
            <span
                className={
                    ofensiva === 0 ? "ice" : ofensiva <= 2 ? "seed" : "fire"
                }
            >
                {ofensiva === 0 ? (
                    <i>
                        <FontAwesomeIcon icon={faSnowflake} />
                    </i>
                ) : ofensiva <= 2 ? (
                    <i>
                        <FontAwesomeIcon icon={faSeedling} />
                    </i>
                ) : ofensiva <= 7 ? (
                    <i>
                        <FontAwesomeIcon icon={faFire} />
                    </i>
                ) : ofensiva <= 10 ? (
                    <>
                        <i>
                            <FontAwesomeIcon icon={faFire} />
                        </i>
                        <i>
                            <FontAwesomeIcon icon={faFire} />
                        </i>
                    </>
                ) : ofensiva <= 13 ? (
                    <>
                        <i>
                            <FontAwesomeIcon icon={faFire} />
                        </i>
                        <i>
                            <FontAwesomeIcon icon={faFire} />
                        </i>
                        <i>
                            <FontAwesomeIcon icon={faFire} />
                        </i>
                    </>
                ) : (
                    <></>
                )}

                {ofensiva}
            </span>
            <p> {MENSAGENS[ofensiva] ?? MENSAGENS[13]}</p>
        </div>
    );
};
const Ofensiva = ({ dadosMemo }: { dadosMemo: any }) => {
    return (
        <div className="visao_geral_portal__frequencia">
            <h2>OFENSIVA</h2>
            <motion.div
                className="visao_geral_portal__datas"
                variants={frequenciaVariants}
                initial="initial"
                animate="animate"
                exit={"exit"}
            >
                {dadosMemo.dias.map((v: any, i: any) => (
                    <div
                        key={i}
                        className={`visao_geral_portal__data visao_geral_portal__data--${v?.status?.status?.replace(" ", "_")}`}
                    >
                        <p className="visao_geral_portal__data-info">
                            {v.data.toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                            })}
                        </p>

                        <div className="visao_geral_portal__data-container">
                            <motion.div
                                className="visao_geral_portal__data-icon"
                                variants={frequenciaLottieVariants}
                            >
                                {dadosMemo.ofensivas.includes(
                                    v.data.toLocaleDateString("pt-BR"),
                                ) ? (
                                    <motion.span>
                                        <DotLottieReact
                                            src={
                                                v.status?.status ===
                                                "Falta Justificada"
                                                    ? "/shield.lottie"
                                                    : "/fire.lottie"
                                            }
                                            loop
                                            autoplay
                                            // key={`lottie-${i}`}
                                        />
                                    </motion.span>
                                ) : (
                                    <motion.i>
                                        {v.status?.status === "Falta" ||
                                        v.status?.status ===
                                            "Falta Justificada" ? (
                                            <FontAwesomeIcon icon={faXmark} />
                                        ) : v.status?.status === "Atrasado" ||
                                          v.status?.status === "Presente" ? (
                                            <FontAwesomeIcon icon={faCheck} />
                                        ) : (
                                            <FontAwesomeIcon icon={faClock} />
                                        )}
                                    </motion.i>
                                )}
                            </motion.div>
                            {i + 1 !== dadosMemo.dias.length ? (
                                <motion.div
                                    className="visao_geral_portal__data-linha"
                                    variants={frequenciaItensVariants}
                                ></motion.div>
                            ) : undefined}
                        </div>
                    </div>
                ))}
            </motion.div>
            <MensagemOfensiva ofensiva={dadosMemo.ofensivas.length} />
        </div>
    );
};
const Card = ({
    dados,
    title,
}: {
    dados: any;
    title: "Presença" | "Bíblia" | "Revista";
}) => {
    const [isDetalhes, setIsDetalhes] = useState(false);
    const detalhes = dados.licao_atual.detalhes_aluno;
    const valores =
        title === "Presença"
            ? [
                  {
                      name: "Atrasado",
                      value: detalhes?.atrasado,
                  },
                  {
                      name: "Presente",
                      value: detalhes?.presente,
                  },
                  {
                      name: "Falta Justificada",
                      value: detalhes?.falta_justificada,
                  },
                  {
                      name: "Falta",
                      value: detalhes?.falta,
                  },
              ]
            : [
                  {
                      name: "Não Trouxe",
                      value:
                          title === "Revista"
                              ? detalhes?.nao_trouxe_revista
                              : detalhes?.nao_trouxe_biblia,
                  },
                  {
                      name: "Trouxe",
                      value:
                          title === "Revista"
                              ? detalhes?.trouxe_revista
                              : detalhes?.trouxe_biblia,
                  },
              ];
    return (
        <div
            className={`visao_geral_portal__card ${!isDetalhes ? "visao_geral_portal__card--gap" : ""}`}
        >
            <div className="visao_geral_portal__card-header">
                <h2>
                    <i>
                        <FontAwesomeIcon icon={faStar} />
                    </i>
                    <span>{title}</span>
                </h2>

                <div className="visao_geral_portal__detalhes-opts">
                    <div className="visao_geral_portal__detalhes-opt">
                        <label htmlFor={`opt-card-${title}-percent`}>
                            <i>
                                <FontAwesomeIcon icon={faPercent} />
                            </i>
                        </label>
                        <input
                            type="radio"
                            id={`opt-card-${title}-percent`}
                            checked={!isDetalhes}
                            onChange={() => setIsDetalhes(false)}
                        />
                    </div>
                    <div className="visao_geral_portal__detalhes-opt">
                        <label htmlFor={`opt-card-${title}-detail`}>
                            <i>
                                <FontAwesomeIcon icon={faChartPie} />
                            </i>
                        </label>
                        <input
                            type="radio"
                            id={`opt-card-${title}-detail`}
                            checked={isDetalhes}
                            onChange={() => setIsDetalhes(true)}
                        />
                    </div>
                </div>
            </div>
            {!isDetalhes ? (
                <div className="visao_geral_portal__card-grafico">
                    <GraficoRosca
                        porcentagem={
                            detalhes
                                ? dados.licao_atual.detalhes_aluno[
                                      title === "Presença"
                                          ? "porcentagem"
                                          : title === "Revista"
                                            ? "porcentagem_revista"
                                            : "porcentagem_biblia"
                                  ]
                                : 0
                        }
                    />
                </div>
            ) : (
                <div className="panorama-financeiro__pie-chart">
                    <PanoramaPieChart datas={valores} formatar={false} />
                </div>
            )}
        </div>
    );
};
const COACH_VISAO = [
    {
        mensagem: "Você pode navegar entre as páginas clicando nas opções.",
        id: "nav-bar-portal",
    },
    {
        mensagem: "Você pode clicar aqui para sair da sua conta.",
        id: "botao-sair-coach",
    },
    {
        mensagem: "Você pode alterar o tipo de visualização clicando aqui.",
        id: "visao-geral-detalhes-tipo",
    },
];
const OPTS = ["Presença", "Bíblia", "Revista"];
const Detalhes = ({ dadosMemo }: { dadosMemo: any }) => {
    const [opt, setOpt] = useState(OPTS[0]);
    const [isTimeLine, setIsTimeLine] = useState(true);
    const isMobile = useIsMobile(480);
    const escolha = opt === "Bíblia" ? "trouxe_biblia" : "trouxe_licao";
    return (
        <div className="visao_geral_portal__detalhes">
            <div className="visao_geral_portal__detalhes-header">
                <h2>Histórico</h2>

                <div className="visao_geral_portal__detalhes-opts">
                    <div className="visao_geral_portal__detalhes-opt">
                        <label htmlFor="time-line-opt">
                            <i>
                                <FontAwesomeIcon icon={faEllipsisVertical} />
                            </i>
                        </label>
                        <input
                            type="radio"
                            id="time-line-opt"
                            checked={isTimeLine}
                            onChange={() => setIsTimeLine(true)}
                        />
                    </div>
                    <div
                        className="visao_geral_portal__detalhes-opt"
                        id="visao-geral-detalhes-tipo"
                    >
                        <label htmlFor="table-opt">
                            <i>
                                <FontAwesomeIcon icon={faTableList} />
                            </i>
                        </label>
                        <input
                            type="radio"
                            id="table-opt"
                            checked={!isTimeLine}
                            onChange={() => setIsTimeLine(false)}
                        />
                    </div>
                </div>
            </div>

            <div className="visao_geral_portal__body">
                <div className="visao_geral_portal__body-opts">
                    {OPTS.map((v) => (
                        <div key={v} className="visao_geral_portal__body-opt">
                            <label htmlFor={`input-${v}-detalhes`}>{v}</label>
                            <input
                                type="radio"
                                id={`input-${v}-detalhes`}
                                checked={opt === v}
                                onChange={() => setOpt(v)}
                            />
                        </div>
                    ))}
                </div>

                {isTimeLine ? (
                    <div className="visao_geral_portal__time-line">
                        {Array.from(dadosMemo.dias)
                            .reverse()
                            .map((v: any, i) => (
                                <Fragment key={v.data.toDateString()}>
                                    <div
                                        className={`visao_geral_portal__time-line__infos ${
                                            !v.status?.status
                                                ? "sem-registro"
                                                : opt === "Presença"
                                                  ? v.status.status.replace(
                                                        " ",
                                                        "-",
                                                    )
                                                  : v.status[escolha]
                                                    ? "trouxe"
                                                    : "nao-trouxe"
                                        }`}
                                    >
                                        <div className="visao_geral_portal__time-line__aula">
                                            <span>
                                                Aula:{" "}
                                                {dadosMemo.dias.length - i}
                                            </span>
                                            <p>
                                                {v.data.toLocaleDateString(
                                                    "pt-BR",
                                                )}
                                            </p>
                                        </div>

                                        <div className="visao_geral_portal__time-line__ponto">
                                            {opt === "Presença" ? (
                                                <i>
                                                    {!v.status?.status ? (
                                                        <FontAwesomeIcon
                                                            icon={faClock}
                                                        />
                                                    ) : v.status.status ===
                                                          "Presente" ||
                                                      v.status.status ===
                                                          "Atrasado" ? (
                                                        <FontAwesomeIcon
                                                            icon={faCheck}
                                                        />
                                                    ) : (
                                                        <FontAwesomeIcon
                                                            icon={faXmark}
                                                        />
                                                    )}
                                                </i>
                                            ) : (
                                                <i>
                                                    {!v.status?.status ? (
                                                        <FontAwesomeIcon
                                                            icon={faClock}
                                                        />
                                                    ) : v.status[escolha] ? (
                                                        <FontAwesomeIcon
                                                            icon={faCheck}
                                                        />
                                                    ) : (
                                                        <FontAwesomeIcon
                                                            icon={faXmark}
                                                        />
                                                    )}
                                                </i>
                                            )}
                                        </div>

                                        <div
                                            className={`visao_geral_portal__time-line__status`}
                                        >
                                            {!v.status?.status ? (
                                                <p>Sem registro</p>
                                            ) : opt === "Presença" ? (
                                                <p>{v.status.status}</p>
                                            ) : (
                                                <p>
                                                    {v.status[escolha]
                                                        ? `Trouxe ${opt}`
                                                        : `Não Trouxe ${opt}`}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {i + 1 !== dadosMemo.dias.length && (
                                        <motion.div
                                            className="visao_geral_portal__time-line__linha"
                                            initial={{ height: 0 }}
                                            whileInView={{
                                                height: "2.5rem",
                                            }}
                                            viewport={{
                                                margin: isMobile
                                                    ? "-60px"
                                                    : "-50px",
                                                amount: 0.5,
                                            }}
                                        ></motion.div>
                                    )}
                                </Fragment>
                            ))}
                    </div>
                ) : (
                    <ul className="visao_geral_portal__table">
                        {dadosMemo.dias.map((v: any, i: any) => {
                            return (
                                <li
                                    key={v.data.toDateString()}
                                    className="visao_geral_portal__table__item"
                                >
                                    <div className="visao_geral_portal__table__data">
                                        <span>Aula: {i + 1}</span>
                                        <p>
                                            {v.data.toLocaleDateString("pt-BR")}
                                        </p>
                                    </div>

                                    <motion.div
                                        className="visao_geral_portal__table__linha"
                                        initial={{ width: 0 }}
                                        whileInView={{
                                            width: "100%",
                                        }}
                                        viewport={{
                                            once: false,
                                            margin: "0px",
                                        }}
                                        transition={{ duration: 1 }}
                                    ></motion.div>

                                    {!v.status?.status ? (
                                        <p className="visao_geral_portal__table__sem-registro">
                                            Sem registro
                                        </p>
                                    ) : opt === "Presença" ? (
                                        <p
                                            className={`visao_geral_portal__table__status ${v.status.status.replace(" ", "-")}`}
                                        >
                                            {v.status.status}
                                        </p>
                                    ) : (
                                        <p
                                            className={`visao_geral_portal__table__status ${
                                                v.status[escolha]
                                                    ? "trouxe"
                                                    : "nao-trouxe"
                                            }`}
                                        >
                                            {v.status[escolha]
                                                ? `Trouxe ${opt}`
                                                : `Não Trouxe ${opt}`}
                                        </p>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};
const PortalVisaoGeral = ({ dados }: { dados: ResponseGetPortalAluno }) => {
    const [showCoach, setShowCoach] = useState(false);
    const dadosMemo = useMemo(() => {
        const seteDias = 1000 * 60 * 60 * 24 * 7;
        const diff =
            (dados.licao_atual.data_fim - dados.licao_atual.data_inicio) /
                seteDias +
            1;
        const dias = Array.from({ length: diff }).map((_, i) => {
            const dataInicio = new Date(dados.licao_atual.data_inicio);
            dataInicio.setDate(dataInicio.getDate() + 7 * i);
            const dataStr = dataInicio.toLocaleDateString("pt-BR");

            return {
                data: dataInicio,
                status: dados.licao_atual.chamada[dataStr],
            };
        });

        let ofensivas: any[] = [];
        dias.filter((v) => v?.status).forEach((v) => {
            if (v.status.status !== "Falta")
                ofensivas.push(v.data.toLocaleDateString("pt-BR"));
            else ofensivas = [];
        });

        const dataInicio = new Date(dados.licao_atual.data_inicio);
        const numeroTrimestre = Math.floor(dataInicio.getMonth() / 3) + 1;
        const ano = dataInicio.getFullYear();

        return {
            dias,
            ofensivas,
            trimestre: `${numeroTrimestre}º Trimestre de ${ano}`,
        };
    }, [dados]);

    useEffect(() => {
        const jaViu = JSON.parse(
            localStorage.getItem("ja-viu-visao-geral-coach") || "false",
        );
        if (!jaViu) setShowCoach(true);
    }, []);
    return (
        <div className="visao_geral_portal">
            <CoachMark
                isOpen={showCoach}
                refs={COACH_VISAO}
                onClose={jaViuVisaoGeral}
            />

            {dadosMemo.dias.length ? (
                <>
                    <div className="visao_geral_portal__titulo">
                        <h1>{dados.licao_atual.licaoNome}</h1>

                        <p>{dadosMemo.trimestre}</p>
                    </div>

                    <Ofensiva dadosMemo={dadosMemo} />

                    <div className="visao_geral_portal__cards">
                        <Card dados={dados} title="Presença" />
                        <Card dados={dados} title="Bíblia" />
                        <Card dados={dados} title="Revista" />
                    </div>

                    <Detalhes dadosMemo={dadosMemo} />
                </>
            ) : (
                <div className="visao_geral_portal__vazio">
                    <p>Você não se matriculou na EBD.</p>
                </div>
            )}
        </div>
    );
};

// Histórico
const jaViuHistorico = () => {
    localStorage.setItem("ja-viu-historico-coach", "true");
};
const Trimestre = ({
    indice,
    trimestre,
    onSelected,
}: {
    indice: number;
    trimestre: any;
    onSelected: (licaoId: string) => void;
}) => {
    const isMod2 = indice % 2 === 0;
    return (
        <motion.div
            className="historico_portal__time-line__trimestres-container"
            initial={{ x: isMod2 ? -30 : 30 }}
            animate={{
                x: 0,
                transition: {
                    duration: 0.7,
                    ease: "backInOut",
                    type: "spring",
                },
            }}
            exit={{ scale: 0.8 }}
        >
            <div className="historico_portal__time-line__trimestres-ponto"></div>

            <div
                className={`historico_portal__time-line__trimestres-info ${isMod2 ? "direita" : "esquerda"}`}
            >
                {isMod2 && (
                    <div className="historico_portal__time-line__trimestres-linha"></div>
                )}
                <button
                    key={trimestre.licaoId}
                    onClick={() => {
                        onSelected(trimestre.licaoId);
                    }}
                    id={indice === 0 ? "trimestre-coach" : undefined}
                >
                    <span className="historico_portal__time-line__trimestres-titulo">
                        {trimestre.titulo}
                    </span>
                    <span className="historico_portal__time-line__trimestres-trimestre">{`${trimestre.trimestre}º Trimestre de ${trimestre.ano}`}</span>
                </button>
                {!isMod2 && (
                    <div className="historico_portal__time-line__trimestres-linha"></div>
                )}
            </div>
        </motion.div>
    );
};
const Ano = React.memo(
    ({
        ano,
        trimestres,
        indice,
        onSelected,
        open = false,
    }: {
        indice: number;
        ano: any;
        trimestres: (HistoricoPortalInterface & { trimestre: number })[];
        open?: boolean;
        onSelected: (licaoId: string) => void;
    }) => {
        const [isOpen, setIsOpen] = useState(open);

        return (
            <div className="historico_portal__time-line__ano" id={`ano${ano}`}>
                <div className="historico_portal__time-line__ano-header">
                    {indice % 2 === 0 && (
                        <div className="historico_portal__time-line__ano-header-info direita">
                            <h3>{ano}</h3>
                            <div className="historico_portal__time-line__ano-linha"></div>
                        </div>
                    )}

                    <motion.button
                        className={`historico_portal__time-line__ano-ponto`}
                        initial={{ rotate: 0 }}
                        animate={isOpen ? { rotate: 45 } : { rotate: 0 }}
                        whileHover={
                            isOpen
                                ? { scale: 1.09, backgroundColor: "#ef4444" }
                                : { scale: 1.09 }
                        }
                        whileTap={
                            isOpen
                                ? { scale: 1, backgroundColor: "#ef4444" }
                                : { scale: 1 }
                        }
                        onTap={() => setIsOpen((v) => !v)}
                    >
                        <i id={indice === 0 ? "ano-coach" : undefined}>
                            <FontAwesomeIcon icon={faPlus} />
                        </i>
                    </motion.button>

                    {indice % 2 !== 0 && (
                        <div className="historico_portal__time-line__ano-header-info esquerda">
                            <div className="historico_portal__time-line__ano-linha"></div>
                            <h3>{ano}</h3>
                        </div>
                    )}
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: "hidden" }}
                        >
                            <div className="historico_portal__time-line__trimestres">
                                {trimestres
                                    .sort((a, b) => b.trimestre - a.trimestre)
                                    .map((v, i) => (
                                        <Trimestre
                                            indice={i + indice}
                                            trimestre={v}
                                            key={v.licaoId}
                                            onSelected={onSelected}
                                        />
                                    ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    },
);
const PortalHistorico = ({ dados }: { dados: ResponseGetPortalAluno }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showCoach, setShowCoach] = useState(false);
    const [currentYear, setCurrentYear] = useState<string | null>(null);
    const [currentDados, setCurrentDados] =
        useState<ResponseGetPortalAluno | null>(null);
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

    const dadosMemo = useMemo(() => {
        const anosMap = new Map();

        const anosSet = new Set(
            Object.values(dados.historico).map((v) => {
                const anoLista = anosMap.get(v.ano) || [];
                const item = {
                    ...v,
                    trimestre:
                        Math.floor(new Date(v.data_inicio).getMonth() / 3) + 1,
                };
                anoLista.push(item);

                anosMap.set(v.ano, anoLista);
                return v.ano;
            }),
        );
        const anos = Array.from(anosSet.values())
            .sort((a, b) => b - a)
            .map((v) => ({
                nome: String(v),
                id: String(v),
            }));
        const trimestres = Array.from(anosMap.entries()).sort(
            (a, b) => b[0] - a[0],
        );

        return { anos, trimestres };
    }, [dados]);

    const { igrejaHash, alunoHash } = useParams();

    const getDados = useCallback(async (licaoId: string) => {
        const [seconds, nanoseconds] = Object.values(dados.data_nascimento);

        setIsLoading(true);
        try {
            const { data } = await getPortalAluno({
                alunoId: dados.alunoId,
                licaoId,
                igrejaHash,
                alunoHash,
                dataNascimento: new Timestamp(seconds, nanoseconds)
                    .toDate()
                    .toLocaleDateString("pt-BR"),
            });
            const response = data as ResponseGetPortalAluno;
            setCurrentDados(response);
        } catch (error: any) {
            setMensagem({
                title: "Dados invalidos",
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
    }, []);

    useEffect(() => {
        if (!currentYear)
            setCurrentYear(dadosMemo.anos?.[0] ? dadosMemo.anos[0].id : null);
        else {
            const el = document.getElementById(`ano${currentYear}`);
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }, [currentYear]);
    useEffect(() => {
        const jaViu = JSON.parse(
            localStorage.getItem("ja-viu-historico-coach") || "false",
        );
        if (!jaViu && dadosMemo?.anos?.length) {
            setShowCoach(true);
        }
    }, []);
    return (
        <>
            <CoachMark
                isOpen={showCoach}
                refs={[
                    {
                        id: "ano-coach",
                        mensagem:
                            "Você pode clicar aqui para expandir os trimestres.",
                    },
                    {
                        id: "trimestre-coach",
                        mensagem: "Você pode clicar no item para ver os dados.",
                    },
                    {
                        id: "trimestre-coach",
                        mensagem: "Você pode clicar no item para ver os dados.",
                    },
                    {
                        id: "historico-dropdown-coach",
                        mensagem:
                            "Use o filtro para navegar e visualizar um ano específico.",
                    },
                ]}
                onClose={jaViuHistorico}
            />
            <div className="historico_portal">
                {currentDados ? (
                    <div className="historico_portal__voltar">
                        <button
                            onClick={() => {
                                setCurrentDados(null);
                            }}
                        >
                            <i>
                                <FontAwesomeIcon icon={faArrowLeft} />
                            </i>
                            <span>Voltar para linha do tempo</span>
                        </button>
                    </div>
                ) : (
                    <></>
                )}
                <LoadingModal isEnviando={isLoading} mensagem="carregando" />
                {currentDados ? (
                    <PortalVisaoGeral dados={currentDados} />
                ) : (
                    <>
                        <div className="historico_portal__title">
                            <h2>Histórico</h2>

                            <div
                                className="historico_portal__dropdown"
                                id="historico-dropdown-coach"
                            >
                                <p>Ano</p>
                                <Dropdown
                                    current={currentYear}
                                    lista={dadosMemo.anos}
                                    onSelect={(v) => setCurrentYear(v?.nome!)}
                                    isAll={false}
                                    selectId={currentYear!}
                                />
                            </div>
                        </div>

                        {dadosMemo.trimestres.length ? (
                            <div className="historico_portal__time-line">
                                {dadosMemo.trimestres.map(
                                    ([ano, trimestres], i) => (
                                        <Ano
                                            ano={ano}
                                            indice={i}
                                            trimestres={trimestres}
                                            key={ano}
                                            open={i === 0}
                                            onSelected={getDados}
                                        />
                                    ),
                                )}
                            </div>
                        ) : (
                            <div className="visao_geral_portal__vazio">
                                <p>Sem registros.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
};

//Troféus
const jaViuTrofeus = () => {
    localStorage.setItem("ja-viu-trofeus-coach", "true");
};
const RARIDADES = [
    { nome: "Comum", id: "comum" },
    { nome: "Rara", id: "rara" },
    { nome: "Épica", id: "epica" },
    { nome: "Lendária", id: "lendaria" },
    { nome: "Única", id: "unica" },
];
const TrofeuModal = ({
    conquista,
    onClose,
}: {
    conquista: ConquistaInterface;
    onClose: () => void;
}) => {
    const { raridade, multiplicador, titulo, descricao, tipo, detalhes, icon } =
        conquista;
    return (
        <div className="trofeus_portal__modal-overlay" onClick={onClose}>
            <motion.div
                className={`trofeus_portal__modal ${raridade}`}
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                key={"modal-trofeu-div"}
                onClick={(v) => v.stopPropagation()}
            >
                <div className="trofeus_portal__modal__header">
                    <div className="trofeus_portal__modal__icon">
                        <i>
                            <FontAwesomeIcon icon={TROFEUS[icon] || faTrophy} />
                        </i>
                    </div>

                    <div className="trofeus_portal__modal__raridade">
                        <i>
                            {raridade === "unica" ? (
                                <FontAwesomeIcon icon={faGem} />
                            ) : raridade === "lendaria" ||
                              raridade === "epica" ? (
                                <FontAwesomeIcon icon={faCrown} />
                            ) : (
                                <FontAwesomeIcon icon={faMedal} />
                            )}
                        </i>
                        <p>{conquista.raridade}</p>
                    </div>

                    <div className="trofeus_portal__modal__multiplicador">
                        <i>Conquistado: </i>
                        <p>x{multiplicador}</p>
                    </div>

                    <motion.button
                        className="trofeus_portal__modal__close"
                        whileTap={{ rotate: 45, color: "#ef4444" }}
                        onTap={onClose}
                    >
                        <i>
                            <FontAwesomeIcon icon={faX} />
                        </i>
                    </motion.button>
                </div>

                <div className="trofeus_portal__modal__body">
                    <h2>{titulo}</h2>

                    <div className="trofeus_portal__modal__desc">
                        <p>Descrição:</p>
                        <h3>{descricao}</h3>
                    </div>

                    <div className={`trofeus_portal__modal__tipo ${tipo}`}>
                        <i>
                            {tipo === "manual" ? (
                                <FontAwesomeIcon icon={faGear} />
                            ) : (
                                <FontAwesomeIcon icon={faBolt} />
                            )}
                        </i>
                        <p>{tipo}</p>
                    </div>
                </div>

                <div className="trofeus_portal__modal__footer">
                    <h2>Detalhes</h2>

                    <div className="trofeus_portal__modal__detalhes">
                        {Object.values(detalhes).map((v) => (
                            <div
                                key={v.licaoId}
                                className="trofeus_portal__modal__detalhe"
                            >
                                <div className="trofeus_portal__modal__data">
                                    <i>
                                        <FontAwesomeIcon
                                            icon={faCalendarDays}
                                        />
                                    </i>
                                    <data
                                        value={new Date(
                                            v.data,
                                        ).toLocaleDateString("pt-BR")}
                                    >
                                        {new Date(v.data).toLocaleDateString(
                                            "pt-BR",
                                        )}
                                    </data>
                                </div>

                                <div className="trofeus_portal__modal__classe">
                                    <span>Classe</span>
                                    <p>{v.classeNome}</p>
                                </div>

                                <div className="trofeus_portal__modal__infos">
                                    <span>{v.trimestre}</span>
                                    <p>{v.licaoNome}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
const TrofeusPortal = ({ dados }: { dados: ResponseGetPortalAluno }) => {
    const [filtro, setFiltro] = useState("");
    const [showCoach, setShowCoach] = useState(false);
    const [currentTrofeu, setCurrentTrofeu] =
        useState<ConquistaInterface | null>(null);

    const fecharTrofeu = useCallback(() => {
        setCurrentTrofeu(null);
    }, []);
    const dadosMemo = useMemo(() => {
        let conquistas = Object.entries(dados.conquistas)
            .map(([id, v]) => ({ id, ...v }))
            .sort((a, b) => {
                if (a.tipo === "manual") return -1;
                if (b.tipo === "manual") return 1;

                if (a.raridade === "lendaria") return -1;
                if (b.raridade === "lendaria") return 1;

                if (a.raridade === "epica") return -1;
                if (b.raridade === "epica") return 1;

                if (a.raridade === "rara") return -1;
                if (b.raridade === "rara") return 1;

                if (a.raridade === "comum") return -1;
                if (b.raridade === "comum") return 1;

                return 0;
            });

        const raridadesObj: any = {};
        RARIDADES.forEach((v) => {
            raridadesObj[v.id] = conquistas.filter((c) => c.raridade === v.id);
        });
        const todos = Object.entries(raridadesObj).reverse();
        const totalLicoes = Object.keys(dados.historico).length;

        return { trofeus: todos, conquistas, totalLicoes, raridadesObj };
    }, [dados]);

    useEffect(() => {
        const jaViu = JSON.parse(
            localStorage.getItem("ja-viu-trofeus-coach") || "false",
        );
        if (dadosMemo.conquistas.length && !jaViu) {
            setShowCoach(true);
        }
    }, []);
    return (
        <>
            <CoachMark
                isOpen={showCoach}
                refs={[
                    {
                        id: "trofeu-coach",
                        mensagem: "Clique no troféu para ver os detalhes.",
                    },
                ]}
                onClose={jaViuTrofeus}
            />
            <div className="trofeus_portal">
                <div className="trofeus_portal__header">
                    <h2>
                        <i>
                            <FontAwesomeIcon icon={faTrophy} />
                        </i>
                        <span>Troféus</span>
                    </h2>
                </div>

                <div className="trofeus_portal__body">
                    <div className="trofeus_portal__cards">
                        <div className={`trofeus_portal__cards-infos`}>
                            <div
                                className={`trofeus_portal__card licoes-total`}
                            >
                                <p>
                                    <i>
                                        <FontAwesomeIcon icon={faBookmark} />
                                    </i>
                                    {dadosMemo.totalLicoes}
                                </p>
                                <span>Total de revistas</span>
                            </div>
                            <div
                                className={`trofeus_portal__card trofeus-total`}
                            >
                                <p>
                                    <i>
                                        <FontAwesomeIcon icon={faTrophy} />
                                    </i>
                                    {dadosMemo.conquistas.length}
                                </p>
                                <span>Total de troféus</span>
                            </div>
                        </div>

                        <motion.div
                            className="trofeus_portal__quantidades"
                            variants={formVariants}
                            initial="initial"
                            animate="animate"
                        >
                            {dadosMemo.trofeus.map(([key, lista]: any) => (
                                <motion.div
                                    key={key}
                                    className={`trofeus_portal__card ${key}`}
                                    variants={inputVariants}
                                >
                                    <i>
                                        <FontAwesomeIcon icon={faTrophy} />
                                    </i>
                                    <p>{lista.length}</p>
                                </motion.div>
                            ))}
                        </motion.div>
                    </div>

                    <hr />

                    <div className="trofeus_portal__trofeus">
                        <div className="trofeus_portal__filtro">
                            <div className="trofeus_portal__dropdown">
                                <p>Filtrar:</p>
                                <Dropdown
                                    lista={RARIDADES}
                                    current={
                                        RARIDADES.find((v) => v.id === filtro)
                                            ?.nome || ""
                                    }
                                    isAll
                                    onSelect={(v) => setFiltro(v?.id!)}
                                    selectId={filtro}
                                />
                            </div>
                        </div>
                        <div className="trofeus_portal__grid">
                            {filtro
                                ? dadosMemo.raridadesObj[filtro].map(
                                      (v: any) => (
                                          <div
                                              key={v.titulo}
                                              className={`trofeus_portal__item ${v.raridade}`}
                                              onClick={() =>
                                                  setCurrentTrofeu(v)
                                              }
                                          >
                                              <i>
                                                  <FontAwesomeIcon
                                                      icon={
                                                          TROFEUS?.[v.icon] ||
                                                          faTrophy
                                                      }
                                                  />
                                              </i>

                                              <p>{v.titulo}</p>

                                              <span>{v.multiplicador}</span>
                                          </div>
                                      ),
                                  )
                                : dadosMemo.conquistas.map((v, i) => (
                                      <div
                                          key={v.titulo}
                                          className={`trofeus_portal__item ${v.raridade}`}
                                          onClick={() => setCurrentTrofeu(v)}
                                          id={
                                              i === 0
                                                  ? "trofeu-coach"
                                                  : undefined
                                          }
                                      >
                                          <i>
                                              <FontAwesomeIcon
                                                  icon={
                                                      TROFEUS?.[v.icon] ||
                                                      faTrophy
                                                  }
                                              />
                                          </i>
                                          <p>{v.titulo}</p>
                                          <span>x{v.multiplicador}</span>
                                      </div>
                                  ))}
                            {(filtro &&
                                !dadosMemo.raridadesObj[filtro].length) ||
                            !dadosMemo.conquistas.length ? (
                                <div className="trofeus_portal__vazio">
                                    <p>Não foi encontrado nenhum troféu</p>
                                </div>
                            ) : (
                                <></>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {!!currentTrofeu && (
                    <TrofeuModal
                        conquista={currentTrofeu}
                        onClose={fecharTrofeu}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

const PortalAlunoDados = React.memo(
    ({
        dados,
        alunoId,
        sair,
    }: {
        dados: ResponseGetPortalAluno;
        alunoId?: string;
        sair: () => void;
    }) => {
        const [currentOpt, setCurrentOpt] = useState<
            "visao-geral" | "conquistas" | "historia"
        >("visao-geral");
        const { user } = useAuthContext();
        const navigate = useNavigate();
        const selectOption = useCallback((currentOpt: string) => {
            setCurrentOpt(currentOpt as any);
        }, []);

        return (
            <div className="portal_aluno__dados">
                <div className="portal_aluno__header">
                    <motion.div
                        className="portal_aluno__infos"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0 }}
                        style={{ overflow: "hidden" }}
                        transition={{ delay: 0.3 }}
                    >
                        <div className="portal_aluno__logo">
                            <img
                                src="/logo-atualizada.svg"
                                alt="Logo Dominicando"
                            />
                        </div>

                        <AnimatePresence>
                            <p>Olá, {dados.nome}</p>
                        </AnimatePresence>
                    </motion.div>

                    {!alunoId && (
                        <div className="portal_aluno__actions">
                            {user && (
                                <div className="portal_aluno__ir_para_usuario">
                                    <button
                                        onClick={() => navigate("/dashboard")}
                                    >
                                        <i>
                                            <FontAwesomeIcon
                                                icon={faChartSimple}
                                            />
                                        </i>
                                        <span>Gestão EBD</span>
                                    </button>
                                </div>
                            )}

                            <div
                                className="portal_aluno__sair"
                                id="botao-sair-coach"
                            >
                                <button onClick={sair}>
                                    <i>
                                        <FontAwesomeIcon
                                            icon={faRightFromBracket}
                                        />
                                    </i>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <PortalAlunoOpcoes onSelectOption={selectOption} />
                {currentOpt === "visao-geral" ? (
                    <PortalVisaoGeral dados={dados} />
                ) : currentOpt === "historia" ? (
                    <PortalHistorico dados={dados} />
                ) : (
                    <TrofeusPortal dados={dados} />
                )}
            </div>
        );
    },
);
const PortalAlunoLogin = ({
    alunoId,
    onLogin,
}: {
    alunoId?: string;
    onLogin: (v: any) => void;
}) => {
    const [isLoading, setIsLoading] = useState(true);
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

    const { igrejaHash, alunoHash } = useParams();

    const methods = useForm<PortalAlunoLogin>({
        defaultValues: { manterConectado: true },
    });
    const {
        handleSubmit,
        register,
        setFocus,
        formState: { errors },
    } = methods;

    const onSubmit = async (v: PortalAlunoLogin) => {
        setIsLoading(true);

        try {
            const dataNascimento = new Date(
                `${v.ano}-${v.mes}-${v.dia}T12:00:00`,
            ).toLocaleDateString("pt-BR");

            const { data } = await getPortalAluno({
                dataNascimento,
                igrejaHash,
                alunoHash,
            });

            if (v.manterConectado) {
                localStorage.setItem(
                    `data-${igrejaHash}-${alunoHash}`,
                    dataNascimento,
                );
            }

            onLogin(data);
        } catch (error: any) {
            setMensagem({
                title: "Erro ao acessar portal",
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

    useEffect(() => {
        if (alunoId) {
            getPortalAluno({ alunoId })
                .then(({ data }) => {
                    onLogin(data);
                })
                .catch((error: any) => {
                    setMensagem({
                        title: "Erro ao acessar portal",
                        message: error.message,
                        onClose: () => setMensagem(null),
                        onConfirm: () => setMensagem(null),
                        onCancel: () => setMensagem(null),
                        cancelText: "Cancelar",
                        confirmText: "Ok",
                        icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
                    });
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            const data = localStorage.getItem(
                `data-${igrejaHash}-${alunoHash}`,
            );
            if (data) {
                getPortalAluno({ dataNascimento: data, alunoHash, igrejaHash })
                    .then(({ data }) => {
                        onLogin(data);
                    })
                    .catch((error: any) => {
                        setMensagem({
                            title: "Erro ao acessar portal",
                            message: error.message,
                            onClose: () => setMensagem(null),
                            onConfirm: () => setMensagem(null),
                            onCancel: () => setMensagem(null),
                            cancelText: "Cancelar",
                            confirmText: "Ok",
                            icon: (
                                <FontAwesomeIcon icon={faTriangleExclamation} />
                            ),
                        });
                    })
                    .finally(() => {
                        setIsLoading(false);
                    });
            } else setIsLoading(false);
        }
    }, [alunoId]);
    if (isLoading) return <Loading />;
    return (
        <>
            <motion.div
                className="portal_aluno__login"
                variants={formVariants}
                initial="initial"
                animate="animate"
                exit="exit"
            >
                <h1>Sua Data de Nascimento</h1>

                <FormProvider {...methods}>
                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className="portal_aluno__form"
                    >
                        <div className="portal_aluno__inputs">
                            <div className="portal_aluno__data">
                                <motion.div
                                    className="portal_aluno__input"
                                    variants={inputVariants}
                                >
                                    <motion.input
                                        className={
                                            errors.dia?.message ? "error" : ""
                                        }
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="DD"
                                        {...register("dia", {
                                            onChange: (v) => {
                                                const value = v.target.value;
                                                if (value.length === 2)
                                                    setFocus("mes");
                                            },
                                            maxLength: 2,
                                            required: "A data é obrigatória",
                                            validate: (v) => {
                                                const value = Number(v);
                                                return !isNaN(value) &&
                                                    value > 0 &&
                                                    value <= 31
                                                    ? true
                                                    : "Valor Inválido";
                                            },
                                        })}
                                        id="dia"
                                    />
                                </motion.div>

                                <p>/</p>

                                <motion.div
                                    className="portal_aluno__input"
                                    variants={inputVariants}
                                >
                                    <motion.input
                                        className={
                                            errors.mes?.message ? "error" : ""
                                        }
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="MM"
                                        {...register("mes", {
                                            onChange: (v) => {
                                                const value = v.target.value;
                                                if (value.length === 2)
                                                    setFocus("ano");
                                            },
                                            maxLength: 2,
                                            required: "A data é obrigatória",
                                            validate: (v) => {
                                                const value = Number(v);
                                                return !isNaN(value) &&
                                                    value > 0 &&
                                                    value <= 12
                                                    ? true
                                                    : "Valor Inválido";
                                            },
                                        })}
                                        id="mes"
                                    />
                                </motion.div>

                                <p>/</p>

                                <motion.div
                                    className="portal_aluno__input"
                                    variants={inputVariants}
                                >
                                    <motion.input
                                        className={
                                            errors.ano?.message ? "error" : ""
                                        }
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="AAAA"
                                        {...register("ano", {
                                            maxLength: 4,
                                            required: "A data é obrigatória",
                                            onChange: (v) => {
                                                const value = v.target.value;

                                                if (value.length === 4)
                                                    setFocus("manterConectado");
                                            },
                                            validate: (v) => {
                                                const value = Number(v);

                                                return !isNaN(value) &&
                                                    value.toString().length ===
                                                        4
                                                    ? true
                                                    : "Valor Inválido";
                                            },
                                        })}
                                        id="ano"
                                    />
                                </motion.div>
                            </div>

                            <div className="portal_aluno__manter">
                                <input
                                    type="checkbox"
                                    id="manter-conectado"
                                    {...register("manterConectado")}
                                />
                                <label htmlFor="manter-conectado">
                                    Manter-me conectado
                                </label>
                            </div>
                        </div>

                        <motion.div
                            className="portal_aluno__buttons"
                            variants={inputVariants}
                        >
                            <motion.button
                                type="submit"
                                whileFocus={{ scale: 1.1 }}
                                whileTap={{ scale: 1 }}
                            >
                                <span>Acessar Portal</span>
                                <i>
                                    <FontAwesomeIcon icon={faRightToBracket} />
                                </i>
                            </motion.button>
                        </motion.div>
                    </form>
                </FormProvider>
            </motion.div>

            <AlertModal isOpen={!!mensagem} {...mensagem!} />
        </>
    );
};

function PortalAluno({ alunoId }: { alunoId?: string }) {
    const [response, setResponse] = useState<any | null>(null);
    const { igrejaHash, alunoHash } = useParams();
    const getDados = useCallback((v: ResponseGetPortalAluno) => {
        setResponse(v);
    }, []);
    const sairPortal = useCallback(() => {
        localStorage.removeItem(`data-${igrejaHash}-${alunoHash}`);
        setResponse(null);
    }, []);

    return (
        <div className="portal_aluno">
            {!response ? (
                <PortalAlunoLogin onLogin={getDados} alunoId={alunoId} />
            ) : (
                <PortalAlunoDados
                    dados={response}
                    alunoId={alunoId}
                    sair={sairPortal}
                />
            )}
        </div>
    );
}

export default PortalAluno;
