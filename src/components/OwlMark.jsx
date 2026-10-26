const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`;

export default function OwlMark({ size = 40, className = "" }) {
  return (
    <img
      src={LOGO_SRC}
      alt="Contas do mês"
      width={size}
      height={size}
      draggable={false}
      className={`shrink-0 select-none object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
