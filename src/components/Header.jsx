import OwlMark from "./OwlMark";
import AccountMenu from "./AccountMenu";
import SyncBadge from "./SyncBadge";

export default function Header({ user, onReload, onUsers, onPassword, onSignOut }) {
  return (
    <header className="sticky top-0 z-30 border-b border-ink-600/70 bg-ink-900/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <OwlMark size={36} />
          <h1 className="truncate font-display text-lg font-extrabold tracking-tight text-mist-50 sm:text-xl">Contas do mês</h1>
        </div>
        <div className="flex items-center gap-2">
          <SyncBadge onReload={onReload} />
          <AccountMenu user={user} onUsers={onUsers} onPassword={onPassword} onSignOut={onSignOut} />
        </div>
      </div>
    </header>
  );
}
