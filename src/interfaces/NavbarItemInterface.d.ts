interface NavbarItemInterface {
    texto: string;
    caminho?: string;
    dropdown?: {
        texto: string;
        caminho?: string;
        superAdmin?: boolean;
        admin?: boolean;
        professor?: boolean;
    }[];
    notRoles?: any[];
}
