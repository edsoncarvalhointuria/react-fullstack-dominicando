import { useNavigate } from "react-router-dom";
import SelectionGrid from "../../layout/selection_grid/SelectionGrid";

function Relatorios() {
    const navigate = useNavigate();
    return (
        <>
            <SelectionGrid
                titulo="Opção"
                opcoes={[
                    { nome: "Relatório Dominical", id: "dominical" },
                    { nome: "Relatórios Gráficos", id: "graficos" },
                    { nome: "Relatórios CSV", id: "csv" },
                ]}
                onSelect={(retorno: string) => navigate(retorno)}
                sort={false}
            />
        </>
    );
}

export default Relatorios;
