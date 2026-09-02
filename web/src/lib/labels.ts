import { AccountType } from '../api/generated/model/accountType'
import { CategoryKind } from '../api/generated/model/categoryKind'
import { TransactionType } from '../api/generated/model/transactionType'

export const accountTypeLabel: Record<AccountType, string> = {
  [AccountType.Checking]: 'Girokonto',
  [AccountType.CreditCard]: 'Kreditkarte',
  [AccountType.Savings]: 'Tagesgeld',
  [AccountType.Cash]: 'Bargeld',
  [AccountType.Other]: 'Sonstiges',
}

export const accountTypeOptions = Object.values(AccountType)

export const transactionTypeLabel: Record<TransactionType, string> = {
  [TransactionType.Income]: 'Einnahme',
  [TransactionType.Expense]: 'Ausgabe',
}

export const categoryKindLabel: Record<CategoryKind, string> = {
  [CategoryKind.Income]: 'Einnahmen',
  [CategoryKind.Expense]: 'Ausgaben',
}
