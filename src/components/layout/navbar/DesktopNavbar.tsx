import React, { useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faArrowsRotate,
    faBell,
    faCakeCandles,
    faCaretDown,
    faCircleUser,
    faTrash,
    faTrashCan,
} from "@fortawesome/free-solid-svg-icons";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import type { ListaNotificacao } from "../../../interfaces/NotificacaoInterface";
import { getPeriodo } from "../../../utils/pegarPeriodoAniversario";
import { useDataContext } from "../../../context/DataContext";

const variantsHeader: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.2) } },
};

const variantsItens: Variants = {
    hidden: { opacity: 0, y: -50 },
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
        <div className="desktop-notificacao__aluno">
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
                    <strong>{aluno.alunoNome}</strong> faz aniversário em {data}
                </p>
            )}

            <button
                onClick={() => {
                    onRemoveItem(aluno.alunoId);
                }}
            >
                <FontAwesomeIcon icon={faTrashCan} />
            </button>
        </div>
    );
};

const NotificaoContainer = ({
    lista,
    onRefresh,
    onRemoveItem,
}: {
    lista: ListaNotificacao[];
    onRemoveItem: (...args: string[]) => void;
    onRefresh: () => void;
}) => {
    return (
        <motion.div
            className="desktop-notificacao"
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="desktop-notificacao__header">
                <h2>
                    <i>
                        <FontAwesomeIcon icon={faCakeCandles} />
                    </i>
                    <span>Aniversariantes</span>
                </h2>

                <button
                    onClick={() => {
                        onRemoveItem(...lista.map((v) => v.alunoId));
                    }}
                    title="Remover Todos"
                    type="button"
                >
                    <FontAwesomeIcon icon={faTrash} />
                </button>
                <button
                    onClick={onRefresh}
                    type="button"
                    className="refresh"
                    title="atualizar notificações"
                >
                    <FontAwesomeIcon icon={faArrowsRotate} />
                </button>
            </div>
            <div className="desktop-notificacao__alunos">
                {lista.map((v) => {
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
    );
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
    const [showAlert, setShowAlert] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const $dropdown = useRef<HTMLParagraphElement>(null);
    const { notificacoes, fetchNotificacoes, removerNotificacoes } =
        useDataContext();

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
                                                opacity: 0,
                                                y: -10,
                                                transition: {
                                                    duration: 0.5,
                                                    delay: 0.5,
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
                                                                "active",
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
                                                "active",
                                            );
                                            return "nav-desktop__link nav-desktop__link--active";
                                        }
                                        return "nav-desktop__link";
                                    }}
                                >
                                    {v.icon && (
                                        <span>
                                            <FontAwesomeIcon icon={v.icon} />
                                        </span>
                                    )}
                                    <span>{v.texto}</span>
                                </NavLink>
                            </motion.li>
                        ),
                    )}
                </ul>
                <div className="nav-desktop__icons">
                    <motion.div
                        className="nav-desktop__conta"
                        onTap={() => {
                            setShowAccount((v) => !v);
                            setShowAlert(false);
                        }}
                        variants={variantsItens}
                    >
                        <FontAwesomeIcon
                            className={`nav-desktop__conta--icon ${
                                showAccount
                                    ? "nav-desktop__conta--icon-select"
                                    : ""
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
                    <motion.div
                        className="nav-desktop__notificacoes"
                        onClick={() => {
                            setShowAlert((v) => !v);
                            setShowAccount(false);
                        }}
                        variants={variantsItens}
                    >
                        <FontAwesomeIcon
                            className={`nav-desktop__notificacoes--icon ${
                                showAlert
                                    ? "nav-desktop__notificacoes--icon-select"
                                    : ""
                            }`}
                            icon={faBell}
                        />

                        <AnimatePresence mode="wait">
                            {showAlert ? (
                                <NotificaoContainer
                                    key={"notificacao-container"}
                                    lista={notificacoes}
                                    onRemoveItem={removerNotificacoes}
                                    onRefresh={fetchNotificacoes}
                                />
                            ) : (
                                <motion.div
                                    key={"qtd-notificacao"}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0 }}
                                    className="nav-desktop__notificacoes--qtd"
                                >
                                    <p>{notificacoes.length}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </nav>
        </motion.header>
    );
}

export default React.memo(DesktopNavbar);
