export const PAYMENT_METHODS = {
  PIX: { label: "PIX", icon: "📱" },
  CASH: { label: "Dinheiro", icon: "💵" },
  DEBIT_CARD: { label: "Cartão Débito", icon: "💳" },
  CREDIT_CARD: { label: "Cartão Crédito", icon: "💳" },
} as const;

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS;

export function getPaymentMethodLabel(method: string | null) {
  if (!method) return "—";
  return PAYMENT_METHODS[method as PaymentMethodKey]?.label || method;
}
