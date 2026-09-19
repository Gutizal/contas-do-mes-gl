import { useEffect, useRef, useState } from "react";

// Marca d'água viva: a íris pintada foi recortada da imagem (ficou um
// "soquete" branco vazio no lugar do olho aberto), e essa íris inteira é
// desenhada aqui e reencaixada nesse buraco. Como ela é um elemento só,
// o olho inteiro se move junto ao mouse no desktop (sem nada parado por
// baixo) e pulsa sempre, como se estivesse vivo.
const EYE_CX = 35.97; // % da largura do container
const EYE_CY = 55.4; // % da altura do container
const EYE_DIAMETER = 19.4; // % da largura do container

export default function OwlMark({ size = 40, className = "" }) {
  const ref = useRef(null);
  const eyeRef = useRef(null);
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isFinePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
    setReady(true);
    if (!isFinePointer) return;

    const handleMove = (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const eyeX = rect.left + rect.width * (EYE_CX / 100);
      const eyeY = rect.top + rect.height * (EYE_CY / 100);
      const dx = e.clientX - eyeX;
      const dy = e.clientY - eyeY;
      const dist = Math.hypot(dx, dy) || 1;
      const maxMove = rect.width * 0.02;
      const clamped = Math.min(dist, 220);
      const factor = (clamped / 220) * maxMove;
      target.current = { x: (dx / dist) * factor, y: (dy / dist) * factor };
    };

    let raf;
    const tick = () => {
      current.current.x += (target.current.x - current.current.x) * 0.12;
      current.current.y += (target.current.y - current.current.y) * 0.12;
      if (eyeRef.current) {
        eyeRef.current.style.transform = `translate3d(calc(-50% + ${current.current.x}px), calc(-50% + ${current.current.y}px), 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener("mousemove", handleMove);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size }}>
      <img
        src="/logo.png"
        alt="Contas do mês"
        className="h-full w-full object-contain select-none pointer-events-none"
        draggable={false}
      />
      <span
        ref={eyeRef}
        className={`absolute rounded-full owl-eye-pulse ${ready ? "" : "opacity-0"}`}
        style={{
          width: `${EYE_DIAMETER}%`,
          height: `${EYE_DIAMETER}%`,
          left: `${EYE_CX}%`,
          top: `${EYE_CY}%`,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle at 38% 35%, #F2FEFF 0%, #8CF5FF 9%, #22C7EE 22%, #0B3A52 42%, #12456B 52%, #2E6FA8 68%, #3E7BFA 86%, rgba(62,123,250,0) 100%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
