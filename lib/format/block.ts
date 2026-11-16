import type { BuildingBlock } from "@/lib/api/types";

/** "Очередь A · Блок 1" — a block's name with its stage, wherever blocks
 * are picked from a flat list. */
export function blockLabel(block: Pick<BuildingBlock, "name" | "stage">): string {
  return block.stage ? `Очередь ${block.stage} · ${block.name}` : block.name;
}

/** Blocks grouped by stage, keeping the API's build order inside and across
 * groups; blocks without a stage come last. */
export function groupBlocksByStage<T extends Pick<BuildingBlock, "stage">>(
  blocks: T[],
): { stage: string | null; blocks: T[] }[] {
  const groups = new Map<string | null, T[]>();
  for (const block of blocks) {
    const list = groups.get(block.stage) ?? [];
    list.push(block);
    groups.set(block.stage, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === null ? 1 : 0) - (b === null ? 1 : 0))
    .map(([stage, list]) => ({ stage, blocks: list }));
}
