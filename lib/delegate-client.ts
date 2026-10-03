import type { DelegateOutput } from "@/lib/types";

export async function readDelegate(res: Response, onProgress?: (text: string) => void): Promise<DelegateOutput> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let out: DelegateOutput | null = null;
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line) as { type: string; text?: string } & DelegateOutput;
      if (msg.type === "progress" && msg.text) onProgress?.(msg.text);
      else if (msg.type === "result") out = msg;
    }
    if (done) break;
  }
  if (!out) throw new Error("no result");
  return out;
}
