import { useEffect, useRef, useState } from "react";
import "./dropdown.scss";
import { AnimatePresence, motion, type Variants } from "framer-motion";

const variantsLista: Variants = {
    hidden: { scale: 0, y: -100, opacity: 0 },
    visible: { scale: 1, y: 0, opacity: 1 },
    exit: { height: 0, opacity: 0 },
};

interface base {
    id: string;
    nome: string;
}

interface props<T extends base> {
    lista: T[];
    current: string | null;
    onSelect: (response: T | null) => void;
    isAll?: boolean;
    isErro?: boolean;
    isLoading?: boolean;
    selectId?: string;
}

function Dropdown<T extends base>({
    lista,
    onSelect,
    current,
    isAll = true,
    isErro = false,
    isLoading = false,
    selectId,
}: props<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const [listaState, setListaState] = useState(lista);

    const $input = useRef<HTMLInputElement>(null);
    const $dropdown = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mousedown = (evt: MouseEvent) => {
            if (
                isOpen &&
                $dropdown.current &&
                evt.target instanceof Node &&
                !$dropdown.current.contains(evt.target)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) window.addEventListener("mousedown", mousedown);

        return () => window.removeEventListener("mousedown", mousedown);
    }, [isOpen]);

    return (
        <motion.div layout className="dropdown" ref={$dropdown}>
            <div
                className={`dropdown__current ${
                    isOpen && "dropdown__current--open"
                } ${isErro && "dropdown__current--erro"}`}
                onClick={() => {
                    setIsOpen((v) => !v);
                    setListaState(lista);
                }}
            >
                {!current && isAll ? (
                    "Todas"
                ) : !isAll && !current ? (
                    <span
                        style={{
                            color: "#6b7280",
                            fontFamily: "Inter, sans-serif",
                        }}
                    >
                        Clique para selecionar
                    </span>
                ) : (
                    current
                )}
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        key={"dropdown__opcoes--1"}
                        className="dropdown__opcoes"
                        variants={variantsLista}
                        initial="hidden"
                        animate="visible"
                        exit={"exit"}
                    >
                        <div className="dropdown__opcoes--pesquisa">
                            <input
                                type="text"
                                placeholder="Pesquisar..."
                                ref={$input}
                                name="pesquisa-dropdown"
                                id="pesquisa-dropwn"
                                onKeyUp={() =>
                                    setListaState(() =>
                                        !$input.current?.value
                                            ? lista
                                            : lista.filter((l) =>
                                                  l.nome
                                                      .toLowerCase()
                                                      .includes(
                                                          $input.current?.value.toLocaleLowerCase()!
                                                      )
                                              )
                                    )
                                }
                            />
                        </div>

                        <motion.ul className="dropdown__opcoes--lista">
                            {isLoading ? (
                                <li className="dropdown__lista-carregando">
                                    <p>Carregando</p>{" "}
                                    <span className="dropdown__lista--spinner"></span>
                                </li>
                            ) : (
                                <>
                                    {isAll && (
                                        <li
                                            onClick={() => {
                                                if (lista.length > 1) {
                                                    onSelect(null);
                                                    setListaState(lista);
                                                }
                                                setIsOpen(false);
                                            }}
                                        >
                                            Selecionar Todas
                                        </li>
                                    )}

                                    {listaState.length > 0 ? (
                                        listaState.map((v) => (
                                            <li
                                                key={v.id}
                                                className={
                                                    selectId === v.id
                                                        ? "dropdown__opcoes--select"
                                                        : ""
                                                }
                                                onClick={() => {
                                                    if (lista.length > 0) {
                                                        onSelect(v);
                                                        setListaState(lista);
                                                    }
                                                    setIsOpen(false);
                                                }}
                                            >
                                                {v.nome}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="multi-select-dropdown__lista-vazia">
                                            <p>Nenhum item encontrado</p>
                                        </li>
                                    )}
                                </>
                            )}
                        </motion.ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default Dropdown;
