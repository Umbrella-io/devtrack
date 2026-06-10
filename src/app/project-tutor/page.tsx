import { getServerAuthSession } from "@/lib/server-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProjectTutorClient from "@/components/ProjectTutorClient";

export default async function ProjectTutorPage() {
  const session = await getServerAuthSession();
  if (!session) redirect("/api/auth/signin/github?callbackUrl=/project-tutor");

  return <ProjectTutorClient username={session.user?.name ?? ""} />;
}