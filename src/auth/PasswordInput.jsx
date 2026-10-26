import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { inputCls } from "../components/ui";

// Campo de senha com botão de mostrar/ocultar (ajuda muito a digitar no celular).
export default function PasswordInput({ id, autoComplete, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} className={`${inputCls} pr-11`} autoCapitalize="none" spellCheck={false} {...props} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-mist-300 hover:text-mist-50"
      >
        {show ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}
