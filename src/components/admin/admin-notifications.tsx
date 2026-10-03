"use client";

import { useState, useEffect } from "react";
import { Bell, Send, Users, User } from "lucide-react";
import { phpApi, ApiError, NotificationItem } from "@/lib/php-api";

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-surface-2/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";
const labelClass = "text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground";

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    phpApi.adminNotificationsList(50)
      .then((r) => setNotifications(r.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess(""); setSending(true);
    try {
      await phpApi.createAdminNotification({ title, message, user_id: userId ? Number(userId) : null });
      setSuccess("Notification sent.");
      setTitle(""); setMessage(""); setUserId("");
      const r = await phpApi.adminNotificationsList(50);
      setNotifications(r.notifications);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send notification.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-7">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Notifications</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">Notifications</h1>
        <p className="mt-2 text-sm text-muted-foreground">Send notifications to individual users or broadcast to all.</p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{success}</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Create Notification</h2>
          <form onSubmit={send} className="mt-5 flex flex-col gap-4">
            <label className={labelClass}>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} className={`${inputClass} mt-1.5`} required minLength={2} maxLength={160} />
            </label>
            <label className={labelClass}>
              Message
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="min-h-28 w-full rounded-xl border border-line bg-surface-2/60 p-3.5 text-sm outline-none focus:border-primary" required maxLength={5000} />
            </label>
            <label className={labelClass}>
              User ID (optional)
              <input type="number" min="1" value={userId} onChange={(e) => setUserId(e.target.value)} className={`${inputClass} mt-1.5`} placeholder="Leave empty for broadcast" />
            </label>
            <button type="submit" disabled={sending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white transition hover:bg-primary/90 disabled:opacity-60">
              <Send size={16} /> {sending ? "Sending..." : userId ? "Send to User" : "Broadcast to All"}
            </button>
          </form>
        </section>

        <section className="ui-card rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-extrabold">Notification History</h2>
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="mt-4 flex max-h-[500px] flex-col gap-2 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                        {n.user_id ? <User size={14} /> : <Users size={14} />}
                      </span>
                      <div>
                        <p className="text-sm font-bold">{n.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {n.user_id ? `User #${n.user_id}` : "Broadcast"} · {new Date(n.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${n.read_at ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>
                      {n.read_at ? "Read" : "Unread"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
