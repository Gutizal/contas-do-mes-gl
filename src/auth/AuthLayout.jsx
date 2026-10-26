import OwlMark from "../components/OwlMark";
import { Card } from "../components/ui";

// Moldura comum das telas de acesso (login, aguardando aprovação, nova senha…).
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <OwlMark size={64} />
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-mist-50">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-mist-300">{subtitle}</p>}
          </div>
        </div>
        <Card className="p-5 sm:p-6">{children}</Card>
      </div>
    </main>
  );
}
