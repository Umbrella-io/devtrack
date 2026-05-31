export async function saveDashboardLayout(userId: string, layout: string[]) {
  await fetch("/api/dashboard/layout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, layout }),
  });
}

export async function getDashboardLayout(userId: string) {
  const res = await fetch(`/api/dashboard/layout?userId=${userId}`);
  return res.json();
}


