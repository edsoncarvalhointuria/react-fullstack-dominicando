import { motion, type Variants } from "framer-motion";
import "./tabela-de-gestao.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faGears,
    faSquareCheck,
    faSquareXmark,
    faTrash,
    faUserPen,
} from "@fortawesome/free-solid-svg-icons";

const variantsItem: Variants = {
    hidden: { y: -10, opacity: 0 },
    visible: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
};

interface Option {
    nome: string;
    id: string;
    icon: any;
    isFilter: boolean;
    placeholder: string;
    dataObject?: any;
    isBoolean?: boolean;
}

interface TabelaDeGestaoProps {
    options: Option[];
    onSelectOrder: (option: Option) => void;
    currentOrder: string;
    ordem: string;
    currentList: { [key: string]: any }[];
    onEdit: (value: any) => void;
    onDelete: (value: any) => void;
}

function TabelaDeGestao({
    options,
    onSelectOrder,
    currentOrder,
    ordem,
    currentList,
    onEdit,
    onDelete,
}: TabelaDeGestaoProps) {
    return (
        <motion.table variants={variantsItem} className="tabela-gestao__table">
            <thead>
                <tr>
                    {options.map((v, i) =>
                        v.isFilter ? (
                            <th key={v.id + i} onClick={() => onSelectOrder(v)}>
                                <div
                                    className={`sortable-header ${
                                        currentOrder === v.id && "order-select"
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
                                        <FontAwesomeIcon icon={v.icon} />
                                    </span>
                                    {v.nome}
                                </p>
                            </th>
                        )
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
                {currentList.map((v, i) => (
                    <tr key={v.id}>
                        {options.map((opt) =>
                            opt.dataObject ? (
                                <td key={opt.id + i} data-label={opt.nome}>
                                    {v[opt.id]
                                        ?.toDate()
                                        ?.toLocaleDateString(
                                            "pt-BR",
                                            opt.dataObject
                                        ) || opt.placeholder}
                                </td>
                            ) : opt.isBoolean ? (
                                <td key={opt.id + i} data-label={opt.nome}>
                                    {v[opt.id] ? (
                                        <span className="status--sim">
                                            <FontAwesomeIcon
                                                icon={faSquareCheck}
                                            />
                                        </span>
                                    ) : (
                                        <span className="status--nao">
                                            <FontAwesomeIcon
                                                icon={faSquareXmark}
                                            />
                                        </span>
                                    )}
                                </td>
                            ) : (
                                <td key={opt.id + i} data-label={opt.nome}>
                                    {v[opt.id] || opt.placeholder}
                                </td>
                            )
                        )}
                        <td data-label="Ações">
                            <div className="tabela-gestao__acoes">
                                <div
                                    className="tabela-gestao__table-acao"
                                    onClick={() => onEdit(v)}
                                >
                                    <FontAwesomeIcon icon={faUserPen} />
                                </div>
                                <div
                                    className="tabela-gestao__table-acao"
                                    onClick={() => onDelete(v)}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </div>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </motion.table>
    );
}

export default TabelaDeGestao;
