import type { Roles } from "../roles/RolesType";

interface AppUser {
    uid: string | null;
    email: string | null;
    nome: string | null;
    role: Roles;
    igrejaId: string | null;
    igrejaNome: string | null;
    ministerioId: string | null;
    classeId: string | null;
    classeNome: string | null;
}
