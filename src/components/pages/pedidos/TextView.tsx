import {
    useController,
    type Control,
    type UseFormSetFocus,
} from "react-hook-form";

function TextView({
    titulo,
    onInvalid,
    form,
}: {
    titulo: string;
    onInvalid?: boolean;
    form?: {
        path: string;
        control: Control<any>;
        required: boolean;
        setFocus: UseFormSetFocus<any>;
        defaultValue: string;
    };
}) {
    const field = form
        ? useController({
              name: form.path,
              control: form.control,
              rules: { required: form.required ? "Campo Obrigatório" : false },
              defaultValue: form.defaultValue,
          })
        : undefined;
    return (
        <div
            className={`pedidos-formulario__view ${!form && "view-only"}`}
            onClick={
                form
                    ? () => {
                          form.setFocus(form.path);
                      }
                    : undefined
            }
        >
            <div
                className={`pedidos-formulario__view-text ${onInvalid || (field && field.fieldState.error) ? "invalid" : ""}`}
            >
                <div className="pedidos-formulario__view-text__header">
                    <h4>
                        {titulo || "Título"}
                        {form && form.required ? <span>*</span> : <></>}
                    </h4>
                </div>

                <div className="pedidos-formulario__view-text__body">
                    <input
                        type="text"
                        name=""
                        placeholder="Sua Resposta"
                        {...field?.field}
                    />
                </div>
            </div>
        </div>
    );
}

export default TextView;
