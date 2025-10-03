import { useEffect } from "react";
import Login from "./components/pages/login/Login";
import { useAuthContext } from "./context/AuthContext";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Dashboard from "./components/pages/dashboard/Dashboard";
import ProtectRoute from "./components/config/ProtectRoute";
import DashboardLayout from "./components/layout/DashboardLayout";
import { AnimatePresence } from "framer-motion";
import Aulas from "./components/pages/aulas/Aulas";
import Chamada from "./components/pages/chamada/Chamada";
import Alunos from "./components/pages/alunos/Alunos";
import Igrejas from "./components/pages/igrejas/Igrejas";
import Relatorios from "./components/pages/relatorios/Relatorios";
import RelatorioDominical from "./components/pages/relatorios/RelatorioDominical";
import Classes from "./components/pages/classes/Classes";
import Usuarios from "./components/pages/usuarios/Usuarios";
import RelatoriosGraficos from "./components/pages/relatorios/RelatoriosGraficos";
import Matriculas from "./components/pages/matriculas/Matriculas";
import RelatorioCSV from "./components/pages/relatorios/RelatorioCSV";
import MinhaConta from "./components/pages/minha_conta/MinhaConta";
import Visitas from "./components/pages/visitas/Visitas";
import Cadastrar from "./components/pages/cadastrar/Cadastrar";
import CadastrarMinisterio from "./components/pages/cadastrar/CadastrarMinisterio";
import CadastrarUsuario from "./components/pages/cadastrar/CadastrarUsuario";
import Membros from "./components/pages/membros/Membros";

function App() {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (user) {
            const from = location.state?.from;

            if (from) navigate(from);
            else navigate("/dashboard");
        }
    }, [user]);
    return (
        <main>
            <AnimatePresence>
                <Routes>
                    <Route path="/" key={location.key} element={<Login />} />

                    <Route path="/cadastrar">
                        <Route
                            path=""
                            element={<Cadastrar />}
                            key={location.key}
                        />
                        <Route
                            path="ministerio"
                            element={<CadastrarMinisterio />}
                            key={location.key}
                        />
                        <Route
                            path="usuario/:codigo?"
                            element={<CadastrarUsuario />}
                            key={location.key}
                        />
                    </Route>

                    <Route
                        element={
                            <ProtectRoute>
                                <DashboardLayout />
                            </ProtectRoute>
                        }
                    >
                        <Route path="/dashboard" element={<Dashboard />} />

                        <Route path="/aulas">
                            <Route
                                children
                                path="igreja/:igrejaId?/classe?/:classeId?"
                                element={<Aulas key={location.key} />}
                            />
                            <Route
                                children
                                path=":igrejaId/:classeId/:licaoId/:numeroAula"
                                element={<Chamada />}
                            />
                            <Route
                                children
                                path="classe/:classeId?"
                                element={<Aulas />}
                            />
                            <Route
                                path=""
                                element={<Aulas key={location.key} />}
                            />
                        </Route>

                        <Route path="minha-conta" element={<MinhaConta />} />

                        <Route path="/igrejas" element={<Igrejas />} />
                        <Route path="/classes" element={<Classes />} />
                        <Route path="/membros" element={<Membros />} />
                        <Route path="/alunos" element={<Alunos />} />
                        <Route path="/matriculas" element={<Matriculas />} />
                        <Route path="/usuarios" element={<Usuarios />} />
                        <Route path="/visitas" element={<Visitas />} />
                        <Route path="/relatorios">
                            <Route
                                path="dominical/:igrejaId"
                                element={<RelatorioDominical />}
                            />
                            <Route
                                path="dominical"
                                element={<RelatorioDominical />}
                            />
                            <Route
                                path="graficos"
                                element={<RelatoriosGraficos />}
                            />
                            <Route path="csv" element={<RelatorioCSV />} />
                            <Route path="" element={<Relatorios />} />
                        </Route>
                    </Route>
                </Routes>
            </AnimatePresence>
        </main>
    );
}

export default App;
