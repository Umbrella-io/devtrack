import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

   return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-4 text-white">DevTrack</h1>
        <p className="text-xl text-slate-400 mb-8">
          Open-source developer productivity dashboard. Track coding habits,
          visualize GitHub contributions, and hit your goals.
        </p>
        
        <div className="flex flex-col items-center gap-6">
          <Link
            href="/signin"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Sign In
          </Link>

          <a
            href="https://github.com/Priyanshu-byte-coder/devtrack"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 hover:text-slate-300"
          >
            View on GitHub
          </a>
        </div>
      </div>
    </main>
  );
  
}