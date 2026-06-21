import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

interface SistemaIgreja {
    ministerioId: string;
    igrejaId: string;
    classes: {
        [classeId: string]: {
            licoes: number;
            aulas: number;
        };
    };
}
interface SistemaMinisterio {
    ministerioId: string;
    pedidos: number;
    preparo: number;
}

export const getSistemaIgreja = async (ministerioId: string, igrejaId: string): Promise<Partial<SistemaIgreja>> => {
    try {
        const collectionDoc = doc(db, "sistema", ministerioId, "igrejas", igrejaId);
        const sistemaSnap = await getDoc(collectionDoc);

        if (!sistemaSnap.exists()) return {};

        const sistema = sistemaSnap.data() as SistemaIgreja;
        return sistema;
    } catch (error: any) {
        console.log("houve esse erro", error);
        return {};
    }
};
export const getSistemaMinisterio = async (ministerioId: string): Promise<Partial<SistemaMinisterio>> => {
    try {
        const sistemaDoc = doc(db, "sistema", ministerioId);
        const sistemaSnap = await getDoc(sistemaDoc);

        if (!sistemaSnap.exists()) return {};

        const sistema = sistemaSnap.data() as SistemaMinisterio;
        return sistema;
    } catch (error: any) {
        console.log("houve esse erro", error);
        return {};
    }
};

interface HouveAtualizacaoIgreja {
    houveAtualizacao: boolean;
    item: "licoes" | "aulas";
    classes:
        | {
              [classeId: string]: {
                  licoes: number;
                  aulas: number;
              };
          }
        | undefined;
    data: number;
    key: string;
    itemLocalStorage: any;
    classeId: string;
}
export const houveAtualizacaoIgreja = async (
    ministerioId: string,
    igrejaId: string,
    classeId: string,
    item: "licoes" | "aulas",
) => {
    const { classes } = await getSistemaIgreja(ministerioId, igrejaId);

    const key = `sistema_${igrejaId}`;
    const data = classes?.[classeId]?.[item] || 1;
    const itemLocalStorage = JSON.parse(localStorage.getItem(key) || "{}");
    const dataLocalStorage = Number(itemLocalStorage?.[classeId]?.[item]) || 0;

    const houveAtualizacao = data > dataLocalStorage;

    return { houveAtualizacao, item, classes, data, key, itemLocalStorage, classeId };
};

export const salvarSistemaLocalStorageIgreja = ({
    houveAtualizacao,
    classes,
    itemLocalStorage,
    classeId,
    data,
    item,
    key,
}: HouveAtualizacaoIgreja) => {
    if (houveAtualizacao && classes) {
        const obj = itemLocalStorage[classeId];
        if (obj) obj[item] = data;
        else itemLocalStorage[classeId] = { [item]: data };

        localStorage.setItem(key, JSON.stringify(itemLocalStorage || null));
    }
};

interface houveAtualizacaoMinisterio {
    houveAtualizacao: boolean;
    data: number;
    itemLocalStorage: any;
    key: string;
    sistema: Partial<SistemaMinisterio>;
    item: keyof Omit<SistemaMinisterio, "ministerioId">;
}
export const houveAtualizacaoMinisterio = async (
    ministerioId: string,
    item: keyof Omit<SistemaMinisterio, "ministerioId">,
) => {
    const sistema = await getSistemaMinisterio(ministerioId);

    const key = `sistema_${ministerioId}`;
    const data = sistema?.[item] || 1;
    const itemLocalStorage = JSON.parse(localStorage.getItem(key) || "{}");
    const dataLocalStorage = Number(itemLocalStorage?.[item]) || 0;

    const houveAtualizacao = data > dataLocalStorage;

    return { houveAtualizacao, data, itemLocalStorage, key, sistema, item };
};

export const salvarSistemaLocalStorageMinisterio = ({
    houveAtualizacao,
    sistema,
    item,
    data,
    itemLocalStorage,
    key,
}: houveAtualizacaoMinisterio) => {
    if (houveAtualizacao && sistema?.[item]) {
        itemLocalStorage[item] = data;
        localStorage.setItem(key, JSON.stringify(itemLocalStorage || null));
    }
};
