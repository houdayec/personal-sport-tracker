export class EtsyDeposit {
    date: Date
    amount: number
    currency: string
    status: string
    bankAccountEnding: string

    constructor(data: {
        date: string
        amount: string | number
        currency: string
        status: string
        bankAccountEnding: string
    }) {
        this.date = new Date(data.date)
        this.amount = typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
        this.currency = data.currency
        this.status = data.status
        this.bankAccountEnding = data.bankAccountEnding
    }

    static fromCSV(row: Record<string, string>): EtsyDeposit {
        return new EtsyDeposit({
            date: row['Date'],
            amount: row['Amount'],
            currency: row['Currency'],
            status: row['Status'],
            bankAccountEnding: row['Bank Account Ending Digits'],
        })
    }
}
