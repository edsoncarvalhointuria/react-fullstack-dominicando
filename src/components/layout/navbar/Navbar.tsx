import { useEffect, useMemo, useRef, useState } from "react";
import DesktopNavbar from "./DesktopNavbar";
import "./navbar.scss";

import MobileNavbar from "./MobileNavbar";
import { useAuthContext } from "../../../context/AuthContext";
import { ROLES } from "../../../roles/Roles";
import {
    faBagShopping,
    faBookOpen,
    faChartColumn,
    faCircleQuestion,
    faFilePen,
    faHouse,
} from "@fortawesome/free-solid-svg-icons";

function Navbar() {
    const OPCOES_NAV: NavbarItemInterface[] = [
        { texto: "Início", caminho: "/dashboard", icon: faHouse },
        { texto: "Chamada", caminho: "/aulas", icon: faFilePen },
        { texto: "Relatórios", caminho: "/relatorios", icon: faChartColumn },
        {
            texto: "Gestão",
            dropdown: [
                { texto: "Igrejas", caminho: "/igrejas", superAdmin: true },
                {
                    texto: "Rótulos Classes",
                    caminho: "/rotulos-classes",
                    superAdmin: true,
                },
                { texto: "Classes", caminho: "/classes", admin: true },
                { texto: "Membros", caminho: "/membros", admin: true },
                { texto: "Alunos", caminho: "/alunos" },
                { texto: "Matriculas", caminho: "/matriculas" },
                { texto: "Visitas", caminho: "/visitas" },
                { texto: "Usuários", caminho: "/usuarios" },
                // {
                //     texto: "Notificações",
                //     caminho: "/notificacoes",
                //     professor: true,
                // },
                { texto: "Comp. PIX", caminho: "/comprovantes" },
                {
                    texto: "Trimestres",
                    caminho: "/trimestres",
                    superAdmin: true,
                },
            ],
        },
        {
            texto: "Preparo",
            caminho: "/preparo",
            notRoles: [ROLES.SECRETARIO_CLASSE],
            icon: faBookOpen,
        },
        {
            texto: "Pedidos",
            caminho: "/pedidos",
            notRoles: [ROLES.PROFESSOR, ROLES.SECRETARIO_CLASSE],
            icon: faBagShopping,
        },
        { texto: "Ajuda", caminho: "/ajuda", icon: faCircleQuestion },
    ];
    const TAMANHO_MOBILE = 1010;
    const [isMobile, setIsMobile] = useState(
        window.innerWidth <= TAMANHO_MOBILE,
    );
    const { isSuperAdmin, isAdmin, user, logout } = useAuthContext();

    const isMobileRef = useRef(isMobile);

    const listaFiltrada = useMemo(
        () =>
            OPCOES_NAV.map((item) => {
                if (item.dropdown) {
                    return {
                        ...item,
                        dropdown: item.dropdown.filter(
                            (v) =>
                                (!v.superAdmin && !v.admin && !v.professor) ||
                                (v.superAdmin && isSuperAdmin.current) ||
                                (v.admin &&
                                    (isAdmin.current ||
                                        isSuperAdmin.current)) ||
                                (v.professor &&
                                    (user?.role === ROLES.PROFESSOR ||
                                        isAdmin.current ||
                                        isSuperAdmin.current)),
                        ),
                    };
                } else if (!item.notRoles) return item;
                else if (!item.notRoles.includes(user?.role)) return item;
            }).filter(Boolean),
        [OPCOES_NAV],
    );

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
                    OPCOES={listaFiltrada as any}
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
