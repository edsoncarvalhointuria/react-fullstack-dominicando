import { getFunctions, httpsCallable } from "firebase/functions";
import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type {
    ChamadaChacheLicao,
    DetalhesAlunoCacheLicao,
} from "../../interfaces/CacheLicaoInterface";
import { AcordeaoAluno, Detalhes } from "../ui/PanoramaLicao";
import SearchInput from "../ui/SearchInput";
import { AnimatePresence, motion } from "framer-motion";
import { Timestamp } from "firebase/firestore";
import AlertModal from "../ui/AlertModal";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faAward,
    faMedal,
    faStar,
    faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import Loading from "../layout/loading/Loading";
import "./ranking.scss";

const functions = getFunctions();
const pegarRankingPublico = httpsCallable(functions, "pegarRankingPublico");

interface RankingPublico {
    detalhes_aulas: { [data: string]: { chamada: ChamadaChacheLicao } };
    detalhes_aluno: { [alunoId: string]: DetalhesAlunoCacheLicao };
    lista_aulas: {
        numero: number;
        data: Timestamp;
        aulaRegistrada: { realizada: any };
    }[];
}

const RankingPodio = React.memo(
    ({ position, list }: { position: 1 | 2 | 3; list: any[] }) => {
        const [show, setShow] = useState(false);
        const porcentagem =
            position === 1 ? "90%" : position === 2 ? "65%" : "40%";
        return (
            <motion.div
                className={`ranking-podio posicao-${position}`}
                onHoverStart={() => setShow(true)}
                onHoverEnd={() => setShow(false)}
                onTap={() => setShow((v) => !v)}
            >
                <div className="ranking-posicao">
                    <span>
                        {position === 1 ? (
                            <FontAwesomeIcon icon={faMedal} />
                        ) : (
                            <FontAwesomeIcon icon={faAward} />
                        )}
                    </span>

                    <p>{list.length === 1 ? list[0] : `${list.length}+`}</p>
                </div>
                <motion.div
                    initial={{
                        width: "10rem",
                        height: 0,
                    }}
                    animate={{ height: porcentagem }}
                    transition={{ duration: 1 }}
                    className="ranking-barra"
                >
                    {position}
                </motion.div>

                <AnimatePresence>
                    {show && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="ranking-podio__pessoas"
                            style={{ bottom: list.length > 4 ? "-50%" : "" }}
                        >
                            <h3>
                                Posição <span>{position}</span>
                            </h3>

                            <div className="ranking-podio__lista-pessoas">
                                {list.map((v, i) => (
                                    <div
                                        className="ranking-podio__pessoa"
                                        key={i}
                                    >
                                        <span>
                                            <FontAwesomeIcon icon={faStar} />
                                        </span>
                                        <p>{v}</p>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    },
);

function Ranking() {
    const [isLoading, setIsLoading] = useState(true);
    const [opt, setOpt] = useState<"chamada" | "revista" | "biblia">("chamada");
    const [alunos, setAlunos] = useState<DetalhesAlunoCacheLicao[]>([]);
    const [listaAulas, setListaAulas] = useState<
        {
            numero: number;
            data: Date;
            aulaRegistrada: { realizada: any } | null;
        }[]
    >([]);
    const [diasMap, setDiasMap] = useState<
        Map<string, { chamada: ChamadaChacheLicao }>
    >(new Map());
    const [detalhes, setDetalhes] = useState<any>(null);
    const [pesquisa, setPesquisa] = useState("");
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

    const { igrejaId, licaoId } = useParams();
    const navigate = useNavigate();

    const alunosMemo = useMemo(() => {
        let a = alunos;
        if (!a.length) return [];

        a = alunos.filter((v) => v.nome?.toLowerCase().includes(pesquisa));

        return a.sort(
            (a, b) =>
                (b as any)[`porcentagem${opt === "chamada" ? "" : `_${opt}`}`] -
                (a as any)[`porcentagem${opt === "chamada" ? "" : `_${opt}`}`],
        );
    }, [alunos, pesquisa, opt]);
    const posicoesMemo = useMemo(() => {
        const lista = { 1: [], 2: [], 3: [] };
        if (!alunos.length) return lista;

        const alunosMap = new Map();

        alunos.forEach((v) => {
            const porcentagem = (v as any)[
                `porcentagem${opt === "chamada" ? "" : `_${opt}`}`
            ];

            const lista = alunosMap.get(porcentagem) || [];
            alunosMap.set(porcentagem, [...lista, v.nome]);
        });

        const listaRanking = Array.from(alunosMap).sort((a: any, b: any) => {
            return b[0] - a[0];
        });

        lista[1] = listaRanking[0]?.[1] || [];
        lista[2] = listaRanking[1]?.[1] || [];
        lista[3] = listaRanking[2]?.[1] || [];

        return lista;
    }, [alunos, opt]);

    useEffect(() => {
        if (!igrejaId || !licaoId) return;
        const cacheItem = JSON.parse(
            localStorage.getItem("ranking_cache") || "null",
        );

        if (
            cacheItem &&
            cacheItem.data === new Date().toLocaleDateString("pt-BR") &&
            cacheItem.igrejaId === igrejaId &&
            cacheItem.licaoId === licaoId
        ) {
            const ranking = cacheItem.obj as RankingPublico;

            setAlunos(Object.values(ranking.detalhes_aluno));
            setDiasMap(new Map(Object.entries(ranking.detalhes_aulas)));
            setListaAulas(
                ranking.lista_aulas.map((v) => ({
                    ...v,
                    data: new Timestamp(
                        (v.data as any)["_seconds"],
                        (v.data as any)["_nanoseconds"],
                    ).toDate(),
                })),
            );

            setIsLoading(false);

            return;
        }

        const pegarRanking = async () => {
            const { data } = await pegarRankingPublico({ igrejaId, licaoId });
            const obj = data as RankingPublico;
            const { detalhes_aluno, detalhes_aulas, lista_aulas } = obj;
            setAlunos(Object.values(detalhes_aluno));
            setDiasMap(new Map(Object.entries(detalhes_aulas)));
            setListaAulas(
                lista_aulas.map((v) => ({
                    ...v,
                    data: new Timestamp(
                        (v.data as any)["_seconds"],
                        (v.data as any)["_nanoseconds"],
                    ).toDate(),
                })),
            );

            localStorage.setItem(
                "ranking_cache",
                JSON.stringify({
                    data: new Date().toLocaleDateString("pt-BR"),
                    igrejaId,
                    licaoId,
                    obj,
                }),
            );

            setIsLoading(false);
        };

        pegarRanking().catch((error: any) => {
            console.log("deu esse erro", error);
            setMensagem({
                title: "Erro ao pegar dados",
                message: error.message,
                onClose: () => navigate("/"),
                onConfirm: () => navigate("/"),
                onCancel: () => navigate("/"),
                cancelText: "Cancelar",
                confirmText: "Ok",
                icon: <FontAwesomeIcon icon={faTriangleExclamation} />,
            });
        });
    }, [igrejaId, licaoId]);

    return (
        <>
            {isLoading ? (
                <Loading />
            ) : (
                <>
                    <div className="ranking">
                        <div className="panorama-licao__lista-alunos">
                            <h2>Frequência Alunos</h2>
                            <div className="ranking-container">
                                <RankingPodio
                                    position={2}
                                    list={posicoesMemo["2"]}
                                />
                                <RankingPodio
                                    position={1}
                                    list={posicoesMemo["1"]}
                                />
                                <RankingPodio
                                    position={3}
                                    list={posicoesMemo["3"]}
                                />
                            </div>
                            <div className="panorama-licao__lista-alunos-header">
                                <div className="panorama-licao__lista-alunos-header--container">
                                    <SearchInput
                                        onSearch={setPesquisa}
                                        texto="Aluno"
                                    />
                                </div>
                            </div>

                            <div className="panorama-licao__opcoes">
                                <div className="panorama-licao__opcoes-check">
                                    <input
                                        defaultChecked={true}
                                        type="radio"
                                        name="opcoes"
                                        id="chamada"
                                        onChange={() => setOpt("chamada")}
                                    />
                                    <label htmlFor="chamada">Chamada</label>
                                </div>

                                <div className="panorama-licao__opcoes-check">
                                    <input
                                        type="radio"
                                        name="opcoes"
                                        id="licao"
                                        onChange={() => setOpt("revista")}
                                    />
                                    <label htmlFor="licao">Lições</label>
                                </div>

                                <div className="panorama-licao__opcoes-check">
                                    <input
                                        type="radio"
                                        name="opcoes"
                                        id="biblia"
                                        onChange={() => setOpt("biblia")}
                                    />
                                    <label htmlFor="biblia">Bíblias</label>
                                </div>
                            </div>

                            {alunosMemo.map((aluno) => (
                                <AcordeaoAluno
                                    key={aluno.id}
                                    aluno={aluno}
                                    verDetalhes={() => setDetalhes(aluno)}
                                    opt={opt}
                                />
                            ))}
                        </div>
                    </div>

                    <AnimatePresence>
                        {detalhes && (
                            <Detalhes
                                aluno={detalhes}
                                onClose={() => setDetalhes(null)}
                                opt={opt}
                                key={"detalhes-aluno"}
                                aulas={listaAulas as any}
                                diasMap={diasMap as any}
                            />
                        )}
                    </AnimatePresence>

                    <AlertModal
                        key={"mensagem-alert-modal-ranking"}
                        isOpen={!!mensagem}
                        {...mensagem!}
                    />
                </>
            )}
        </>
    );
}

export default Ranking;
