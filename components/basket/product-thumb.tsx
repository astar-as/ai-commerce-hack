import Image from "next/image";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductThumb({ product, size = 56, className }: { product: Product; size?: number; className?: string }) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-2xl bg-surface", className)}
      style={{ width: size, height: size }}
    >
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes={`${size * 2}px`}
          className="object-contain p-1.5 mix-blend-multiply"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-display text-xl text-subtle">
          {product.name.charAt(0)}
        </div>
      )}
    </div>
  );
}
