import type { Metadata } from "next";
import { PaymentMethods } from "@/components/admin/payment-methods";

export const metadata: Metadata = { title: "Payment Methods" };
export default function PaymentMethodsPage() { return <PaymentMethods />; }
