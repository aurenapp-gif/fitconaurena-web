import type { Metadata } from "next";
import Link from "next/link";
import ScrollReveal from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Blog | Fit con Aurena — Fitness, nutrición y hábitos",
  description: "Artículos sobre entrenamiento, nutrición, pérdida de grasa y ganancia de músculo. Contenido basado en ciencia, sin mitos ni dietas milagro.",
};

const featured = {
  category: "Nutrición",
  title: "Por qué contar calorías no es suficiente: lo que nadie te explica",
  excerpt: "Llevas semanas contando calorías y el peso no se mueve. No es tu metabolismo, es que el conteo tiene errores sistemáticos que la mayoría ignora. Te explicamos cómo hacerlo bien.",
  readTime: "8 min",
  date: "10 May 2026",
  color: "#F472B6",
};

const articles = [
  { category: "Entrenamiento", title: "Cuántas veces a la semana deberías entrenar según tu objetivo", excerpt: "La respuesta no es 'más es mejor'. La frecuencia óptima depende de tu nivel, recuperación y objetivo. Aquí la guía definitiva.", readTime: "6 min", date: "8 May 2026", color: "#F59E0B" },
  { category: "Hábitos", title: "El método de los 2 minutos para no perder nunca la racha de entrenamiento", excerpt: "James Clear lo llama identidad basada en sistemas. Nosotros lo hemos adaptado al fitness. Funciona mejor que cualquier motivación.", readTime: "5 min", date: "5 May 2026", color: "#8B5CF6" },
  { category: "Nutrición", title: "Proteína: cuánta necesitas realmente y en qué alimentos está", excerpt: "1,6g por kilo de peso corporal es el mínimo para construir músculo. Pero no todos los alimentos son iguales. Guía práctica y sin suplementos necesarios.", readTime: "7 min", date: "2 May 2026", color: "#F472B6" },
  { category: "Entrenamiento", title: "Cardio antes o después del entrenamiento de fuerza: el debate terminado", excerpt: "La ciencia tiene una respuesta clara. Y depende de tu objetivo. Te damos la respuesta en menos de 2 minutos de lectura.", readTime: "4 min", date: "28 Abr 2026", color: "#F59E0B" },
  { category: "Hábitos", title: "Cómo dormir mejor para acelerar tus resultados en el gym", excerpt: "La hormona del crecimiento se libera mayoritariamente durante el sueño. Si duermes mal, estás dejando resultados sobre la mesa. Guía práctica.", readTime: "6 min", date: "25 Abr 2026", color: "#0EA5E9" },
  { category: "Nutrición", title: "Comer fuera de casa sin arruinar tu progreso: 12 estrategias reales", excerpt: "Las dietas fracasan los fines de semana y en los restaurantes. No porque seas débil, sino porque nadie te ha dado las herramientas correctas.", readTime: "9 min", date: "22 Abr 2026", color: "#F472B6" },
];

const categories = ["Todos", "Nutrición", "Entrenamiento", "Hábitos", "Ciencia"];

export default function BlogPage() {
  return (
    <main>
      <section className="pt-28 pb-16 text-center" style={{ background: "linear-gradient(150deg, #FFFFFF 0%, #FFF0F5 55%, #FCE7F3 100%)" }}>
        <div className="container-content">
          <ScrollReveal>
            <span className="inline-block text-xs font-bold tracking-widest uppercase mb-4 px-3 py-1 rounded-full" style={{ background: "rgba(244,114,182,0.12)", color: "#EC4899" }}>Blog</span>
            <h1 className="text-4xl sm:text-5xl font-black mt-2 mb-4 leading-tight text-ink">Fitness sin{" "}<span style={{ color: "#F472B6" }}>mitos ni bullshit</span></h1>
            <p className="text-lg max-w-lg mx-auto text-ink-muted">Artículos basados en ciencia sobre entrenamiento, nutrición y hábitos. Lo que funciona de verdad.</p>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-6 bg-white border-b border-gray-100 sticky top-[64px] z-30">
        <div className="container-wide">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button key={cat} className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors" style={cat === "Todos" ? { background: "#EC4899", color: "#fff" } : { background: "#F3F4F6", color: "#6B7280" }}>{cat}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="pt-12 pb-6 bg-cream">
        <div className="container-wide">
          <ScrollReveal>
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #EC4899 0%, #F472B6 100%)" }}>
              <div className="p-8 sm:p-12">
                <span className="inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>{featured.category} · Artículo destacado</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white mt-3 mb-4 max-w-2xl leading-tight">{featured.title}</h2>
                <p className="text-base max-w-xl mb-6" style={{ color: "rgba(255,255,255,0.85)" }}>{featured.excerpt}</p>
                <div className="flex items-center gap-4">
                  <Link href="/blog/por-que-contar-calorias-no-es-suficiente" className="inline-flex items-center justify-center gap-2 font-semibold cursor-pointer rounded-xl" style={{ padding: "12px 24px", background: "white", color: "#EC4899", fontSize: "14px" }}>Leer artículo<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{featured.readTime} lectura · {featured.date}</span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="pb-20 bg-cream">
        <div className="container-wide">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, i) => (
              <ScrollReveal key={article.title} delay={i * 60}>
                <article className="card h-full flex flex-col hover:shadow-card-hover transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full" style={{ background: `${article.color}15`, color: article.color }}>{article.category}</span>
                    <span className="text-xs text-ink-muted">{article.readTime}</span>
                  </div>
                  <h3 className="font-bold text-ink text-base leading-snug mb-3 flex-1">{article.title}</h3>
                  <p className="text-sm text-ink-muted leading-relaxed mb-4">{article.excerpt}</p>
                  <div className="flex items-center justify-between mt-auto pt-4" style={{ borderTop: "1px solid #F3F4F6" }}>
                    <span className="text-xs text-ink-muted">{article.date}</span>
                    <Link href="#" className="text-sm font-semibold flex items-center gap-1" style={{ color: "#EC4899" }}>Leer<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg></Link>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <div className="mt-14 rounded-2xl p-8 sm:p-10 text-center" style={{ background: "rgba(244,114,182,0.06)", border: "2px solid rgba(244,114,182,0.2)" }}>
              <h3 className="text-xl font-black text-ink mb-2">Recibe los mejores artículos en tu email</h3>
              <p className="text-sm text-ink-muted mb-6">Sin spam. Solo contenido de valor, 1 vez a la semana.</p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input type="email" placeholder="tu@email.com" className="flex-1 px-4 py-3 rounded-xl text-sm border text-ink" style={{ background: "#fff", borderColor: "#E5E7EB" }} />
                <button type="submit" className="btn-primary text-sm flex-shrink-0" style={{ padding: "12px 24px" }}>Suscribirme</button>
              </form>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
  );
}
