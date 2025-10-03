import type { AlunoInterface } from "./AlunoInterface";

interface ResponseGetRelatorioDominical {
    totais_gerais: { [key: string]: MatriculasInterface };
    totais_classes: MatriculasInterface;
    classes_relatorio: ClasseInterface[];
    aniversariantes: AlunoInterface[];
}
