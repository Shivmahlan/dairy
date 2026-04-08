import { calculateTotalAmount } from "./calculations";
import type {
  ItemTransactionInput,
  MilkEntryInput,
  TransactionInput,
} from "./types";

function parsePositiveNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return parsedValue;
}

export function validateMilkEntry(input: MilkEntryInput) {
  if (!input.date || !input.shift || input.weight.trim() === "" || input.fat.trim() === "") {
    return { error: "Date, shift, milk weight, and fat are required." };
  }

  const weight = parsePositiveNumber(input.weight);
  const fat = parsePositiveNumber(input.fat);

  if (weight === null || fat === null) {
    return { error: "Milk weight and fat must be valid numbers." };
  }

  if (weight < 0 || fat < 0) {
    return { error: "Milk weight and fat cannot be negative." };
  }

  return {
    error: null,
    payload: {
      date: input.date,
      shift: input.shift,
      weight,
      fat,
      total_amount: calculateTotalAmount(weight, fat),
    },
  };
}

export function validateTransaction(input: TransactionInput) {
  if (!input.date || !input.type || input.amount.trim() === "") {
    return { error: "Date, type, and amount are required." };
  }

  const amount = parsePositiveNumber(input.amount);

  if (amount === null) {
    return { error: "Amount must be a valid number." };
  }

  if (amount < 0) {
    return { error: "Amount cannot be negative." };
  }

  return {
    error: null,
    payload: {
      date: input.date,
      type: input.type,
      amount,
      note: input.note.trim() ? input.note.trim() : null,
    },
  };
}

export function validateItemTransaction(input: ItemTransactionInput) {
  if (
    !input.date ||
    !input.shift ||
    !input.type ||
    !input.itemName.trim() ||
    input.amount.trim() === ""
  ) {
    return {
      error: "Date, shift, item name, type, and amount are required.",
    };
  }

  const amount = parsePositiveNumber(input.amount);

  if (amount === null) {
    return { error: "Amount must be a valid number." };
  }

  if (amount < 0) {
    return { error: "Amount cannot be negative." };
  }

  return {
    error: null,
    payload: {
      date: input.date,
      shift: input.shift,
      item_name: input.itemName.trim(),
      type: input.type,
      amount,
      note: input.note.trim() ? input.note.trim() : null,
    },
  };
}
