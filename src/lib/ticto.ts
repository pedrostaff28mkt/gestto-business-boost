const TICTO_CHECKOUT_URL = "https://payment.ticto.app/O579353BE";

export function buildTictoCheckoutUrl(name: string, email: string): string {
  return `${TICTO_CHECKOUT_URL}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;
}

export function openTictoCheckout(name: string, email: string) {
  window.open(buildTictoCheckoutUrl(name, email), "_blank", "noopener,noreferrer");
}
