import { faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatePresence, motion } from "framer-motion";

export const AcordeaoItem = ({
    titulo,
    icone,
    total,
    listaAlunos,
    secaoId,
    secaoAberta,
    setSecaoAberta,
}: any) => {
    const isOpen = secaoAberta === secaoId;
    return (
        <div className="resumo-chamada__acordeao-item">
            <div
                className="resumo-chamada__item-header"
                onClick={() => setSecaoAberta(isOpen ? null : secaoId)}
            >
                <div className="resumo-chamada__item-header-label">
                    <FontAwesomeIcon icon={icone} />
                    <h4>{titulo}</h4>
                </div>
                <motion.span
                    className="resumo-chamada__item-header-chevron"
                    animate={{ rotate: isOpen ? 180 : 0 }}
                >
                    <FontAwesomeIcon icon={faChevronDown} />
                </motion.span>
                <p className="resumo-chamada__item-header-total">{total}</p>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.ul
                        className="resumo-chamada__acordeao-lista"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                    >
                        {listaAlunos.length > 0 ? (
                            listaAlunos.map((aluno: any) => (
                                <li key={aluno.alunoId}>{aluno.alunoNome}</li>
                            ))
                        ) : (
                            <li className="lista-vazia">
                                Nenhum aluno nesta categoria.
                            </li>
                        )}
                    </motion.ul>
                )}
            </AnimatePresence>
        </div>
    );
};

export const InfoLinha = ({
    icon,
    label,
    value,
    isTotal = false,
}: {
    icon: any;
    label: string;
    value: string | number;
    isTotal?: boolean;
}) => (
    <div className={`info-linha ${isTotal ? "info-linha--total" : ""}`}>
        <div className="info-linha__label">
            <FontAwesomeIcon icon={icon} />
            <span>{label}</span>
        </div>
        <div className="info-linha__valor">{value}</div>
    </div>
);
