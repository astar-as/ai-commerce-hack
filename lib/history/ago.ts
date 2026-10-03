// "2 weeks ago" for receipt dates, shown as the order-item note when a product is re-added from history.
export const ago = (days: number) =>
  days <= 1 ? "yesterday" : days < 7 ? `${days} days ago` : days < 11 ? "last week" : days < 25 ? `${Math.round(days / 7)} weeks ago` : `${days} days ago`;
