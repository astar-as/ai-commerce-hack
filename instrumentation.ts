export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.VERCEL) {
    process.env.HOME = "/tmp";
    process.env.XDG_CACHE_HOME ??= "/tmp/.cache";
  }
  const { warmSearch } = await import("@/lib/catalog/search");
  warmSearch().catch((err) => console.error("[warmSearch] Moss index load failed:", err instanceof Error ? err.message : err));
}
