import raw from "@/data/vocabulary.json";
import type { VocabItem } from "./types";

export const VOCAB: VocabItem[] = (raw as { items: VocabItem[] }).items;
export const VOCAB_BY_ID = new Map(VOCAB.map((v) => [v.id, v]));
