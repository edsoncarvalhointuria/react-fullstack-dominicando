import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import "./usuarios.scss";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db, functions } from "../../../utils/firebase";
import {
    faAt,
    faChalkboardUser,
    faChurch,
    faEnvelope,
    faFeather,
    faGears,
    faStar,
    faTrash,
    faUserPen,
    faUserPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Dropdown from "../../ui/Dropdown";
import SearchInput from "../../ui/SearchInput";
import { AnimatePresence, motion, stagger, type Variants } from "framer-motion";
import CadastroUsuarioModal from "../../ui/CadastroUsuarioModal";
import AlertModal from "../../ui/AlertModal";
import { httpsCallable } from "firebase/functions";
import { ROLES, RolesLabel } from "../../../roles/Roles";
import type { CacheUsuarioInteface, UsuarioInterface } from "../../../interfaces/UsuarioInterface";
import CadastroConviteModal from "../../ui/CadastroConviteModal";
import { getOrdem } from "../../../utils/getOrdem";
import OrderInput from "../../ui/OrderInput";
import ButtonsDefault from "../../ui/ButtonDefault";
import Loading from "../../layout/loading/Loading";

const variantsItem: Variants = {
    hidden: { y: -10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
};

const variantsContainer: Variants = {
    hidden: {},
    visible: { transition: { delayChildren: stagger(0.1) } },
    exit: {},
};

const deletarUsuario = httpsCallable(functions, "deletarUsuario");
const OPTIONS = [
    {
        nome: "Nome",
        id: "nome",
        icon: faFeather,
        isFilter: true,
        placeholder: "",
    },
    {
        nome: "E-mail",
        id: "email",
        icon: faAt,
        isFilter: true,
        placeholder: "",
    },
    {
        nome: "Cargo",
        id: "role",
        icon: faStar,
        isFilter: true,
        placeholder: "",
    },
    {
        nome: "Igreja",
        id: "igrejaNome",
        icon: faChurch,
        isFilter: true,
        placeholder: "",
    },
    {
        nome: "Classe",
        id: "classeNome",
        icon: faChalkboardUser,
        isFilter: true,
        placeholder: "sem classe",
    },
];

const UsuarioItem = React.memo(
    ({
        usuario,
        onEditItem,
        onDelete,
        isSecretario = false,
    }: {
        usuario: UsuarioInterface;
        isSecretario?: boolean;
        onEditItem: (usuario: UsuarioInterface) => void;
        onDelete: (usuario: UsuarioInterface) => void;
    }) => {
        return (
            <tr>
                <td data-label="Nome">{usuario.nome}</td>
                {!isSecretario && <td data-label="Email">{usuario.email}</td>}
                <td data-label="Cargo">{RolesLabel[usuario.role]}</td>
                <td data-label="Igreja">{usuario.igrejaNome}</td>

                <td data-label="Classe">{usuario?.classeNome || "-"}</td>

                <td data-label="Ações">
                    <div className="usuarios-page__table-acoes">
                        <div className="usuarios-page__table-acao" onClick={() => onEditItem(usuario)}>
                            <FontAwesomeIcon icon={faUserPen} />
                        </div>
                        {!isSecretario && (
                            <div className="usuarios-page__table-acao" onClick={() => onDelete(usuario)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        );
    },
);
const UsuariosLista = React.memo(
    ({
        usuarios,
        onDelete,
        onEditItem,
        isSecretario,
    }: {
        usuarios: UsuarioInterface[];
        isSecretario: boolean;
        onEditItem: (usuario: UsuarioInterface) => void;
        onDelete: (usuario: UsuarioInterface) => void;
    }) => {
        return usuarios.map((v) => {
            return (
                <UsuarioItem
                    usuario={v}
                    key={v.id}
                    isSecretario={isSecretario}
                    onDelete={onDelete}
                    onEditItem={onEditItem}
                />
            );
        });
    },
);

function Usuarios() {
    const { isSuperAdmin, isSecretario, user } = useAuthContext();
    const { igrejas, isLoadingData } = useDataContext();
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(null);
    const [pesquisa, setPesquisa] = useState("");
    const [usuarios, setUsuarios] = useState<UsuarioInterface[]>([]);
    const [editItem, setEditItem] = useState("");
    const [options, setOptions] = useState(OPTIONS);
    const [addItem, setAddItem] = useState(false);
    const [gerarConvite, setGerarConvite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [update, setUpdate] = useState(false);
    const [ordemColuna, setOrdemColuna] = useState<keyof UsuarioInterface>("nome");
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">("crescente");
    const [mensagem, setMensagem] = useState<{
        mensagem: string | ReactNode;
        titulo: string;
        confirmText: string;
        onCancel: () => void;
        onConfirm: () => void;
        icon?: any;
    } | null>(null);

    const apagarUsuario = async (usuarioId: string) => {
        setMensagem(null);
        setIsLoading(true);

        try {
            const { data } = await deletarUsuario({ usuarioId });
            setMensagem({
                mensagem: (data as any).message,
                titulo: "Sucesso ao deletar",
                confirmText: "Ok",
                onCancel: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
            });
            setUpdate((v) => !v);
        } catch (error: any) {
            console.log("deu esse erro", error);
            setMensagem({
                mensagem: error.message,
                titulo: "Erro ao deletar",
                confirmText: "Ok",
                onCancel: () => setMensagem(null),
                onConfirm: () => setMensagem(null),
            });
        } finally {
            setIsLoading(false);
            setPesquisa("");
        }
    };
    const onDeleteUser = useCallback((v: UsuarioInterface) => {
        setMensagem({
            mensagem: (
                <strong>
                    <span>
                        Tem certeza que deseja deletar o usuário: <strong>{v.nome}</strong>?
                    </span>
                </strong>
            ),
            titulo: "Deletar usuário?",
            confirmText: "Sim, deletar usuário",
            onCancel: () => setMensagem(null),
            onConfirm: () => apagarUsuario(v.id),
        });
    }, []);
    const onEditUser = useCallback((v: UsuarioInterface) => setEditItem(v.id), []);

    const usuariosMemo = useMemo(() => {
        let u = [...usuarios];

        if (currentIgreja) u = u.filter((v) => v.igrejaId === currentIgreja.id);
        if (pesquisa) {
            const p = pesquisa.toLowerCase();
            u = u.filter(
                (v) =>
                    v.nome.toLowerCase().includes(p) ||
                    v.igrejaNome.toLowerCase().includes(p) ||
                    v.role.replace(/_/g, " ").includes(p) ||
                    v.email.includes(p) ||
                    v.id.toLowerCase() === p,
            );
        }

        return u.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));
    }, [currentIgreja, pesquisa, usuarios, ordemColuna, ordem]);
    useEffect(() => {
        const getAllUsuarios = async () => {
            const usuariosCll = collection(db, "cache_usuarios");
            const q = query(usuariosCll, where("ministerioId", "==", user?.ministerioId));
            const usuariosDocs = await getDocs(q);
            const usuarios = usuariosDocs.docs
                .map((v) => {
                    const data = v.data() as CacheUsuarioInteface;
                    return Object.values(data.lista);
                })
                .flat();

            setUsuarios(usuarios);
        };
        const getUsuarios = async () => {
            const usuariosDoc = await getDoc(doc(db, "cache_usuarios", user?.igrejaId!));
            const usuarioData = usuariosDoc.data() as CacheUsuarioInteface;

            let usuarios = Object.values(usuarioData.lista);

            if (!isSuperAdmin.current)
                usuarios = usuarios.filter((v) => v.role !== ROLES.PASTOR_PRESIDENTE && v.role !== ROLES.SUPER_ADMIN);
            if (user?.role === ROLES.SUPER_ADMIN) usuarios = usuarios.filter((v) => v.role !== ROLES.PASTOR_PRESIDENTE);
            if (user?.role === ROLES.SECRETARIO_CONGREGACAO) usuarios = usuarios.filter((v) => v.role !== ROLES.PASTOR);
            if (isSecretario.current)
                usuarios = usuarios.filter((v) => v.role !== ROLES.PASTOR && v.role !== ROLES.SECRETARIO_CONGREGACAO);
            if (user?.role === ROLES.SECRETARIO_CLASSE) usuarios = usuarios.filter((v) => v.role !== ROLES.PROFESSOR);

            setUsuarios(usuarios);
        };

        if (user) {
            if (!isSuperAdmin.current) {
                getUsuarios().catch((err) => console.log("deu esse erro", err));
                setCurrentIgreja({
                    id: user.igrejaId!,
                    ministerioId: user.ministerioId!,
                    nome: user.nome!,
                });
            } else getAllUsuarios().catch((err) => console.log("deu esse erro", err));

            if (isSecretario.current) {
                setOptions(OPTIONS.filter((v) => v.id !== "email"));
            }
        }
    }, [update, user]);
    if (isLoadingData || isLoading) return <Loading />;
    return (
        <>
            <motion.div
                className="usuarios-page"
                variants={variantsContainer}
                initial="hidden"
                animate="visible"
                exit="exit"
            >
                <motion.div variants={variantsItem} className="usuarios-page__header">
                    <div className="usuarios-page__infos">
                        <div className="usuarios-page__title">
                            <h2>Gestão de Usuários</h2>
                        </div>
                        <div className="usuarios-page__infos-buttons">
                            <ButtonsDefault
                                mensagem="Cadastrar novo usuário"
                                onClickNew={setAddItem}
                                icon={<FontAwesomeIcon icon={faUserPlus} />}
                                animationIcon={false}
                            >
                                {(user?.role === ROLES.PASTOR ||
                                    user?.role === ROLES.PASTOR_PRESIDENTE ||
                                    user?.role === ROLES.SUPER_ADMIN) && (
                                    <motion.div whileTap={{ scale: 0.99 }} className="usuarios-page__convite">
                                        <button title="Gerar Convite Cadastro" onClick={() => setGerarConvite(true)}>
                                            <span>
                                                <FontAwesomeIcon icon={faEnvelope} />
                                            </span>
                                            Enviar Convite
                                        </button>
                                    </motion.div>
                                )}
                            </ButtonsDefault>
                        </div>
                    </div>

                    <div className="usuarios-page__filtros">
                        <div className="usuarios-page__filtro">
                            <p>Igreja:</p>
                            <Dropdown
                                lista={igrejas}
                                current={igrejas.find((v) => v.id === currentIgreja?.id)?.nome || null}
                                onSelect={setCurrentIgreja}
                                isAll={isSuperAdmin.current}
                                selectId={currentIgreja?.id}
                            />
                        </div>

                        <div className="usuarios-page__filtro">
                            <SearchInput onSearch={setPesquisa} />
                        </div>

                        <OrderInput
                            isCrescente={ordem === "crescente"}
                            onOrder={() => setOrdem((v) => (v === "crescente" ? "decrescente" : "crescente"))}
                            options={OPTIONS.filter((v) => v.isFilter)}
                            onSelect={(v) => setOrdemColuna(v.id as any)}
                        />

                        <div className="usuarios-page__total">
                            <p>Total de Usuários: ({usuariosMemo.length})</p>
                        </div>
                    </div>
                </motion.div>

                <div className="usuarios-page__body">
                    {usuariosMemo.length > 0 ? (
                        <motion.table className="usuarios-page__table" variants={variantsItem}>
                            <thead>
                                <tr>
                                    {options.map((v, i) =>
                                        v.isFilter ? (
                                            <th
                                                key={v.id + i}
                                                onClick={() => {
                                                    setOrdem((v) => (v === "crescente" ? "decrescente" : "crescente"));
                                                    setOrdemColuna(v.id as any);
                                                }}
                                            >
                                                <div
                                                    className={`sortable-header ${
                                                        ordemColuna === v.id && "order-select"
                                                    } ${ordem}`}
                                                >
                                                    <span>
                                                        <FontAwesomeIcon icon={v.icon} />
                                                    </span>
                                                    {v.nome}
                                                </div>
                                            </th>
                                        ) : (
                                            <th key={v.id + i}>
                                                <p>
                                                    <span>
                                                        <FontAwesomeIcon icon={faFeather} />
                                                    </span>
                                                    {v.nome}
                                                </p>
                                            </th>
                                        ),
                                    )}
                                    <th>
                                        <p>
                                            <span>
                                                <FontAwesomeIcon icon={faGears} />
                                            </span>
                                            Ações
                                        </p>
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                <UsuariosLista
                                    isSecretario={isSecretario.current}
                                    onDelete={onDeleteUser}
                                    onEditItem={onEditUser}
                                    usuarios={usuariosMemo}
                                />
                            </tbody>
                        </motion.table>
                    ) : (
                        <motion.div className="usuarios-page__vazio" variants={variantsItem}>
                            <p className="usuarios-page__vazio--mensagem">Sem resultados</p>
                            <ButtonsDefault
                                mensagem="Cadastrar novo usuário"
                                onClickNew={setAddItem}
                                icon={<FontAwesomeIcon icon={faUserPlus} />}
                                animationIcon={false}
                            />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {(editItem || addItem) && (
                    <CadastroUsuarioModal
                        key={"cadatro-usuario-modal-usuarios"}
                        usuarioId={editItem}
                        onSave={(usuario) => {
                            if (editItem) setUsuarios((v) => [...v.filter((u) => u.id !== usuario.id), usuario]);
                            else setUsuarios((v) => [...v, usuario]);
                        }}
                        onCancel={() => {
                            setAddItem(false);
                            setEditItem("");
                        }}
                        igrejaId={currentIgreja?.id}
                    />
                )}

                {gerarConvite && (
                    <CadastroConviteModal key={"gerar-convite-modal"} onCancel={() => setGerarConvite(false)} />
                )}

                <AlertModal
                    key={"alert-modal-usuarios"}
                    isOpen={!!mensagem}
                    message={mensagem?.mensagem}
                    onCancel={() => mensagem?.onCancel()}
                    onClose={() => mensagem?.onCancel()}
                    onConfirm={() => mensagem?.onConfirm()}
                    title={mensagem?.titulo || ""}
                    confirmText={mensagem?.confirmText}
                    icon={mensagem?.icon}
                />
            </AnimatePresence>
        </>
    );
}

export default Usuarios;
