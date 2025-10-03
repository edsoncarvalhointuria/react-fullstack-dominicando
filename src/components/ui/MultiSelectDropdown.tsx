import { useEffect, useMemo, useRef, useState } from "react";
import "./multi-select-dropdown.scss";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { faChevronDown, faTimes } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const variantsLista: Variants = {
    hidden: { scale: 0, y: -100, opacity: 0 },
    visible: { scale: 1, y: 0, opacity: 1 },
};

interface base {
    id: string;
    nome: string;
}

interface props<T extends base> {
    lista: T[];
    currentListIds: string[];
    onChange: (ids: string[]) => void;
    texto?: string;
}
function MultiSelectDropdown<T extends base>({
    lista,
    currentListIds,
    onChange,
    texto,
}: props<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [pesquisa, setPesquisa] = useState("");

    const $container = useRef<HTMLDivElement>(null);

    const listaMap = useMemo(
        () => new Map(lista.map((v) => [v.id, v])),
        [lista]
    );
    const nomesMemo = useMemo(
        () => currentListIds.map((v) => listaMap.get(v)).filter(Boolean) as T[],
        [listaMap, currentListIds]
    );
    const listaMemo = useMemo(
        () =>
            lista.filter(
                (v) =>
                    !currentListIds.includes(v.id) &&
                    v.nome.toLowerCase().includes(pesquisa)
            ),

        [pesquisa, nomesMemo, listaMap]
    );
    useEffect(() => {
        const mousedown = (evt: MouseEvent) => {
            if (
                isOpen &&
                $container.current &&
                evt.target instanceof Node &&
                !$container.current.contains(evt.target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) window.addEventListener("mousedown", mousedown);
        return () => window.removeEventListener("mousedown", mousedown);
    }, [isOpen]);
    return (
        <div className="multi-select-dropdown" ref={$container}>
            <motion.div
                layout
                className="multi-select-dropdown__header"
                onClick={() => setIsOpen((v) => !v)}
            >
                {currentListIds.length > 0 ? (
                    nomesMemo.map((v) => (
                        <div
                            className="multi-select-dropdown__item-container"
                            key={v.id}
                        >
                            <motion.p
                                layout
                                className="multi-select-dropdown__item"
                            >
                                {v.nome}
                            </motion.p>
                            <button
                                title="Remover Item"
                                onClick={(evt) => {
                                    evt.stopPropagation();
                                    onChange(
                                        currentListIds.filter(
                                            (id) => id !== v.id
                                        )
                                    );
                                }}
                            >
                                <FontAwesomeIcon icon={faTimes} />
                            </button>
                        </div>
                    ))
                ) : (
                    <p className="multi-select-dropdown__header-vazio">
                        {texto ? texto : "Clique para selecionar..."}
                    </p>
                )}

                <div className="multi-select-dropdown__header-seta">
                    <FontAwesomeIcon icon={faChevronDown} />
                </div>
            </motion.div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        variants={variantsLista}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="multi-select-dropdown__lista"
                        onClick={(evt) => evt.stopPropagation()}
                    >
                        <div className="multi-select-dropdown__pesquisa">
                            <input
                                type="search"
                                name="multi-select-dropdown-pesquisa"
                                id="multi-select-dropdown-pesquisa"
                                placeholder="Pesquisar..."
                                onKeyUp={(v) => {
                                    setPesquisa(
                                        v.currentTarget.value
                                            .toLowerCase()
                                            .trim()
                                    );
                                }}
                            />
                        </div>

                        <ul>
                            {listaMemo.length > 0 ? (
                                listaMemo.map((v) => (
                                    <motion.li
                                        layout
                                        key={v.id}
                                        className="multi-select-dropdown__lista-item"
                                        onClick={() =>
                                            onChange([...currentListIds, v.id])
                                        }
                                    >
                                        <p>{v.nome}</p>
                                    </motion.li>
                                ))
                            ) : (
                                <li className="multi-select-dropdown__lista-vazia">
                                    <p>Nenhum item encontrado</p>
                                </li>
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default MultiSelectDropdown;
