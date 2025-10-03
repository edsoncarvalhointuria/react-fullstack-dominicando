import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuthContext } from "../../../context/AuthContext";
import { useDataContext } from "../../../context/DataContext";
import "./usuarios.scss";
import Loading from "../../layout/loading/Loading";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../utils/firebase";
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
import { getFunctions, httpsCallable } from "firebase/functions";
import { ROLES, RolesLabel } from "../../../roles/Roles";
import type { UsuarioInterface } from "../../../interfaces/UsuarioInterface";
import CadastroConviteModal from "../../ui/CadastroConviteModal";
import { getOrdem } from "../../../utils/getOrdem";
import OrderInput from "../../ui/OrderInput";

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

const functions = getFunctions();
const deletarUsuario = httpsCallable(functions, "deletarUsuario");

function Usuarios() {
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
    const { isAdmin, isSuperAdmin, isSecretario, user } = useAuthContext();
    const { igrejas, isLoadingData } = useDataContext();
    const [currentIgreja, setCurrentIgreja] = useState<IgrejaInterface | null>(
        null
    );
    const [pesquisa, setPesquisa] = useState("");
    const [usuarios, setUsuarios] = useState<UsuarioInterface[]>([]);
    const [editItem, setEditItem] = useState("");
    const [addItem, setAddItem] = useState(false);
    const [gerarConvite, setGerarConvite] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [update, setUpdate] = useState(false);
    const [ordemColuna, setOrdemColuna] =
        useState<keyof UsuarioInterface>("nome");
    const [ordem, setOrdem] = useState<"crescente" | "decrescente">(
        "crescente"
    );
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
        }
    };

    const usuariosMemo = useMemo(() => {
        let u = usuarios;

        if (currentIgreja) u = u.filter((v) => v.igrejaId === currentIgreja.id);
        if (pesquisa)
            u = u.filter(
                (v) =>
                    v.nome.toLowerCase().includes(pesquisa) ||
                    v.igrejaNome.toLowerCase().includes(pesquisa) ||
                    v.email.includes(pesquisa) ||
                    v.id.toLowerCase() === pesquisa
            );
        return u.sort((a: any, b: any) => getOrdem(a, b, ordemColuna, ordem));
    }, [currentIgreja, pesquisa, usuarios, ordemColuna, ordem]);
    useEffect(() => {
        const getUsuarios = async () => {
            const c = collection(db, "usuarios");
            let q;

            if (isSuperAdmin.current)
                q = query(c, where("ministerioId", "==", user?.ministerioId));
            else if (isAdmin.current)
                q = query(c, where("igrejaId", "==", user?.igrejaId));
            else if (isSecretario.current)
                q = query(c, where("classeId", "==", user?.classeId));
            else throw new Error("Seu usuário está invalido");

            const snap = await getDocs(q);

            if (snap.empty) return [];

            let usuarios = snap.docs.map(
                (v) => ({ id: v.id, ...v.data() } as UsuarioInterface)
            );

            if (!isSuperAdmin.current)
                usuarios = usuarios.filter(
                    (v) =>
                        v.role !== "pastor_presidente" &&
                        v.role !== "super_admin"
                );
            if (user?.role === "secretario_congregacao")
                return usuarios.filter((v) => v.role !== "pastor");
            if (user?.role === "super_admin")
                return usuarios.filter((v) => v.role !== "pastor_presidente");
            return usuarios;
        };

        if (user) {
            getUsuarios()
                .then((v) => setUsuarios(v))
                .catch((err) => console.log("deu esse erro", err));
            if (!isSuperAdmin.current)
                setCurrentIgreja({
                    id: user.igrejaId!,
                    ministerioId: user.ministerioId!,
                    nome: user.nome!,
                });
        }
    }, [update]);
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
                <motion.div
                    variants={variantsItem}
                    className="usuarios-page__header"
                >
                    <div className="usuarios-page__infos">
                        <div className="usuarios-page__title">
                            <h2>Gestão de Usuários</h2>
                        </div>
                        <div className="usuarios-page__infos-buttons">
                            <motion.div
                                whileTap={{ scale: 0.85 }}
                                className="usuarios-page__cadastrar"
                            >
                                <button
                                    title="Cadastrar novo aluno"
                                    onClick={() => setAddItem(true)}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faUserPlus} />
                                    </span>
                                    Cadastrar novo usuário
                                </button>
                            </motion.div>
                            {(user?.role === ROLES.PASTOR ||
                                user?.role === ROLES.PASTOR_PRESIDENTE) && (
                                <motion.div
                                    whileTap={{ scale: 0.85 }}
                                    className="usuarios-page__convite"
                                >
                                    <button
                                        title="Gerar Convite Cadastro"
                                        onClick={() => setGerarConvite(true)}
                                    >
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faEnvelope}
                                            />
                                        </span>
                                        Enviar Convite
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </div>

                    <div className="usuarios-page__filtros">
                        <div className="usuarios-page__filtro">
                            <p>Igreja:</p>
                            <Dropdown
                                lista={igrejas}
                                current={
                                    igrejas.find(
                                        (v) => v.id === currentIgreja?.id
                                    )?.nome || null
                                }
                                onSelect={(v) => setCurrentIgreja(v)}
                                isAll={isSuperAdmin.current}
                                selectId={currentIgreja?.id}
                            />
                        </div>

                        <div className="usuarios-page__filtro">
                            <SearchInput onSearch={(v) => setPesquisa(v)} />
                        </div>

                        <OrderInput
                            isCrescente={ordem === "crescente"}
                            onOrder={() =>
                                setOrdem((v) =>
                                    v === "crescente"
                                        ? "decrescente"
                                        : "crescente"
                                )
                            }
                            options={OPTIONS.filter((v) => v.isFilter)}
                            onSelect={(v) => setOrdemColuna(v.id as any)}
                        />

                        <div className="usuarios-page__total">
                            <p>Total Usuário: ({usuariosMemo.length})</p>
                        </div>
                    </div>
                </motion.div>

                <div className="usuarios-page__body">
                    {usuariosMemo.length > 0 ? (
                        <motion.table
                            className="usuarios-page__table"
                            variants={variantsItem}
                        >
                            <thead>
                                <tr>
                                    {OPTIONS.map((v, i) =>
                                        v.isFilter ? (
                                            <th
                                                key={v.id + i}
                                                onClick={() => {
                                                    setOrdem((v) =>
                                                        v === "crescente"
                                                            ? "decrescente"
                                                            : "crescente"
                                                    );
                                                    setOrdemColuna(v.id as any);
                                                }}
                                            >
                                                <div
                                                    className={`sortable-header ${
                                                        ordemColuna === v.id &&
                                                        "order-select"
                                                    } ${ordem}`}
                                                >
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={v.icon}
                                                        />
                                                    </span>
                                                    {v.nome}
                                                </div>
                                            </th>
                                        ) : (
                                            <th key={v.id + i}>
                                                <p>
                                                    <span>
                                                        <FontAwesomeIcon
                                                            icon={faFeather}
                                                        />
                                                    </span>
                                                    {v.nome}
                                                </p>
                                            </th>
                                        )
                                    )}
                                    <th>
                                        <p>
                                            <span>
                                                <FontAwesomeIcon
                                                    icon={faGears}
                                                />
                                            </span>
                                            Ações
                                        </p>
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {usuariosMemo.map((v) => (
                                    <tr key={v.id}>
                                        <td data-label="Nome">{v.nome}</td>
                                        <td data-label="Email">{v.email}</td>
                                        <td data-label="Cargo">
                                            {RolesLabel[v.role]}
                                        </td>
                                        <td data-label="Igreja">
                                            {v.igrejaNome}
                                        </td>

                                        <td data-label="Classe">
                                            {v?.classeNome || "-"}
                                        </td>

                                        <td data-label="Ações">
                                            <div className="usuarios-page__table-acoes">
                                                <div
                                                    className="usuarios-page__table-acao"
                                                    onClick={() =>
                                                        setEditItem(v.id)
                                                    }
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faUserPen}
                                                    />
                                                </div>
                                                {!isSecretario.current && (
                                                    <div
                                                        className="usuarios-page__table-acao"
                                                        onClick={() =>
                                                            setMensagem({
                                                                mensagem: (
                                                                    <>
                                                                        <span>
                                                                            Tem
                                                                            certeza
                                                                            que
                                                                            deseja
                                                                            deletar
                                                                            o
                                                                            usuário:{" "}
                                                                            <strong>
                                                                                {
                                                                                    v.nome
                                                                                }
                                                                            </strong>
                                                                            ?
                                                                        </span>
                                                                    </>
                                                                ),
                                                                titulo: "Deletar usuário?",
                                                                confirmText:
                                                                    "Sim, deletar usuário",
                                                                onCancel: () =>
                                                                    setMensagem(
                                                                        null
                                                                    ),
                                                                onConfirm: () =>
                                                                    apagarUsuario(
                                                                        v.id
                                                                    ),
                                                            })
                                                        }
                                                    >
                                                        <FontAwesomeIcon
                                                            icon={faTrash}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </motion.table>
                    ) : (
                        <motion.div
                            className="usuarios-page__vazio"
                            variants={variantsItem}
                        >
                            <p className="usuarios-page__vazio--mensagem">
                                Sem resultados
                            </p>
                            <motion.div
                                whileTap={{ scale: 0.85 }}
                                className="usuarios-page__cadastrar"
                            >
                                <button
                                    title="Cadastrar novo aluno"
                                    onClick={() => setAddItem(true)}
                                >
                                    <span>
                                        <FontAwesomeIcon icon={faUserPlus} />
                                    </span>
                                    Cadastrar novo usuário
                                </button>
                            </motion.div>
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
                            if (editItem)
                                setUsuarios((v) => [
                                    ...v.filter((u) => u.id !== usuario.id),
                                    usuario,
                                ]);
                            else setUsuarios((v) => [...v, usuario]);
                        }}
                        onCancel={() => {
                            setAddItem(false);
                            setEditItem("");
                        }}
                    />
                )}

                {gerarConvite && (
                    <CadastroConviteModal
                        key={"gerar-convite-modal"}
                        onCancel={() => setGerarConvite(false)}
                    />
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
