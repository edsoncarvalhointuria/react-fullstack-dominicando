import { useEffect, useState } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import Loading from "../../layout/loading/Loading";
import SelectionGrid from "../../layout/selection_grid/SelectionGrid";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBan,
    faCalendarDay,
    faGripLines,
    faUndo,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import "./relatorio-dominical.scss";
import useDebounce from "../../../hooks/useDebounce";
import { getFunctions, httpsCallable } from "firebase/functions";
import RelatorioLeitura from "./RelatorioLeitura";
import type { ResponseGetRelatorioDominical } from "../../../interfaces/ResponseGetRelatorioDominical";
import CadastroIgrejaModal from "../../ui/CadastroIgrejaModal";

const functions = getFunctions();
const getRelatorioDominical = httpsCallable(functions, "getRelatorioDominical");

function RelatorioDominical() {
    const [isLoading, setIsLoading] = useState(true);
    const [domingo, setDomingo] = useState<Date | null>(null);
    const [registros, setRegistros] =
        useState<ResponseGetRelatorioDominical | null>(null);

    const [showRelatorio, setShowRelatorio] = useState(false);
    const [filaClasses, setFilaClasses] = useState<ClasseInterface[]>([]);
    const [classesExcluidas, setClassesExcluidas] = useState<ClasseInterface[]>(
        []
    );

    const { isSuperAdmin, user, isSecretario } = useAuthContext();
    const { igrejas, isLoadingData, classes, refetchData } = useDataContext();
    let { igrejaId } = useParams();
    const navigate = useNavigate();
    const domingoDebounce = useDebounce(domingo, 1000);

    const excluirClasse = (classe: ClasseInterface) => {
        console.log("executando");

        setFilaClasses((v) => v.filter((c) => c.id !== classe.id));
        setClassesExcluidas((v) => [...v, classe]);
    };

    const restaurarClasse = (classe: ClasseInterface) => {
        setClassesExcluidas((v) => v.filter((c) => c.id !== classe.id));
        setFilaClasses((v) => [...v, classe]);
    };

    useEffect(() => {
        if (domingoDebounce && igrejaId && classes.length) {
            setIsLoading(true);
            getRelatorioDominical({
                data: domingoDebounce.toISOString().split("T")[0],
                classes: classes
                    .filter((v) => v.igrejaId === igrejaId)
                    .map((v) => v.id),
                igrejaId,
            })
                .then((data) => {
                    const datas = data.data as ResponseGetRelatorioDominical;
                    if (isSecretario.current)
                        setFilaClasses(
                            datas.classes_relatorio.filter(
                                (v) => v.id === user?.classeId
                            )
                        );
                    else
                        setFilaClasses(
                            datas.classes_relatorio.sort((a, b) =>
                                a.nome.localeCompare(b.nome)
                            )
                        );
                    setRegistros(datas);
                })
                .catch((err) => console.log("deu esse erro", err))
                .finally(() => setIsLoading(false));
        }
    }, [domingoDebounce, igrejaId, classes]);

    useEffect(() => {
        const getDomingo = () => {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dia = hoje.getUTCDay();

            hoje.setUTCDate(hoje.getUTCDate() - dia);

            return hoje;
        };

        setDomingo(getDomingo());
    }, []);

    // Admin e secretarios
    if (!isSuperAdmin.current && igrejaId)
        return <Navigate to="/relatorios/dominical" />;
    else if (!isSuperAdmin.current && !igrejaId && igrejas.length)
        igrejaId = user!.igrejaId!;

    // Super Admins
    if (isSuperAdmin.current && !igrejaId && igrejas.length)
        return (
            <SelectionGrid
                opcoes={igrejas}
                titulo="Igreja"
                onSelect={(id: string) => navigate(id)}
                renderAddModal={(onClose: () => void) => (
                    <CadastroIgrejaModal
                        onCancel={() => onClose()}
                        onSave={() => {
                            refetchData();
                        }}
                    />
                )}
            />
        );
    else if (
        isSuperAdmin.current &&
        igrejaId &&
        igrejas.length &&
        !igrejas.find((v) => v.id === igrejaId)
    )
        return <Navigate to="/relatorios/dominical" />;

    if (isLoadingData || isLoading) return <Loading />;
    return (
        <>
            <div className="relatorio-dominical">
                <div className="relatorio-dominical__header">
                    <div className="relatorio-dominical__title">
                        <h2>Relatório dominical</h2>
                        <p className="relatorio-dominical__title--domingo">
                            <span>
                                <FontAwesomeIcon icon={faCalendarDay} />
                            </span>
                            {domingo &&
                                domingo.toLocaleDateString("pt-BR", {
                                    weekday: "long",
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                })}
                        </p>
                    </div>

                    <div className="relatorio-dominical__input">
                        <label htmlFor="relatorio-dominical-data">Data</label>
                        <input
                            type="date"
                            name="relatorio-dominical-data"
                            id="relatorio-dominical-data"
                            defaultValue={
                                domingo
                                    ? domingo.toISOString().split("T")[0]
                                    : ""
                            }
                            onChange={(evt) => {
                                const input = evt?.currentTarget;

                                if (input) {
                                    const value = new Date(
                                        input.value + "T00:00:00"
                                    );

                                    if (value.getDay() === 0) {
                                        setDomingo(value);
                                        input.classList.remove(
                                            "relatorio-dominical__input--erro"
                                        );
                                    } else
                                        input.classList.add(
                                            "relatorio-dominical__input--erro"
                                        );
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="relatorio-dominical__body">
                    <div className="relatorio-dominical__fila">
                        <h3>Fila de Leitura</h3>

                        <Reorder.Group
                            values={filaClasses}
                            onReorder={setFilaClasses}
                            axis="y"
                        >
                            {filaClasses.length ? (
                                <>
                                    {filaClasses.map((v, i) => (
                                        <Reorder.Item
                                            key={v.id}
                                            value={v}
                                            className="relatorio-dominical__lista"
                                        >
                                            <div className="relatorio-dominical__lista-item">
                                                <p className="relatorio-dominical__lista-item--number">
                                                    {i + 1}.
                                                </p>
                                                <p className="relatorio-dominical__lista-item--nome">
                                                    {v.nome}
                                                </p>

                                                {filaClasses.length > 1 && (
                                                    <span
                                                        onClick={(evt) => {
                                                            evt.stopPropagation();
                                                            excluirClasse(v);
                                                        }}
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faBan}
                                                            className="relatorio-dominical__lista-item--remover"
                                                        />
                                                    </span>
                                                )}
                                                <FontAwesomeIcon
                                                    icon={faGripLines}
                                                    className="relatorio-dominical__lista-item--icon"
                                                />
                                            </div>
                                        </Reorder.Item>
                                    ))}

                                    <li className="relatorio-dominical__lista">
                                        <div className="relatorio-dominical__lista-item relatorio-dominical__lista-item--fixo">
                                            <p className="relatorio-dominical__lista-item--nome">
                                                Totais Gerais
                                            </p>
                                        </div>
                                    </li>
                                    <li className="relatorio-dominical__lista">
                                        <div className="relatorio-dominical__lista-item relatorio-dominical__lista-item--fixo">
                                            <p className="relatorio-dominical__lista-item--nome">
                                                Aniversariantes da Semana
                                            </p>
                                        </div>
                                    </li>
                                </>
                            ) : (
                                <p className="relatorio-dominical__sem-resultados">
                                    Nenhuma classe disponivel para esta data.
                                </p>
                            )}
                        </Reorder.Group>

                        {filaClasses.length > 0 && (
                            <motion.div whileTap={{ scale: 0.85 }}>
                                <button
                                    title="Iniciar Leitura"
                                    className="relatorio-dominical__iniciar-leitura"
                                    onClick={() => setShowRelatorio(true)}
                                >
                                    Iniciar Leitura
                                </button>
                            </motion.div>
                        )}
                    </div>

                    <AnimatePresence>
                        {classesExcluidas.length > 0 && (
                            <motion.div
                                key={"classes-excluidas-relatorio"}
                                className="relatorio-dominical__excluidos"
                                initial={{ opacity: 0, y: -15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                            >
                                <h3>Classes Fora do Relatório</h3>
                                <motion.ul layout className=" ">
                                    {classesExcluidas.length > 0 ? (
                                        classesExcluidas.map((v, i) => (
                                            <motion.li
                                                className="relatorio-dominical__lista"
                                                key={v.id}
                                            >
                                                <p className="relatorio-dominical__lista-item--number">
                                                    {i + 1}.
                                                </p>
                                                <p className="relatorio-dominical__lista-item--nome">
                                                    {v.nome}
                                                </p>
                                                <span
                                                    onClick={() =>
                                                        restaurarClasse(v)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faUndo}
                                                        className="relatorio-dominical__lista-item--restaurar"
                                                    />
                                                </span>
                                            </motion.li>
                                        ))
                                    ) : (
                                        <p className="relatorio-dominical__sem-resultados">
                                            Nenhuma classe disponivel para esta
                                            data.
                                        </p>
                                    )}
                                </motion.ul>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <AnimatePresence>
                {domingo && registros && showRelatorio && (
                    <RelatorioLeitura
                        dados={registros}
                        domingo={domingo}
                        fila={filaClasses}
                        onSair={() => setShowRelatorio(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default RelatorioDominical;
