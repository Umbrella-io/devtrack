"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useState } from "react";

function getInitial(name?: string | null) {
  return name?.trim().charAt(0).toUpperCase() || "?";
}

export default function UserAvatar() {
  const { data: session } = useSession();
  const [imageFailed, setImageFailed] = useState(false);

  const name = session?.user?.name ?? session?.githubLogin ?? "GitHub user";
  const image = session?.user?.image;
  const showImage = image && !imageFailed;

  return (
    <div className="flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800/80 px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-sm font-semibold text-white">
        {showImage ? (
          <Image
            src={image}
            alt={`${name} avatar`}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full object-cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span aria-hidden="true">{getInitial(name)}</span>
        )}
      </div>
      <span className="max-w-32 truncate text-sm font-medium text-slate-100">
        {name}
      </span>
    </div>
  );
}
