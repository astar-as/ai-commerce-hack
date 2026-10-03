// Mock checkout page: where "Checkout on Instacart" lands when there's no Instacart key
// (send_to_instacart mode "mock"). The whole list is in the `list` query param.
import Link from "next/link";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import { decodeMockCart } from "@/lib/tools/send_to_instacart";
import { PlaceOrderButton } from "./place-order-button";

export default async function MockCartPage({ searchParams }: PageProps<"/cart/mock">) {
  const { list } = await searchParams;
  const cart = typeof list === "string" ? decodeMockCart(list) : null;
  const count = cart?.items.reduce((n, item) => n + item.quantity, 0) ?? 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(env(safe-area-inset-top),20px)] pb-8">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-subtle">
        <ArrowLeft className="size-4" strokeWidth={2} />
        Back to Basket
      </Link>

      <p className="mt-6 text-[13px] font-medium tracking-wide text-subtle uppercase">Checkout preview</p>
      <h1 className="mt-1 font-display text-[28px] leading-tight text-ink">{cart?.title ?? "Your list"}</h1>
      <p className="mt-2 text-[14px] text-body">
        In production this list opens on Instacart, where you pick your store and check out.
      </p>

      {!cart ? (
        <p className="mt-10 text-[15px] text-subtle">This checkout link is empty or broken.</p>
      ) : (
        <>
          <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
            {cart.items.map((item, i) => (
              <li key={item.product_id ?? i} className="flex items-center gap-3.5 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-[13px] font-medium text-ink tabular">
                  {item.quantity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium leading-tight text-ink">{item.display_text ?? item.name}</p>
                  {(item.brand || item.health_filters?.length) && (
                    <p className="mt-0.5 truncate text-[13px] text-subtle">
                      {[item.brand, ...(item.health_filters ?? []).map((f) => f.toLowerCase().replace("_", "-"))]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-col gap-3 pt-8">
            <a
              href={`/api/kroger/login?list=${list}`}
              className="flex h-[60px] w-full items-center justify-center gap-2 rounded-full border border-navy text-[16px] font-medium text-navy transition-transform active:scale-[0.985]"
            >
              <ShoppingCart className="size-5" strokeWidth={2} />
              Add to my Kroger cart
            </a>
            <PlaceOrderButton label={`Place order · ${count} ${count === 1 ? "item" : "items"}`} list={typeof list === "string" ? list : undefined} />
          </div>
        </>
      )}
    </main>
  );
}
