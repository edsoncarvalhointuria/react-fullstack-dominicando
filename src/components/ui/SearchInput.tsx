import { motion, type Variants } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import "./search-input.scss";
import { useState } from "react";

const variantsInput: Variants = {
    initial: { scale: 1, borderColor: "#d1d5db", boxShadow: "none" },
    animate: {
        scale: 1,
        boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.3)",
        borderColor: "#3b82f6",
        transition: { duration: 0.3 },
    },
};

const variantsIcon: Variants = {
    initial: { scale: 1, color: "#6b7280", x: 0 },
    animate: {
        scale: 1.3,
        color: "#3b82f6",
        transition: { duration: 0.3 },
    },
};

function SearchInput({
    onSearch,
    className = "",
    texto = "",
}: {
    onSearch: (texto: string) => void;
    className?: string;
    texto?: string;
}) {
    const [focus, setFocus] = useState(false);
    return (
        <motion.div className={`search-input ${className}`}>
            <motion.div
                className="icon-search"
                variants={variantsIcon}
                initial="initial"
                animate={focus ? "animate" : "initial"}
            >
                <FontAwesomeIcon icon={faSearch} />
            </motion.div>
            <motion.input
                type="search"
                name="pesquisar-input"
                id={"pesquisar-input" + texto}
                placeholder={`Pesquisar ${texto}...`}
                variants={variantsInput}
                onFocus={() => setFocus(true)}
                onBlur={() => setFocus(false)}
                whileFocus={"animate"}
                initial={"initial"}
                onChange={(evt) => {
                    const texto = evt.currentTarget.value.toLowerCase().trim();
                    onSearch(texto);
                }}
            />
        </motion.div>
    );
}

export default SearchInput;
