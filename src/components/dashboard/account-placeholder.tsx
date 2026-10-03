import type { LucideIcon } from "lucide-react";
import { ShieldCheck } from "lucide-react";

export function AccountPlaceholder({
  title,
  description,
  icon: Icon = ShieldCheck,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <section className="ui-card flex min-h-[360px] flex-col items-center justify-center rounded-2xl px-6 py-14 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
        <Icon size={26} />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-[-0.03em] sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <span className="mt-6 rounded-full border border-primary/25 bg-primary/8 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.14em] text-primary">
        Account management phase
      </span>
    </section>
  );
}
