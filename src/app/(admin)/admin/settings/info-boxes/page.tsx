import type { Metadata } from "next";
import { InfoBoxes } from "@/components/admin/info-boxes";

export const metadata: Metadata = { title: "Info Box Settings" };

export default function InfoBoxesPage() {
  return <InfoBoxes />;
}
