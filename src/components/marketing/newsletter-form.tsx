"use client";

import { useState, type FormEvent } from "react";
import { Check, Mail } from "lucide-react";

export function NewsletterForm() {
  const [done, setDone] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDone(true);
  };

  if (done) {
    return (
      <p className="flex w-full max-w-sm items-center gap-2 rounded-xl bg-white/20 px-4 py-3 text-sm font-bold ring-1 ring-white/30">
        <Check className="size-4" /> You&apos;re on the list. Thank you!
      </p>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-sm items-center gap-2 rounded-xl bg-white/15 p-1.5 ring-1 ring-white/25 backdrop-blur-sm"
    >
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <div className="flex min-w-0 flex-1 items-center gap-2 pl-2">
        <Mail size={16} className="shrink-0 text-white/70" />
        <input
          id="footer-email"
          type="email"
          name="email"
          required
          placeholder="Your email"
          className="min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-white outline-none placeholder:text-white/70"
        />
      </div>
      <button
        type="submit"
        className="rounded-lg bg-white px-4 py-2.5 text-xs font-extrabold text-primary transition hover:bg-white/90"
      >
        Subscribe
      </button>
    </form>
  );
}
