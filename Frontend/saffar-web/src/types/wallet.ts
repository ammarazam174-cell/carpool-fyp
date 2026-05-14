export type TransactionType = "TopUp" | "RidePayment" | "Refund" | "DriverEarning";
export type TransactionStatus = "Pending" | "Success" | "Failed";

export type WalletBalance = {
  walletId: string;
  balance: number;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
};

export type TopUpResult = {
  message: string;
  transactionId: string;
  referenceId: string;
  status: TransactionStatus;
  newBalance: number;
};
