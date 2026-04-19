/**
 * Memetakan value Select (biasanya id entitas) ke label yang aman ditampilkan ke user.
 */

export function labelForHotelValue(
  hotels: { id: string; name: string }[] | undefined,
  value: unknown,
): string | null {
  if (value == null || value === "") return null;
  const h = (hotels ?? []).find((x) => String(x.id) === String(value));
  return h?.name ?? null;
}

export function labelForUnitValue(
  units: { id: string; name: string; code: string }[] | undefined,
  value: unknown,
): string | null {
  if (value == null || value === "") return null;
  const u = (units ?? []).find((x) => String(x.id) === String(value));
  return u ? `${u.name} (${u.code})` : null;
}

export function labelForSnackCategoryValue(
  categories: { id: string; name: string; codePrefix?: string }[] | undefined,
  value: unknown,
  options?: { withPrefix?: boolean },
): string | null {
  if (value == null || value === "") return null;
  const c = (categories ?? []).find((x) => String(x.id) === String(value));
  if (!c) return null;
  const withPrefix = options?.withPrefix !== false;
  if (!withPrefix) return c.name;
  return c.codePrefix ? `${c.name} (${c.codePrefix})` : c.name;
}
