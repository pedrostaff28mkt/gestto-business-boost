// Geração de payload PIX "copia e cola" (BR Code EMV) — simulado para o MVP.

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const clean = (v: string, max: number) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max) || "GESTTO";

export function buildPixPayload(input: {
  pixKey: string;
  amount: number;
  merchantName: string;
  merchantCity: string;
  txid?: string;
}) {
  const merchantAccount = tlv("00", "br.gov.bcb.pix") + tlv("01", input.pixKey);
  const partial =
    tlv("00", "01") +
    tlv("26", merchantAccount) +
    tlv("52", "0000") +
    tlv("53", "986") +
    tlv("54", input.amount.toFixed(2)) +
    tlv("58", "BR") +
    tlv("59", clean(input.merchantName, 25)) +
    tlv("60", clean(input.merchantCity, 15)) +
    tlv("62", tlv("05", clean(input.txid ?? "GESTTO", 25))) +
    "6304";

  return partial + crc16(partial);
}

export function cardFees(input: {
  amount: number;
  installments: number;
  debitFee: number;
  creditFee: number;
  installmentFee: number;
  isDebit: boolean;
}) {
  const rate = input.isDebit
    ? input.debitFee
    : input.creditFee + (input.installments > 1 ? input.installmentFee * (input.installments - 1) : 0);
  const fee = (input.amount * rate) / 100;
  return { rate, fee, net: input.amount - fee };
}
