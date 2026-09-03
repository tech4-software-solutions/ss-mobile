const PHONE_RE = /^(\+94|0)?7\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function sanitizeText(value: string, maxLen = 120): string {
  return value.replace(/[<>"'`;]/g, "").trim().slice(0, maxLen);
}

export function validatePhone(phone: string): boolean {
  const normalized = phone.replace(/[\s-]/g, "");
  return PHONE_RE.test(normalized);
}

export function validateEmail(email: string): boolean {
  if (!email.trim()) return true;
  return EMAIL_RE.test(email.trim()) && email.length <= 254;
}

export function validateCheckoutDetails(details: {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryMethod: "pickup" | "delivery";
  address?: string;
}): string | null {
  const name = sanitizeText(details.customerName, 80);
  if (name.length < 2) return "Please enter a valid name";

  if (!validatePhone(details.customerPhone)) {
    return "Please enter a valid Sri Lankan mobile number (07X XXX XXXX)";
  }

  if (details.customerEmail && !validateEmail(details.customerEmail)) {
    return "Please enter a valid email address";
  }

  if (details.deliveryMethod === "delivery") {
    const address = sanitizeText(details.address || "", 300);
    if (address.length < 10) return "Please enter a complete delivery address";
  }

  return null;
}

export function validateCartSize(itemCount: number): boolean {
  return itemCount > 0 && itemCount <= 20;
}
