import { useEffect, useRef, useState } from "react";

// Marca d'água viva: usa a logo enviada como base e sobrepõe um brilho azul
// no lugar do olho aberto. No desktop, o brilho segue o mouse com uma
// suavização contínua (lerp por frame) em vez de saltar de posição, e pulsa
// sempre, como se estivesse "vivo".
export default function OwlMark({ size = 40, className = "" }) {
  const ref = useRef(null);
  const dotRef = useRef(null);
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
      const eyeX = rect.left + rect.width * 0.342;
      const eyeY = rect.top + rect.height * 0.524;
      const dx = e.clientX - eyeX;
      const dy = e.clientY - eyeY;
      const dist = Math.hypot(dx, dy) || 1;
      const maxMove = rect.width * 0.035;
      const clamped = Math.min(dist, 220);
      const factor = (clamped / 220) * maxMove;
      target.current = { x: (dx / dist) * factor, y: (dy / dist) * factor };
    };

    let raf;
    const tick = () => {
      // suaviza o movimento em direção ao alvo a cada frame, em vez de saltar
      current.current.x += (target.current.x - current.current.x) * 0.12;
      current.current.y += (target.current.y - current.current.y) * 0.12;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
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
        ref={dotRef}
        className={`absolute rounded-full owl-eye-pulse ${ready ? "" : "opacity-0"}`}
        style={{
          width: size * 0.11,
          height: size * 0.11,
          left: `calc(34.2% - ${size * 0.055}px)`,
          top: `calc(52.4% - ${size * 0.055}px)`,
          background: "radial-gradient(circle, #7DF3FF 0%, #22C7EE 45%, rgba(34,199,238,0) 75%)",
          willChange: "transform",
        }}
      />
    </div>
  );
}
