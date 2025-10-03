interface DataContextInterface {
    igrejas: IgrejaInterface[];
    setIgrejas: React.Dispatch<
        React.SetStateAction<
            {
                id: string;
                nome: string;
            }[]
        >
    >;
    classes: ClasseInterface[];
    setClasses: React.Dispatch<
        React.SetStateAction<
            {
                id: string;
                nome: string;
            }[]
        >
    >;
    isLoadingData: boolean;
    refetchData: () => void;
}
