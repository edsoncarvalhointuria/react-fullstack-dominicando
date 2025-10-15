import { useEffect, useRef, useState } from "react";
import DesktopNavbar from "./DesktopNavbar";
import "./navbar.scss";

import MobileNavbar from "./MobileNavbar";
import { useAuthContext } from "../../../context/AuthContext";

function Navbar() {
    const OPCOES_NAV: NavbarItemInterface[] = [
        { texto: "Início", caminho: "/dashboard" },
        { texto: "Aulas", caminho: "/aulas" },
        { texto: "Relatórios", caminho: "/relatorios" },
        {
            texto: "Gestão",
            dropdown: [
                { texto: "Igrejas", caminho: "/igrejas", superAdmin: true },
                { texto: "Classes", caminho: "/classes", admin: true },
                { texto: "Membros", caminho: "/membros", admin: true },
                { texto: "Alunos", caminho: "/alunos" },
                { texto: "Matriculas", caminho: "/matriculas" },
                { texto: "Visitas", caminho: "/visitas" },
                { texto: "Usuários", caminho: "/usuarios" },
                { texto: "Notificações", caminho: "/notificacoes" },
                { texto: "Comp. PIX", caminho: "/comprovantes" },
            ],
        },
        { texto: "Ajuda", caminho: "/ajuda" },
    ];
    const TAMANHO_MOBILE = 991;
    const [isMobile, setIsMobile] = useState(
        window.innerWidth <= TAMANHO_MOBILE
    );
    const { isSuperAdmin, isAdmin, user, logout } = useAuthContext();
    const isMobileRef = useRef(isMobile);

    const listaFiltrada = OPCOES_NAV.map((item) => {
        if (item.dropdown) {
            return {
                ...item,
                dropdown: item.dropdown.filter(
                    (v) =>
                        (!v.superAdmin && !v.admin) ||
                        (v.superAdmin && isSuperAdmin.current) ||
                        (v.admin && (isAdmin.current || isSuperAdmin.current))
                ),
            };
        } else return item;
    });

    useEffect(() => {
        const resize = (evt: UIEvent) => {
            const isM =
                (evt.currentTarget as Window).innerWidth <= TAMANHO_MOBILE;
            if (isM !== isMobileRef.current) {
                setIsMobile(isM);
                isMobileRef.current = isM;
            }
        };
        window.addEventListener("resize", resize);

        return () => window.removeEventListener("resize", resize);
    }, []);
    return (
        <>
            {isMobile ? (
                <MobileNavbar
                    OPCOES={listaFiltrada}
                    userName={(user?.nome || "").split(" ")[0]}
                    userEmail={user?.email || ""}
                    logout={logout}
                />
            ) : (
                <DesktopNavbar
                    OPCOES={listaFiltrada as NavbarItemInterface[]}
                    userName={(user?.nome || "").split(" ")[0]}
                    userEmail={user?.email || ""}
                    logout={logout}
                />
            )}
        </>
    );
}
export default Navbar;
