import { useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCircleUser } from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";

const variantsHeader: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.2) } },
};

const variantsItens: Variants = {
    hidden: { opacity: 0, y: -50 },
    visible: { opacity: 1, y: 0 },
};

function DesktopNavbar({
    OPCOES,
    userName,
    userEmail,
    logout,
}: {
    OPCOES: NavbarItemInterface[];
    userName: string;
    userEmail: string;
    logout: () => void;
}) {
    const [showAccount, setShowAccount] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const $dropdown = useRef<HTMLParagraphElement>(null);

    return (
        <motion.header
            className="header-desktop"
            variants={variantsHeader}
            initial={"hidden"}
            animate={"visible"}
        >
            <Link to={"/dashboard"} className="header-desktop__img">
                <motion.img
                    variants={variantsItens}
                    src="/logo-preenchida.svg"
                    alt="Logo Dominicando"
                />
            </Link>
            <nav className="nav-desktop">
                <ul className="nav-desktop__links">
                    {OPCOES.map((v, i) =>
                        v.dropdown ? (
                            <motion.li
                                key={v.texto + i}
                                variants={variantsItens}
                                onMouseOver={() => setShowDropdown(true)}
                                onMouseOut={() => setShowDropdown(false)}
                            >
                                <p
                                    ref={$dropdown}
                                    className="nav-desktop__link--dropdown"
                                >
                                    {v.texto}
                                    <FontAwesomeIcon icon={faCaretDown} />
                                </p>

                                <AnimatePresence>
                                    {showDropdown && (
                                        <motion.div
                                            className="nav-desktop__links--dropdown"
                                            initial={{
                                                opacity: 0,
                                                y: -10,
                                            }}
                                            animate={{
                                                opacity: 1,
                                                y: 0,
                                            }}
                                            exit={{
                                                scale: 0,
                                                opacity: 0,
                                                y: -100,
                                                transition: {
                                                    duration: 0.5,
                                                    delay: 0.2,
                                                },
                                            }}
                                        >
                                            {v.dropdown.map((d, i) => (
                                                <NavLink
                                                    key={d.texto + i}
                                                    to={d.caminho!}
                                                    className={({
                                                        isActive,
                                                    }) => {
                                                        if (isActive) {
                                                            $dropdown.current?.classList.add(
                                                                "active"
                                                            );
                                                            return "nav-desktop__link nav-desktop__link--active";
                                                        }
                                                        return "nav-desktop__link";
                                                    }}
                                                >
                                                    {d.texto}
                                                </NavLink>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.li>
                        ) : (
                            <motion.li
                                key={v.texto + i}
                                variants={variantsItens}
                                whileHover={{ scale: 1.05 }}
                            >
                                <NavLink
                                    to={v.caminho!}
                                    className={({ isActive }) => {
                                        if (isActive) {
                                            $dropdown.current?.classList.remove(
                                                "active"
                                            );
                                            return "nav-desktop__link nav-desktop__link--active";
                                        }
                                        return "nav-desktop__link";
                                    }}
                                >
                                    {v.texto}
                                </NavLink>
                            </motion.li>
                        )
                    )}
                </ul>
                <motion.div
                    className="nav-desktop__conta"
                    onTap={() => setShowAccount((v) => !v)}
                    variants={variantsItens}
                >
                    <FontAwesomeIcon
                        className={`nav-desktop__conta--icon ${
                            showAccount ? "nav-desktop__conta--icon-select" : ""
                        }`}
                        icon={faCircleUser}
                    />

                    <AnimatePresence>
                        {showAccount && (
                            <motion.div
                                key={"nav-desktop__conta-container"}
                                className="nav-desktop__conta-container"
                                initial={{ opacity: 0, scale: 0, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{
                                    opacity: 0,
                                    scale: 0,
                                    y: -50,
                                    x: 100,
                                    transition: { delay: 0.3 },
                                }}
                            >
                                <p className="nav-desktop__conta-container--nome">
                                    Olá, {userName}!
                                </p>
                                <p className="nav-desktop__conta-container--email">
                                    {userEmail}
                                </p>

                                <Link
                                    to={"/minha-conta"}
                                    className="nav-desktop__conta-container--link"
                                >
                                    Minha Conta
                                </Link>
                                <motion.div>
                                    <button
                                        className="nav-mobile__sair"
                                        onClick={logout}
                                    >
                                        Sair
                                    </button>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </nav>
        </motion.header>
    );
}

export default DesktopNavbar;
