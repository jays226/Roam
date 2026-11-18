export function sanitizeTemplateText(value: unknown, privateNames?: string[]): string;
export function sanitizeTemplateUrl(value: unknown): string | null;
export function privacySafeBlocks(blocks: Record<string, unknown>[], privateNames?: string[]): {
  type: string;
  title: string;
  note: string;
  place: string;
  url: string | null;
  day_index: number;
  start_time: string | null;
  end_time: string | null;
  span_nights: number;
  photo_id: string | null;
}[];
