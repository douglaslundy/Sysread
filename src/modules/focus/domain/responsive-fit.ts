export function fittedFocusFontSize(input: {
  afterWidth: number;
  availableWidth: number;
  beforeWidth: number;
  currentSize: number;
  minimumSize?: number;
  pivotWidth: number;
  preferredMaximum: number;
}): number {
  const requiredWidth = (2 * Math.max(input.beforeWidth, input.afterWidth)) + input.pivotWidth;
  if (requiredWidth <= 0 || input.availableWidth <= 0 || input.currentSize <= 0) return input.preferredMaximum;
  const fitted = Math.floor(input.currentSize * input.availableWidth / requiredWidth);
  return Math.max(input.minimumSize ?? 10, Math.min(input.preferredMaximum, fitted));
}

export function fittedLinearFontSize(input: {
  availableWidth: number;
  currentSize: number;
  measuredWidth: number;
  minimumSize?: number;
  preferredMaximum: number;
}): number {
  if (input.measuredWidth <= 0 || input.availableWidth <= 0 || input.currentSize <= 0) return input.preferredMaximum;
  const fitted = Math.floor(input.currentSize * input.availableWidth / input.measuredWidth);
  return Math.max(input.minimumSize ?? 10, Math.min(input.preferredMaximum, fitted));
}
