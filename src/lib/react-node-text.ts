import { isValidElement, type ReactNode } from "react";

/** Ekstrak teks dari ReactNode untuk filter pencarian dropdown. */
export function getReactNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(getReactNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getReactNodeText(node.props.children);
  }
  return "";
}

export function matchesSearchQuery(label: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return label.toLowerCase().includes(q);
}
