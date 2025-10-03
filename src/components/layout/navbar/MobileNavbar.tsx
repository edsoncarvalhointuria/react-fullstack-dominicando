import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons";

const variantsHeader: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.01) } },
};

const variantsItens: Variants = {
    hidden: { opacity: 0, y: -100 },
    visible: { opacity: 1, y: 0 },
};

function MobileNavbar({
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
    const [openMenu, setOpenMenu] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const $header = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openMenu) {
            setShowDropdown(false);
        }
    }, [openMenu]);
    return (
        <motion.header
            ref={$header}
            className="header-mobile"
            variants={variantsHeader}
            initial={"hidden"}
            animate={"visible"}
        >
            <Link to={"/dashboard"} className="header-mobile__img">
                <motion.img
                    variants={variantsItens}
                    src="/logo-cor-oficial.svg"
                    alt="Logo Domicando"
                />
            </Link>

            <AnimatePresence>
                {openMenu && (
                    <>
                        <motion.nav
                            className="nav-mobile"
                            key={"nav-mobile"}
                            initial={{ opacity: 0, x: "-100%" }}
                            animate={{
                                opacity: 1,
                                x: 0,
                                transition: {
                                    duration: 0.5,
                                    ease: "easeInOut",
                                },
                            }}
                            exit={{
                                x: "-100%",
                                transition: {
                                    duration: 0.5,
                                    ease: "easeInOut",
                                },
                            }}
                        >
                            <div className="nav-mobile__conta">
                                <p className="nav-mobile__conta--nome">
                                    Olá, {userName}!
                                </p>
                                <p className="nav-mobile__conta--email">
                                    {userEmail}
                                </p>
                                <Link
                                    className="nav-mobile__conta--link"
                                    to="/minha-conta"
                                >
                                    Minha Conta
                                </Link>
                            </div>

                            <ul className="nav-mobile__links">
                                {OPCOES.map((v, i) =>
                                    v.dropdown ? (
                                        <motion.li
                                            key={v.texto + i}
                                            onTap={() =>
                                                setShowDropdown((v) => !v)
                                            }
                                        >
                                            <p className="nav-mobile__link--dropdown">
                                                {v.texto}
                                                <FontAwesomeIcon
                                                    icon={faCaretDown}
                                                />
                                            </p>

                                            <AnimatePresence>
                                                {showDropdown && (
                                                    <motion.div
                                                        className="nav-mobile__links--dropdown"
                                                        initial={{
                                                            opacity: 0,
                                                            height: 0,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            height: "auto",
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            height: 0,
                                                            transition: {
                                                                duration: 0.5,
                                                            },
                                                        }}
                                                        onTap={() => {
                                                            setOpenMenu(false);
                                                        }}
                                                    >
                                                        {v.dropdown.map(
                                                            (d, i) => (
                                                                <NavLink
                                                                    key={
                                                                        d.texto +
                                                                        i
                                                                    }
                                                                    to={
                                                                        d.caminho!
                                                                    }
                                                                    className={({
                                                                        isActive,
                                                                    }) => {
                                                                        if (
                                                                            isActive
                                                                        ) {
                                                                            $header.current?.classList.add(
                                                                                "dropdown-active"
                                                                            );
                                                                            return "nav-mobile__link nav-mobile__link--active";
                                                                        }
                                                                        return "nav-mobile__link";
                                                                    }}
                                                                >
                                                                    {d.texto}
                                                                </NavLink>
                                                            )
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.li>
                                    ) : (
                                        <motion.li
                                            key={v.texto + i}
                                            onTap={() => {
                                                setOpenMenu(false);
                                            }}
                                        >
                                            <NavLink
                                                to={v.caminho!}
                                                className={({ isActive }) => {
                                                    if (isActive) {
                                                        $header.current?.classList.remove(
                                                            "dropdown-active"
                                                        );
                                                        return "nav-mobile__link nav-mobile__link--active";
                                                    }
                                                    return "nav-mobile__link";
                                                }}
                                            >
                                                {v.texto}
                                            </NavLink>
                                        </motion.li>
                                    )
                                )}
                            </ul>

                            <motion.div whileTap={{ scale: 0.8 }}>
                                <button
                                    className="nav-mobile__sair"
                                    onClick={logout}
                                >
                                    Sair
                                </button>
                            </motion.div>
                        </motion.nav>

                        <div
                            className="header-mobile--nav-close"
                            onClick={() => setOpenMenu(false)}
                        ></div>
                    </>
                )}
            </AnimatePresence>

            <button
                className={`header-mobile__hamburguer ${
                    openMenu ? "header-mobile__hamburguer--open" : ""
                }`}
                onClick={() => setOpenMenu((v) => !v)}
            >
                <span></span>
                <span></span>
                <span></span>
            </button>
        </motion.header>
    );
}

export default MobileNavbar;
