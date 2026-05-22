import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowsRotate,
    faBell,
    faCakeCandles,
    faCaretDown,
    faTrash,
    faTrashCan,
    faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { ListaNotificacao } from "../../../interfaces/NotificacaoInterface";
import { limparLocalStorage } from "../../../utils/adicionarIdsLocalStorage";
import { getPeriodo } from "../../../utils/pegarPeriodoAniversario";
import { useDataContext } from "../../../context/DataContext";

const variantsHeader: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.01) } },
};

const variantsItens: Variants = {
    hidden: { opacity: 0, y: -100 },
    visible: { opacity: 1, y: 0 },
};

const NotificacaoAluno = ({
    aluno,
    onRemoveItem,
}: {
    aluno: ListaNotificacao;
    onRemoveItem: (...args: string[]) => void;
}) => {
    const data = getPeriodo(aluno.data_nascimento);
    return (
        <div className="mobile-notificacao__aluno">
            {data === "hoje" ? (
                <p>
                    Hoje é aniversário de <strong>{aluno.alunoNome}</strong>.
                    Não esqueça de parabenizar!
                </p>
            ) : data === "amanhã" ? (
                <p>
                    Amanhã é aniversário de <strong>{aluno.alunoNome}</strong>!
                </p>
            ) : (
                <p>
                    <strong>{aluno.alunoNome}</strong> fez aniversário em {data}
                </p>
            )}

            <button
                onClick={() => {
                    onRemoveItem(aluno.alunoId);
                }}
                title="Remover Item"
                type="button"
            >
                <FontAwesomeIcon icon={faTrashCan} />
            </button>
        </div>
    );
};

const NotificaoContainer = ({
    notificacoes,
    onRefresh,
    onRemoveItem,
    onClose,
}: {
    notificacoes: ListaNotificacao[];
    onRemoveItem: (...args: string[]) => void;
    onRefresh: () => void;
    onClose: () => void;
}) => {
    return (
        <div className="mobile-notificacao__overlay">
            <motion.div
                className="mobile-notificacao"
                initial={{ opacity: 0, x: "100%" }}
                animate={{
                    opacity: 1,
                    x: 0,
                    transition: {
                        duration: 0.5,
                        ease: "easeInOut",
                    },
                }}
                exit={{
                    x: "100%",
                    transition: {
                        duration: 0.5,
                        ease: "easeInOut",
                    },
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mobile-notificacao__header">
                    <button
                        className="mobile-notificacao__header--close"
                        title="fechar"
                        type="button"
                        onClick={onClose}
                    >
                        <FontAwesomeIcon icon={faXmark} />
                    </button>
                    <h2>
                        <i>
                            <FontAwesomeIcon icon={faCakeCandles} />
                        </i>
                        <span>Aniversariantes</span>
                    </h2>

                    <button
                        onClick={() => {
                            onRemoveItem(...notificacoes.map((v) => v.alunoId));
                        }}
                        title="Remover Todos"
                        type="button"
                    >
                        <FontAwesomeIcon icon={faTrash} />
                    </button>
                    <button
                        title="Atualizar notificações"
                        type="button"
                        className="refresh"
                        onClick={() => {
                            limparLocalStorage();
                            onRefresh();
                        }}
                    >
                        <FontAwesomeIcon icon={faArrowsRotate} />
                    </button>
                </div>
                <div className="mobile-notificacao__alunos">
                    {notificacoes.map((v) => {
                        return (
                            <NotificacaoAluno
                                key={v.alunoId}
                                aluno={v}
                                onRemoveItem={onRemoveItem}
                            />
                        );
                    })}
                </div>
            </motion.div>
        </div>
    );
};

function MobileNavbar({
    OPCOES,
    userName,
    userEmail,
    logout,
    portalAluno,
}: {
    OPCOES: NavbarItemInterface[];
    userName: string;
    userEmail: string;
    logout: () => void;
    portalAluno?: string;
}) {
    const [openMenu, setOpenMenu] = useState(false);
    const [openAlert, setOpenAlert] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const $header = useRef<HTMLDivElement>(null);
    const { notificacoes, fetchNotificacoes, removerNotificacoes } =
        useDataContext();
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
            <button
                className={`header-mobile__hamburguer ${
                    openMenu ? "header-mobile__hamburguer--open" : ""
                }`}
                onClick={() => {
                    setOpenMenu((v) => !v);
                    setOpenAlert(false);
                }}
                title="abrir menu"
                type="button"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>

            <Link to={"/dashboard"} className="header-mobile__img">
                <motion.img
                    variants={variantsItens}
                    src="/logo-atualizada.svg"
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

                                <div className="nav-mobile__conta--links">
                                    <Link
                                        className="nav-mobile__conta--link"
                                        to="/minha-conta"
                                        onClick={() => setOpenMenu(false)}
                                    >
                                        Minha Conta
                                    </Link>
                                    {portalAluno && (
                                        <Link
                                            className="nav-mobile__conta--link"
                                            to={portalAluno}
                                            onClick={() => setOpenMenu(false)}
                                        >
                                            Portal Aluno
                                        </Link>
                                    )}
                                </div>
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
                                                                                "dropdown-active",
                                                                            );
                                                                            return "nav-mobile__link nav-mobile__link--active";
                                                                        }
                                                                        return "nav-mobile__link";
                                                                    }}
                                                                >
                                                                    {d.texto}
                                                                </NavLink>
                                                            ),
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
                                                            "dropdown-active",
                                                        );
                                                        return "nav-mobile__link nav-mobile__link--active";
                                                    }
                                                    return "nav-mobile__link";
                                                }}
                                            >
                                                {v.icon && (
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={v.icon}
                                                        />
                                                    </span>
                                                )}
                                                <span>{v.texto}</span>
                                            </NavLink>
                                        </motion.li>
                                    ),
                                )}
                            </ul>

                            <motion.div whileTap={{ scale: 0.95 }}>
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

            <div
                className="header-mobile__notificacao"
                onClick={() => {
                    setOpenAlert((v) => !v);
                    setOpenMenu(false);
                }}
            >
                <FontAwesomeIcon
                    className={`header-mobile__notificacao ${
                        openAlert ? "header-mobile__notificacao--open" : ""
                    }`}
                    icon={faBell}
                />

                <AnimatePresence mode="wait">
                    {openAlert ? (
                        <NotificaoContainer
                            key={"notificacao-container"}
                            notificacoes={notificacoes}
                            onRemoveItem={removerNotificacoes}
                            onRefresh={fetchNotificacoes}
                            onClose={() => setOpenAlert(false)}
                        />
                    ) : (
                        <motion.div
                            key={"qtd-notificacao"}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            className="header-mobile__notificacao--qtd"
                        >
                            <p>{notificacoes.length}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.header>
    );
}

export default React.memo(MobileNavbar);
