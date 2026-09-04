import Link from "next/link";
import MemberMenu from "./MemberMenu";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-line bg-page/90 backdrop-blur-md">
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="font-black text-lg tracking-tight text-ink">
          Programa <span className="text-brand">FITCON</span>
        </Link>
        <MemberMenu />
      </div>
    </header>
  );
}
