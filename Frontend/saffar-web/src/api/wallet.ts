import api from "./axios";
import type { WalletBalance, Transaction, TopUpResult } from "../types/wallet";

export async function getWalletBalance(): Promise<WalletBalance> {
  const { data } = await api.get<WalletBalance>("/wallet/balance");
  return data;
}

export async function topUpWallet(
  amount: number,
  idempotencyKey?: string
): Promise<TopUpResult> {
  const { data } = await api.post<TopUpResult>(
    "/wallet/topup",
    { amount, idempotencyKey },
    idempotencyKey
      ? { headers: { "Idempotency-Key": idempotencyKey } }
      : undefined
  );
  return data;
}

export async function listWalletTransactions(limit = 50): Promise<Transaction[]> {
  const { data } = await api.get<Transaction[]>(`/wallet/transactions?limit=${limit}`);
  return data;
}
