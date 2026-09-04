/**
 * All money in the app is stored and computed as integer paise (₹1 = 100 paise)
 * to avoid floating-point drift. These helpers are the only place that should
 * ever convert to/from rupee display strings.
 */

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/** Formats paise as an Indian-grouped rupee string, e.g. 8750000 -> "₹87,500". */
export function formatPaise(paise: number, opts?: { showDecimals?: boolean }): string {
  const rupees = paiseToRupees(paise);
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: opts?.showDecimals ? 2 : 0,
    minimumFractionDigits: opts?.showDecimals ? 2 : 0,
  });
  return formatter.format(rupees);
}

/** Sum an array of paise amounts safely (integers only, no float accumulation). */
export function sumPaise(amounts: number[]): number {
  return amounts.reduce((total, amount) => total + Math.round(amount), 0);
}

export function calculateOrderTotals(input: {
  guestCount: number;
  pricePerPlatePaise: number;
  extraLineItemsPaise: number[]; // per-plate extras already multiplied out, or flat extras
  serviceChargePaise: number;
  transportChargePaise: number;
  equipmentChargePaise: number;
  staffChargePaise: number;
  otherChargesPaise: number;
  discountPaise: number;
  taxEnabled: boolean;
  taxPercentage: number; // e.g. 5 for 5%
}) {
  const foodAmountPaise = input.guestCount * input.pricePerPlatePaise;
  const extrasPaise = sumPaise(input.extraLineItemsPaise);
  const chargesPaise = sumPaise([
    input.serviceChargePaise,
    input.transportChargePaise,
    input.equipmentChargePaise,
    input.staffChargePaise,
    input.otherChargesPaise,
  ]);

  const subtotalPaise = foodAmountPaise + extrasPaise + chargesPaise - input.discountPaise;
  const taxAmountPaise = input.taxEnabled
    ? Math.round((subtotalPaise * input.taxPercentage) / 100)
    : 0;
  const grandTotalPaise = subtotalPaise + taxAmountPaise;

  return { foodAmountPaise, extrasPaise, chargesPaise, subtotalPaise, taxAmountPaise, grandTotalPaise };
}

export function paymentStatus(
  grandTotalPaise: number,
  totalPaidPaise: number,
  eventDateISO: string
): "not_paid" | "partially_paid" | "paid" | "overdue" {
  if (totalPaidPaise >= grandTotalPaise && grandTotalPaise > 0) return "paid";
  const eventIsPast = new Date(eventDateISO).getTime() < Date.now();
  if (totalPaidPaise > 0) {
    return eventIsPast && totalPaidPaise < grandTotalPaise ? "overdue" : "partially_paid";
  }
  return eventIsPast ? "overdue" : "not_paid";
}
