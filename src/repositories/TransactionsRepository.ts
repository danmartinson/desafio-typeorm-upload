import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const balance = transactions.reduce(
      (result: Balance, transaction: Transaction) => {
        const res = result;
        switch (transaction.type) {
          case 'income':
            res.income += Number(transaction.value);
            break;
          case 'outcome':
            res.outcome += Number(transaction.value);
            break;
          default:
            break;
        }

        res.total = res.income - res.outcome;

        return res;
      },
      { income: 0, outcome: 0, total: 0 },
    );

    return balance;
  }
}

export default TransactionsRepository;
