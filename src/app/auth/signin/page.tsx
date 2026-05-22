import Link from "next/link";

export default function SignInPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b1120] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-8 shadow-2xl text-center">

        <h1 className="text-4xl font-bold text-white mb-3">
          DevTrack
        </h1>

        <p className="text-gray-400 mb-8">
          Track your developer journey, GitHub activity, and coding consistency.
        </p>

        <Link
          href="/api/auth/signin/github?callbackUrl=/dashboard"
          className="w-full inline-flex items-center justify-center gap-3 bg-white text-black font-semibold py-3 rounded-xl hover:scale-[1.02] transition-all duration-200"
        >
          Sign in with GitHub
        </Link>
      </div>
    </main>
  );
}