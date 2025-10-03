import type { Roles } from "../roles/RolesType";

interface UsuarioInterface {
    classeId: string;
    classeNome: string;
    email: string;
    igrejaId: string;
    igrejaNome: string;
    ministerioId: string;
    nome: string;
    role: Roles;
    uid: string;
    id: string;
}
