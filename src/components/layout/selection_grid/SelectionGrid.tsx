import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { useMemo, useState } from "react";
import "./selection-grid.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import SearchInput from "../../ui/SearchInput";

const variantsGrid: Variants = {
    hidden: {},
    visible: { scale: 1, y: 0, transition: { delayChildren: stagger(0.1) } },
};

const variantsItem: Variants = {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0 },
};

function SelectionGrid({
    titulo,
    opcoes,
    onSelect,
    renderAddModal = undefined,
    sort = true,
}: {
    titulo: string;
    opcoes: {
        id: string;
        nome: string;
    }[];
    onSelect: (id: string) => void;
    renderAddModal?: (onClose: () => void) => React.ReactNode;
    sort?: boolean;
}) {
    const [pesquisa, setPesquisa] = useState("");
    const [showModal, setShowModal] = useState(false);

    const opcoesMemo = useMemo(() => {
        let o = opcoes.filter((v) => v.nome.toLowerCase().includes(pesquisa));
        if (sort) o = o.sort((a, b) => a.nome.localeCompare(b.nome));

        return o;
    }, [opcoes, pesquisa]);
    return (
        <>
            <motion.div
                className="selection-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                <div className="selection-grid__header">
                    <h2 className="selection-grid__title">
                        Selecione a {titulo}
                    </h2>
                    <div className="selection-grid__controls">
                        <SearchInput onSearch={(texto) => setPesquisa(texto)} />
                        {renderAddModal && (
                            <button
                                className="selection-grid__button-new"
                                onClick={() => setShowModal(true)}
                            >
                                <FontAwesomeIcon
                                    className="selection-grid__add-new"
                                    icon={faPlus}
                                />

                                <span>Cadastrar {titulo.toLowerCase()}</span>
                            </button>
                        )}
                    </div>
                </div>

                <motion.div
                    className="selection-grid__grid"
                    layout
                    variants={variantsGrid}
                    initial="hidden"
                    animate={"visible"}
                >
                    {opcoesMemo.length > 0 ? (
                        opcoesMemo.map((v) => (
                            <motion.div
                                variants={variantsItem}
                                className="selection-grid__item"
                                key={v.id}
                                whileHover={{
                                    scale: 1.05,
                                    y: -10,
                                }}
                                transition={{ duration: 0.2 }}
                                whileTap={{ scale: 0.8 }}
                                onTap={() => onSelect(v.id)}
                                layoutId={v.id}
                            >
                                <h3>{v.nome}</h3>
                            </motion.div>
                        ))
                    ) : (
                        <motion.div
                            className="selection-grid__vazio"
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <p>Nenhum item encontrado</p>

                            <button
                                className="selection-grid__cadastrar"
                                onClick={() => setShowModal(true)}
                            >
                                <span>
                                    <FontAwesomeIcon icon={faPlus} />
                                </span>
                                Cadastrar {titulo}
                            </button>
                        </motion.div>
                    )}
                </motion.div>
            </motion.div>
            <AnimatePresence>
                {renderAddModal &&
                    showModal &&
                    renderAddModal(() => setShowModal(false))}
            </AnimatePresence>
        </>
    );
}

export default SelectionGrid;
