import WrappedExperience from "@/components/WrappedExperience";
import { authOptions } from "@/lib/auth";
import { getServerAuthSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Year in Code | DevTrack",
  description: "A shareable annual recap of your coding activity.",
};

export default async function WrappedPage() {
  const session = await getServerAuthSession();

  if (!session || session.error === "TokenRevoked") {
    redirect("/");
  }

  return <WrappedExperience />;
}
