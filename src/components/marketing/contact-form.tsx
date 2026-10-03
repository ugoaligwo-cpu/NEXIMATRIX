"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, Mail, MapPin, Phone, Send } from "lucide-react";
import { siteConfig } from "@/config/site";

const channels = [
  { icon: MapPin, label: "Our Address", value: siteConfig.address, href: undefined },
  {
    icon: Mail,
    label: "Email Us",
    value: siteConfig.email,
    href: `mailto:${siteConfig.email}`,
  },
  {
    icon: Phone,
    label: "Call Us",
    value: siteConfig.phone,
    href: `tel:${siteConfig.phone.replace(/[^+\d]/g, "")}`,
  },
];

const fieldClass =
  "h-11 w-full rounded-xl border border-line bg-surface-2/60 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSent(true);
  };

  if (sent) {
    return (
      <div className="ui-card flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-success/12 text-success">
          <CheckCircle2 size={26} />
        </span>
        <h3 className="text-xl font-extrabold tracking-tight">Message received</h3>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          Thanks for reaching out. Our support team typically responds within
          1–2 hours — you can also email us directly at {siteConfig.email}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="ui-card flex flex-col gap-5 p-6 md:p-8">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Send us a message</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell us what you need and we&apos;ll get back to you shortly.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="contact-name" className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Full Name
          </label>
          <input
            id="contact-name"
            name="name"
            required
            autoComplete="name"
            placeholder="Enter your name"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="contact-email" className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="Enter your email"
            className={fieldClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-subject" className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          placeholder="What is this about?"
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="contact-message" className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          placeholder="Write your message here..."
          className="w-full resize-y rounded-xl border border-line bg-surface-2/60 px-3.5 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
      </div>

      <button
        type="submit"
        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-white shadow-[0_10px_30px_rgba(248,129,45,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-strong"
      >
        Send Message <Send size={17} />
      </button>
    </form>
  );
}

export function ContactChannels() {
  return (
    <div className="flex flex-col gap-6">
      {channels.map((item) => {
        const Icon = item.icon;
        const inner = (
          <>
            <span className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-white">
              <Icon size={21} />
            </span>
            <p className="mt-5 text-[11px] font-extrabold uppercase tracking-[0.15em] text-primary">
              {item.label}
            </p>
            <p className="mt-1.5 text-sm font-semibold leading-6 text-muted-foreground">
              {item.value}
            </p>
          </>
        );

        const className =
          "ui-card ui-card-hover group flex w-full flex-col items-center justify-center rounded-2xl p-6 text-center";

        return item.href ? (
          <a key={item.label} href={item.href} className={className}>
            {inner}
          </a>
        ) : (
          <div key={item.label} className={className}>
            {inner}
          </div>
        );
      })}

      <div className="ui-card flex items-center gap-4 rounded-2xl p-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
          <Clock3 size={21} />
        </span>
        <div>
          <h3 className="text-sm font-extrabold">Support Hours</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Available 24/7. We typically respond within 1–2 hours.
          </p>
        </div>
      </div>
    </div>
  );
}
