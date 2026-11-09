"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { SessionUser } from "@/app/data/games";
import { useUser } from "./user-context";

interface NavChromeProps {
  isHome: boolean;
  isLibrary: boolean;
  isHall: boolean;
  isAbout: boolean;
  isAuth: boolean;
  user: SessionUser | null;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSignOut: () => void;
}

function NavChrome({
  isHome,
  isLibrary,
  isHall,
  isAbout,
  isAuth,
  user,
  open,
  onOpen,
  onClose,
  onSignOut,
}: NavChromeProps) {
  const activeClass = (active: boolean) => (active ? "active" : "");

  return (
    <>
      <nav className="av-nav">
        <Link href="/" className="logo" onClick={onClose}>
          <div className="logo-mark" />
          <div className="logo-text neon-cyan">
            ARCADE <span className="neon-magenta">VAULT</span>
          </div>
        </Link>

        <div className="links">
          <Link href="/" className={activeClass(isHome)}>
            Inicio
          </Link>
          <Link href="/games" className={activeClass(isLibrary)}>
            Biblioteca
          </Link>
          <Link href="/hall-of-fame" className={activeClass(isHall)}>
            Salón de la Fama
          </Link>
          <Link href="/about" className={activeClass(isAbout)}>
            Acerca de
          </Link>
        </div>

        <div className="spacer" />

        <div className="coin-counter">
          <span className="coin" />
          <span>CRÉDITOS · 03</span>
        </div>

        {user ? (
          <button
            type="button"
            className="btn ghost auth-btn"
            onClick={onSignOut}
          >
            {user.name} ▾
          </button>
        ) : (
          <Link href="/auth" className="btn auth-btn">
            Iniciar Sesión
          </Link>
        )}

        <button
          type="button"
          className="btn ghost hamburger"
          onClick={onOpen}
          aria-label="Menú"
        >
          ≡
        </button>
      </nav>

      <div
        className={"av-mobile-backdrop" + (open ? " open" : "")}
        onClick={onClose}
      />
      <aside className={"av-mobile-panel" + (open ? " open" : "")}>
        <div
          className="pixel neon-cyan"
          style={{ fontSize: 11, marginBottom: 16 }}
        >
          MENÚ
        </div>
        <Link href="/" className={activeClass(isHome)} onClick={onClose}>
          Inicio
        </Link>
        <Link href="/games" className={activeClass(isLibrary)} onClick={onClose}>
          Biblioteca
        </Link>
        <Link
          href="/hall-of-fame"
          className={activeClass(isHall)}
          onClick={onClose}
        >
          Salón de la Fama
        </Link>
        <Link href="/about" className={activeClass(isAbout)} onClick={onClose}>
          Acerca de
        </Link>
        <Link href="/auth" className={activeClass(isAuth)} onClick={onClose}>
          {user ? "Cuenta" : "Iniciar Sesión"}
        </Link>
        <div style={{ flex: 1 }} />
        <div
          className="pixel"
          style={{
            fontSize: 9,
            color: "var(--ink-faint)",
            letterSpacing: "0.16em",
          }}
        >
          CRÉDITOS · 03
        </div>
      </aside>
    </>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const { user, signOut } = useUser();
  const [open, setOpen] = useState(false);

  const isHome = pathname === "/";
  const isLibrary =
    pathname === "/games" ||
    pathname.startsWith("/games/") ||
    pathname.startsWith("/play/");
  const isHall = pathname === "/hall-of-fame";
  const isAbout = pathname === "/about";
  const isAuth = pathname === "/auth";

  return (
    <NavChrome
      isHome={isHome}
      isLibrary={isLibrary}
      isHall={isHall}
      isAbout={isAbout}
      isAuth={isAuth}
      user={user}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      onSignOut={signOut}
    />
  );
}

export function SiteNavFallback() {
  return (
    <NavChrome
      isHome={false}
      isLibrary={false}
      isHall={false}
      isAbout={false}
      isAuth={false}
      user={null}
      open={false}
      onOpen={() => {}}
      onClose={() => {}}
      onSignOut={() => {}}
    />
  );
}
