/**
 * Minimal, `any`-free typings for custom Recharts tooltip content. Recharts
 * injects `active` / `payload` / `label` into the element passed to `content`.
 */
export type ChartTooltipEntry<TPayload = Record<string, unknown>> = {
  name?: string | number;
  value?: string | number;
  color?: string;
  fill?: string;
  payload?: TPayload;
};

export type ChartTooltipProps<TPayload = Record<string, unknown>> = {
  active?: boolean;
  payload?: ChartTooltipEntry<TPayload>[];
  label?: string | number;
};
