namespace MyFinances.Data.Entities;

/// <summary>Kind of account. German labels: Girokonto, Kreditkarte, Tagesgeld, Bargeld, Sonstiges.</summary>
public enum AccountType
{
    Checking,
    CreditCard,
    Savings,
    Cash,
    Other,
}

/// <summary>Whether a category groups income or expense bookings.</summary>
public enum CategoryKind
{
    Expense,
    Income,
}

/// <summary>Direction of a booking. Transfers are modelled separately (<see cref="Transfer"/>).</summary>
public enum TransactionType
{
    Income,
    Expense,
}
