import { redirect } from "next/navigation";

/** La página principal es el acceso para miembros: quien entra a la web va
 * directo a identificarse. La captación se hace desde /aplicar. */
export default function HomePage() {
  redirect("/miembros/acceso");
}
