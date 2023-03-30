import { decimalPrice } from "./regex";

export const getDecimalPrice = (text: string) => {
  const match = text.replace(/\s/g, "").match(decimalPrice);
  if (!match) {
    return null;
  }
  const parsed = parseFloat(match[0]);
  if (isNaN(parsed)) {
    return null;
  }
  return parsed;
};

export const normalizeString = (text: string) =>
  text.trim().replace(/[\n\t]/g, "");
