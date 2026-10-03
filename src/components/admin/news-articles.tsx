"use client";

import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { phpApi } from "@/lib/php-api";

type Article = { id: number; title: string; slug: string; status: string; published_at: string | null };

export function NewsArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    phpApi.adminNewsArticles()
      .then((r) => setArticles(r.articles as unknown as Article[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Content</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">News & Articles</h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage news articles and announcements.</p>
      </header>

      <section className="ui-card rounded-2xl p-5 sm:p-6">
        {loading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading articles...</p>
        ) : articles.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No articles yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <tr>
                  <th className="pb-3">Title</th>
                  <th className="pb-3">Slug</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Published</th>
                </tr>
              </thead>
              <tbody>
                {articles.map((a) => (
                  <tr key={a.id} className="border-b border-line/50 last:border-0">
                    <td className="py-3 font-bold">{a.title}</td>
                    <td className="py-3 text-muted-foreground">/{a.slug}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${a.status === "published" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{a.status}</span>
                    </td>
                    <td className="py-3 text-muted-foreground">{a.published_at ? new Date(a.published_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
