export const siteConfig = {
  name: "Neximatrix.com",
  title: "Neximatrix.com",
  description:
    "Neximatrix.com provides profitable investment plans, multiple payment options, and daily profits through a secure investment platform.",
  heroText: "The Future of Investing. You Dream It, We Make It Happen",
  heroDescription:
    "Neximatrix.com provides a profitable investment plan, multiple payment options, and a guarantee of daily profits.",
  email: "support@neximatrix.com",
  phone: "(231) 618-6924",
  address: "29792 Feest Port Apt. 720, South Gayville, ND 55573",
  logo: "/neximatrix-logo.png",
  icon: "/neximatrix-icon.png",
  primaryColor: "#f8812d",
  currency: "USD",
  currencyCode: "USD",
  currencySymbol: "$",
  depositMin: 100,
  depositMax: 10000,
  withdrawalMin: 100,
  withdrawalMax: 10000,
  withdrawalFee: 10,
  totalUsers: 345986,
  totalDeposit: 10364957,
  totalEarning: 55836485,
  nav: [
    { label: "Home", href: "/" },
    { label: "Investment Plans", href: "/invest-plans" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Help", href: "/help" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
} as const;

export type SiteNavigation = (typeof siteConfig.nav)[number];
