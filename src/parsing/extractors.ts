import { decimalPrice } from "./regex";

export const getDecimalPrice = (text: string) => {
  const match = text.match(decimalPrice);
  if (!match) {
    return null;
  }
  const parsed = parseFloat(match[0]);
  if (isNaN(parsed)) {
    return null;
  }
  return parsed;
};
