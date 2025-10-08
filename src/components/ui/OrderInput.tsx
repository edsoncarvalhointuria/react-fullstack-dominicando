import { AnimatePresence, motion } from "framer-motion";
import "./order-input.scss";
import { useEffect, useRef, useState } from "react";
import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Option {
    nome: string;
    id: string;
}
interface OrderInputProps {
    options: Option[];
    isCrescente: boolean;
    onSelect: (opt: Option) => void;
    onOrder: () => void;
}
function OrderInput({
    options,
    isCrescente,
    onSelect,
    onOrder,
}: OrderInputProps) {
    const [current, setCurrent] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const $options = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const mousedown = (evt: MouseEvent) => {
            if (
                isOpen &&
                evt.target instanceof Node &&
                !$options.current?.contains(evt.target)
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) window.addEventListener("mousedown", mousedown);

        return () => window.removeEventListener("mousedown", mousedown);
    }, [isOpen]);

    return (
        <motion.div className="order-input">
            <div className="order-input__icon" onClick={onOrder}>
                {isCrescente ? (
                    <span>
                        <FontAwesomeIcon icon={faCaretDown} />
                    </span>
                ) : (
                    <span>
                        <FontAwesomeIcon icon={faCaretUp} />
                    </span>
                )}
            </div>
            <motion.div
                className="order-input__container"
                onClick={(v) => {
                    v.stopPropagation();
                    setIsOpen((v) => !v);
                }}
            >
                <div className="order-input__current">
                    <p>
                        {current ? (
                            <>
                                <span>Ordenar por: </span>
                                {current}
                            </>
                        ) : (
                            <span>Ordernar por</span>
                        )}
                    </p>
                </div>
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key={"order-input-options"}
                            className="order-input__options"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeIn" }}
                            ref={$options}
                        >
                            <ul>
                                {options.map((v, i) => (
                                    <li
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrent(v.nome);
                                            onSelect(v);
                                            setIsOpen(false);
                                        }}
                                        key={i + v.nome}
                                    >
                                        <p>{v.nome}</p>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

export default OrderInput;
