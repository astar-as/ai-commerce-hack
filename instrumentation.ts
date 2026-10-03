export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warmSearch } = await import("@/lib/catalog/search");
  warmSearch().catch((err) => console.error("[warmSearch] Moss index load failed:", err instanceof Error ? err.message : err));
}
