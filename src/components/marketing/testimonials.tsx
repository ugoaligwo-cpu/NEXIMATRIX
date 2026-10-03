import { MessageSquareQuote, Star } from "lucide-react";
import { testimonials } from "@/lib/data";
import { siteConfig } from "@/config/site";

export function Testimonials() {
  if (testimonials.length === 0) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <div className="ui-card flex flex-col items-center gap-4 rounded-2xl px-6 py-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary">
            <MessageSquareQuote size={24} />
          </span>
          <h3 className="text-lg font-extrabold tracking-tight">
            Verified investor feedback is coming soon
          </h3>
          <p className="max-w-lg text-sm leading-6 text-muted-foreground">
            We publish feedback from {siteConfig.name} investors once each
            account has been verified. In the meantime, explore how the platform
            works or get in touch with our support team.
          </p>
          <div className="mt-1 flex items-center gap-1.5" aria-hidden>
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="size-4 fill-primary/25 text-primary/25" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden py-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[var(--shell-warm)] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[var(--shell-warm)] to-transparent"
      />
      <div className="marquee-track gap-5">
        {[...testimonials, ...testimonials].map((testimonial, index) => (
          <article
            key={`${testimonial.name}-${index}`}
            className="ui-card w-[320px] shrink-0 rounded-2xl p-6"
          >
            <div className="flex gap-0.5 text-primary">
              {Array.from({ length: 5 }).map((_, starIndex) => (
                <Star key={starIndex} className="size-3.5 fill-current" />
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              “{testimonial.quote}”
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-xs font-extrabold text-primary">
                {testimonial.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{testimonial.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {testimonial.role}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
