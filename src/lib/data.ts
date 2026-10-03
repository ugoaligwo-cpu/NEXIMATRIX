export type InvestmentPlan = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  min: number;
  max: number;
  duration: number;
  projectedReturn: number;
  referralBonus: number;
  featured?: boolean;
  features: string[];
};

// Public marketing content only. It is not an executable financial product.
export const plans: InvestmentPlan[] = [
  {
    id: "basic",
    name: "Basic",
    eyebrow: "Investment Plan",
    description: "Start with a smaller amount and earn daily profit.",
    min: 100,
    max: 499,
    duration: 7,
    projectedReturn: 15,
    referralBonus: 0,
    features: ["Daily profit", "7 day duration"],
  },
  {
    id: "premium",
    name: "Premium",
    eyebrow: "Investment Plan",
    description: "Increase your investment and receive referral rewards.",
    min: 500,
    max: 1499,
    duration: 7,
    projectedReturn: 15,
    referralBonus: 2,
    features: ["Daily profit", "2% referral bonus"],
  },
  {
    id: "grand",
    name: "Grand",
    eyebrow: "Investment Plan",
    description: "Our highest returning plan with a 10% referral bonus.",
    min: 1500,
    max: 4999,
    duration: 7,
    projectedReturn: 25,
    referralBonus: 10,
    features: ["Daily profit", "10% referral bonus"],
  },
];

export const testimonials: Array<{
  name: string;
  role: string;
  quote: string;
}> = [
  {
    name: "Sarah Mitchell",
    role: "Platform User",
    quote: "The account management tools are straightforward and the support team responds quickly. Exactly what I needed.",
  },
  {
    name: "David Chen",
    role: "Platform User",
    quote: "Clean interface, transparent processes, and reliable notifications. I can track everything from one dashboard.",
  },
  {
    name: "Amara Okafor",
    role: "Platform User",
    quote: "The deposit and withdrawal workflows are clear, and the admin review process gives me confidence in the platform.",
  },
];

export const faqs = [
  { question: "How do I sign up?", answer: "Click the sign-up button on the homepage." },
  { question: "How do I contact support?", answer: "Sign in and use the Support page to create a secure request for the support team." },
  { question: "What are your Terms of Use and Privacy Policy?", answer: "Go to our terms of use and privacy policy pages (links in the footer of the site)." },
];
