/** "LKR 2,450" (rupees, up to two decimals). */
export function formatLkr(amount: number): string {
  return `LKR ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
