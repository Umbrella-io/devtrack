"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function AcceptChallengeButton({ challengeId }: { challengeId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challengeId}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to accept challenge");
      }
      toast.success("Challenge accepted! Good luck!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleAccept} 
      disabled={loading} 
      className="w-full h-12 text-lg font-bold shadow-lg transition-transform hover:scale-105"
    >
      {loading ? "Accepting..." : "Accept Challenge"}
    </Button>
  );
}
