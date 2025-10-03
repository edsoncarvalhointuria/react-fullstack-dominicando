import type { Timestamp } from "firebase/firestore";

export const getIdade = (data_nascimento: Timestamp) => {
    const hoje = new Date();
    const nascimento = data_nascimento.toDate();

    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() <= nascimento.getDate()))
        idade--;

    return idade;
};
