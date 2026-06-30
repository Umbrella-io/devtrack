import { getServerAuthSession } from "@/lib/server-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import CareerIntelligence from "@/components/career-intelligence/CareerIntelligence";

export default async function CareerIntelligencePage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/");
  return <CareerIntelligence />;
}
