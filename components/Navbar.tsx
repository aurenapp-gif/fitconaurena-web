import Link from "next/link";
import MemberMenu from "./MemberMenu";

export default function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[#161616] bg-[#0A0A0A]/90 backdrop-blur-md">
      <div className="container-wide flex items-center justify-between h-16">
        <Link href="/" className="font-black text-lg tracking-tight text-white">
          fit<span className="text-[#CAFF00]">con</span>aurena
        </Link>
        <MemberMenu />
      </div>
    </header>
  );
}
