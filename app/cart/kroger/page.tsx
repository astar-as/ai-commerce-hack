// Where /api/kroger/callback lands after putting the list into the shopper's real kroger.com cart.
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

export default async function KrogerCartPage({ searchParams }: PageProps<"/cart/kroger">) {
  const { added, skipped, error } = await searchParams;
  const count = Number(added ?? 0);
  const missed = Number(skipped ?? 0);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(env(safe-area-inset-top),20px)] pb-8">
      <Link href="/" className="inline-flex w-fit items-center gap-1.5 text-[14px] text-subtle">
        <ArrowLeft className="size-4" strokeWidth={2} />
        Back to Basket
      </Link>

      <p className="mt-6 text-[13px] font-medium tracking-wide text-subtle uppercase">Kroger cart</p>
      {error ? (
        <>
          <h1 className="mt-1 font-display text-[28px] leading-tight text-ink">Couldn&apos;t add to Kroger</h1>
          <p className="mt-2 text-[15px] text-body">{error}</p>
        </>
      ) : (
        <>
          <h1 className="mt-1 flex items-center gap-2 font-display text-[28px] leading-tight text-ink">
            <Check className="size-7 text-navy" strokeWidth={2.5} />
            {count} {count === 1 ? "item" : "items"} in your cart
          </h1>
          <p className="mt-2 text-[15px] text-body">
            Your list is in your kroger.com cart for pickup. Pick a time and check out on Kroger.
            {missed > 0 &&
              ` ${missed} ${missed === 1 ? "item wasn't a Kroger product" : "items weren't Kroger products"} and stayed off.`}
          </p>
        </>
      )}

      <div className="mt-auto pt-8">
        <a
          href="https://www.kroger.com/cart"
          target="_blank"
          rel="noreferrer"
          className="flex h-[60px] w-full items-center justify-center rounded-full bg-navy text-[16px] font-medium text-white transition-transform active:scale-[0.985]"
        >
          Open my Kroger cart
        </a>
      </div>
    </main>
  );
}
