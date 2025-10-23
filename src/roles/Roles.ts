import type { Roles } from "./RolesType";

export const ROLES = {
    PASTOR_PRESIDENTE: "pastor_presidente",
    SUPER_ADMIN: "super_admin",
    PASTOR: "pastor",
    SECRETARIO_CONGREGACAO: "secretario_congregacao",
    PROFESSOR: "professor",
    SECRETARIO_CLASSE: "secretario_classe",
} as const;

export const RolesLabel: { [key in Roles]: string } = {
    [ROLES.PASTOR_PRESIDENTE]: "Pastor Presidente",
    [ROLES.SUPER_ADMIN]: "Administrador do Ministério",
    [ROLES.PASTOR]: "Pastor",
    [ROLES.SECRETARIO_CONGREGACAO]: "Secretário da Congregação",
    [ROLES.PROFESSOR]: "Professor (a)",
    [ROLES.SECRETARIO_CLASSE]: "Secretário de Classe",
};
