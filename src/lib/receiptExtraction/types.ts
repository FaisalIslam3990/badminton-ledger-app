export type ExtractedFields = {
  date: string;
  vendor: string;
  amount: number;
  category: string;
  note: string;
};

export type ExtractionMethod = "template" | "heuristic" | "ai";
