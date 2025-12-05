import { useNavigate } from "react-router-dom";
import SelectionGrid from "../../layout/selection_grid/SelectionGrid";
import { useAuthContext } from "../../../context/AuthContext";

function Relatorios() {
    const { isSecretario } = useAuthContext();
    const navigate = useNavigate();
    return (
        <>
            <SelectionGrid
                titulo="Opção"
                opcoes={
                    isSecretario.current
                        ? [
                              { nome: "Relatório Dominical", id: "dominical" },
                              { nome: "Relatórios Gráficos", id: "graficos" },
                              { nome: "Relatórios CSV", id: "csv" },
                          ]
                        : [
                              { nome: "Relatório Dominical", id: "dominical" },
                              {
                                  nome: "Relatório Trimestral",
                                  id: "trimestral",
                              },
                              { nome: "Relatórios Gráficos", id: "graficos" },
                              { nome: "Relatórios CSV", id: "csv" },
                          ]
                }
                onSelect={(retorno: string) => navigate(retorno)}
                sort={false}
            />
        </>
    );
}

export default Relatorios;
