// Hard profile rules, enforced in the tools, so a product that breaks them can't reach
// the shopper or an order even if the model forgets the profile.
import type { Product } from '@/lib/types'
import type { Profile } from './store'

export function profileViolations(product: Product, profile: Profile | undefined): string[] {
  if (!profile) return []
  const reasons: string[] = []
  for (const a of profile.allergens) if (product.allergens.includes(a)) reasons.push(`contains ${a.replace('_', ' ')}`)
  for (const d of profile.diet) if (!product.diet_tags.includes(d)) reasons.push(`not ${d.replace('_', '-')}`)
  return reasons
}
