const timeZone = "America/New_York";
const fmt = new Intl.DateTimeFormat("en", {
  timeZone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const parts = (d) => {
  const p = fmt.formatToParts(d);
  const y = p.find((x) => x.type === "year")?.value ?? "0000";
  const m = p.find((x) => x.type === "month")?.value ?? "00";
  const day = p.find((x) => x.type === "day")?.value ?? "00";
  return { y: parseInt(y, 10), m: parseInt(m, 10), d: parseInt(day, 10) };
};

const { y, m, d } = parts(new Date("2024-03-10T12:00:00Z")); // Simulate DST transition day

const todayStr = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const yesterdayDate = new Date(Date.UTC(y, m - 1, d - 1));
const yYesterday = yesterdayDate.getUTCFullYear();
const mYesterday = yesterdayDate.getUTCMonth() + 1;
const dYesterday = yesterdayDate.getUTCDate();

const yesterdayStr = `${String(yYesterday).padStart(4, "0")}-${String(mYesterday).padStart(2, "0")}-${String(dYesterday).padStart(2, "0")}`;

console.log({ today: todayStr, yesterday: yesterdayStr });
