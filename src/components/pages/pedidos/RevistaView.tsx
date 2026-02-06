import {
    faCalendar,
    faHandHoldingDollar,
    faMinus,
    faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { motion } from "framer-motion";
import { useEffect } from "react";
import {
    useController,
    type Control,
    type UseFormSetFocus,
    type UseFormSetValue,
} from "react-hook-form";

function RevistaView({
    rotulo,
    tipoRevista,
    preco,
    onInvalid,
    form,
}: {
    rotulo: RotulosClassesInterface;
    tipoRevista: string;
    preco: number;
    onInvalid?: boolean;
    form?: {
        control: Control<any>;
        setValue: UseFormSetValue<any>;
        setFocus: UseFormSetFocus<any>;
        path: string;
        required: boolean;
        defaultValue?: number;
    };
}) {
    const field = form
        ? useController({
              control: form.control,
              name: form.path,
              defaultValue: form.defaultValue,
              rules: {
                  required: form.required ? "Campo obrigatório" : false,
              },
          })
        : undefined;

    useEffect(() => {
        if (field) form?.setValue(form.path, form.defaultValue);
    }, [form?.defaultValue]);
    return (
        <div
            className="pedidos-formulario__view"
            onClick={
                field
                    ? () => {
                          form?.setFocus(form.path);
                      }
                    : undefined
            }
        >
            <div
                className={`pedidos-formulario__view-revista ${(onInvalid || (field && field.fieldState.error?.message)) && "invalid"}`}
            >
                <div className="pedidos-formulario__view-revista__header">
                    <h4>
                        {rotulo?.name || "Rótulo"}
                        <span>{" - "}</span>
                        {tipoRevista || "Tipo de Revista"}
                        {form?.required && <span className="required">*</span>}
                    </h4>

                    {typeof rotulo?.idade_minima === "number" && (
                        <div className="pedidos-formulario__view-revista__idades">
                            {rotulo?.idade_maxima ? (
                                <>
                                    <div className="pedidos-formulario__view-revista__idade">
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faCalendar}
                                            />
                                        </span>
                                        <p>{rotulo.idade_minima} anos</p>
                                    </div>
                                    <div className="pedidos-formulario__view-revista__idade">
                                        <span>
                                            <FontAwesomeIcon
                                                icon={faCalendar}
                                            />
                                        </span>
                                        <p>{rotulo.idade_maxima} anos</p>
                                    </div>
                                </>
                            ) : (
                                <div className="pedidos-formulario__view-revista__idade">
                                    <span>
                                        <FontAwesomeIcon icon={faCalendar} />
                                    </span>
                                    <p>
                                        A partir dos {rotulo.idade_minima} anos
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="pedidos-formulario__view-revista__body">
                    <div className="pedidos-formulario__view-revista__preco">
                        <span>
                            <FontAwesomeIcon icon={faHandHoldingDollar} />
                        </span>
                        <p>
                            {preco.toLocaleString("pt-BR", {
                                currency: "BRL",
                                style: "currency",
                            })}
                        </p>
                    </div>
                    <div className="pedidos-formulario__view-revista__campo">
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={
                                form
                                    ? (e) => {
                                          e.stopPropagation();
                                          form?.setValue(
                                              form.path,
                                              field &&
                                                  Number(field.field.value) > 0
                                                  ? Number(field.field.value) -
                                                        1
                                                  : 0,
                                          );
                                      }
                                    : undefined
                            }
                        >
                            <FontAwesomeIcon icon={faMinus} />
                        </motion.button>
                        <input
                            type="number"
                            {...field?.field}
                            onBlur={
                                field
                                    ? () => {
                                          const value = Number(
                                              field.field.value,
                                          );
                                          if (value < 0 || isNaN(value))
                                              form?.setValue(form.path, 0);
                                          else form?.setValue(form.path, value);
                                      }
                                    : undefined
                            }
                        />
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={
                                form
                                    ? (e) => {
                                          e.stopPropagation();
                                          form.setValue(
                                              form.path,
                                              field &&
                                                  Number(field.field.value) < 0
                                                  ? 1
                                                  : Number(field?.field.value) +
                                                        1,
                                          );
                                      }
                                    : undefined
                            }
                        >
                            <FontAwesomeIcon icon={faPlus} />
                        </motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RevistaView;
