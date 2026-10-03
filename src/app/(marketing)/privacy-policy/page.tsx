import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { PageSection } from "@/components/ui/page-section";
import { CallToAction } from "@/components/marketing/cta";
import { PageHero } from "@/components/marketing/page-hero";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy And Policy",
  description: "Neximatrix.com privacy and policy information.",
};

const sections = [
  {
    heading: "1. Information We Collect",
    body: "",
    items: [
      "Personal Information: Name, email address, phone number, and other details provided during registration.",
      "Account Data: Details of your profile, support requests, notifications, and activity history.",
      "Technical Information: IP address, browser type, device information, and usage statistics.",
    ],
  },
  {
    heading: "2. How We Use Your Information",
    body: "",
    items: [
      "To provide and improve our services, including account management and customer support.",
      "To provide secure account access, support, and notifications.", 
      "To communicate updates, offers, and relevant information about Neximatrix.com.",
      "To comply with legal and regulatory requirements.",
    ],
  },
  {
    heading: "3. Data Security",
    body:
      "We implement advanced security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. Your data is encrypted and stored on secure servers.",
    items: [],
  },
  {
    heading: "4. Sharing Your Information",
    body:
      "We do not sell or rent your personal information to third parties. We may share your data with trusted partners only when necessary to provide our services or comply with legal obligations.",
    items: [],
  },
  {
    heading: "5. Your Rights",
    body:
      "You have the right to access, update, or delete your personal information. You may also opt out of receiving marketing communications by adjusting your account preferences.",
    items: [],
  },
  {
    heading: "6. Updates to This Policy",
    body:
      "Neximatrix.com may update this Privacy Policy from time to time. We will notify you of significant changes by posting the updated policy on our platform or sending you a notification.",
    items: [],
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        icon={ScrollText}
        title={
          <>
            Privacy <span className="text-primary">and Policy</span>
          </>
        }
        description="How we collect, use, and safeguard your personal information when you use the Neximatrix.com platform."
      />

      <PageSection tone="base" spacing="lg" width="narrow">
        <div className="flex flex-col gap-10">
          <p className="text-[15px] leading-8 text-muted-foreground md:text-base md:leading-9">
            At {siteConfig.name}, we value your privacy and are committed to
            protecting your personal information. This Privacy Policy outlines
            how we collect, use, and safeguard your data when you use our
            platform.
          </p>

          {sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-3">
              <h2 className="text-lg font-extrabold tracking-tight md:text-xl">
                {section.heading}
              </h2>
              {section.body ? (
                <p className="text-[15px] leading-8 text-muted-foreground">
                  {section.body}
                </p>
              ) : null}
              {section.items.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {section.items.map((item) => (
                    <li
                      key={item}
                      className="flex gap-3 text-[15px] leading-7 text-muted-foreground"
                    >
                      <span
                        aria-hidden
                        className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary"
                      />
                      {item}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-extrabold tracking-tight md:text-xl">
              7. Contact Us
            </h2>
            <p className="text-[15px] leading-8 text-muted-foreground">
              If you have any questions or concerns about this Privacy Policy,
              please contact us at{" "}
              <a
                href={`mailto:${siteConfig.email}`}
                className="font-bold text-primary underline underline-offset-4 hover:opacity-80"
              >
                {siteConfig.email}
              </a>
              .
            </p>
          </section>
        </div>
      </PageSection>

      <CallToAction />
    </>
  );
}
