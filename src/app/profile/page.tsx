import ProfileClient from "../../components/ProfileClient";
import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import Link from "next/link";
export default async function ProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.githubId) {
    // Instead of redirecting immediately, render a helpful sign-in prompt.
    return (
      <>
        <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 md:p-12 flex items-center justify-center">
          <div className="max-w-lg text-center space-y-4">
            <h1 className="text-3xl font-bold">Sign in to view your profile</h1>
            <p className="text-[var(--muted-foreground)]">You need to be signed in with GitHub to access your profile and account settings.</p>
            <div className="flex justify-center gap-3">
              <Link
                href="/api/auth/signin/github?callbackUrl=/profile"
                className="bg-[var(--card)] text-[var(--card-foreground)] px-6 py-3 rounded-lg font-semibold hover:bg-[var(--control)] transition"
              >
                Sign in with GitHub
              </Link>
              <Link href="/" className="px-6 py-3 rounded-lg border border-[var(--border)] text-[var(--foreground)]">Back</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <ProfileClient
      email={session.user?.email ?? null}
      displayName={session.user?.name ?? session.githubLogin ?? null}
      image={session.user?.image ?? null}
    />
  );
}
