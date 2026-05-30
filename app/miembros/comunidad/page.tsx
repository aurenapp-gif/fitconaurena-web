import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CommunityFeed from "@/components/CommunityFeed";
import { isAdmin } from "@/lib/members";
import { requireMember } from "@/lib/guard";
import { sbSelect } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Comunidad", robots: { index: false, follow: false } };

type Post = {
  id: string;
  author_email: string;
  author_name: string | null;
  kind: "win" | "recipe";
  title: string | null;
  body: string;
  image_path: string | null;
  created_at: string;
};

export default async function ComunidadPage() {
  const email = await requireMember();
  const admin = isAdmin(email);

  let posts: Post[] = [];
  let likes: Record<string, { count: number; mine: boolean }> = {};

  try {
    const rows = await sbSelect<Post>(
      "community_posts",
      "select=*&order=created_at.desc&limit=100"
    );
    posts = rows;

    const ids = posts.map((p) => p.id);
    if (ids.length) {
      const likeRows = await sbSelect<{ post_id: string; member_email: string }>(
        "community_likes",
        `select=post_id,member_email&post_id=in.(${ids.join(",")})`
      );
      const counts: Record<string, { count: number; mine: boolean }> = {};
      for (const id of ids) counts[id] = { count: 0, mine: false };
      for (const r of likeRows) {
        const c = counts[r.post_id] || { count: 0, mine: false };
        c.count++;
        if (r.member_email === email) c.mine = true;
        counts[r.post_id] = c;
      }
      likes = counts;
    }
  } catch (e) {
    console.error("[comunidad] error", e);
  }

  return (
    <>
      <Navbar />
      <main className="relative pt-16 min-h-screen">
        <div className="container-content relative z-10 py-16">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <span className="section-tag">Área de miembros</span>
              <h1 className="section-title">Comunidad</h1>
            </div>
          </div>
          <CommunityFeed role={admin ? "coach" : "member"} initialPosts={posts} initialLikes={likes} />
        </div>
      </main>
    </>
  );
}
