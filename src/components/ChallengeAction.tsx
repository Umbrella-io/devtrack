"use client";

import React, { useState } from "react";
import ChallengeCreationModal from "./ChallengeCreationModal";

export default function ChallengeAction() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex w-full sm:w-auto justify-center items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-500 shadow-sm shadow-emerald-500/20 transition-all hover:bg-emerald-500/20 hover:shadow-md hover:scale-[1.02] active:scale-95"
      >
        Issue a Challenge
      </button>
      <ChallengeCreationModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
