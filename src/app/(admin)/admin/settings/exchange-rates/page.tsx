import type { Metadata } from "next";
import { ExchangeRates } from "@/components/admin/exchange-rates";

export const metadata: Metadata = { title: "Exchange Rates" };

export default function ExchangeRatesPage() {
  return <ExchangeRates />;
}
