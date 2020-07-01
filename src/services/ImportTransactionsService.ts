import fs from 'fs';
import csvParse from 'csv-parse';
import { getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface TransactionCVS {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const categoriesRepository = getRepository(Category);

    const transactionsRepository = getRepository(Transaction);

    const regReadStream = fs.createReadStream(filePath);

    const parser = csvParse({ from_line: 2 });

    const parseCSV = regReadStream.pipe(parser);

    const transactions: TransactionCVS[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      transactions.push({ title, type, value, category });

      categories.push(category);
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const categoriesFound = await categoriesRepository.find({
      where: { title: In(categories) },
    });

    const categoriesFoundTitles = categoriesFound.map(
      (category: Category) => category.title,
    );

    const categoriesTitlesToAdd = categories
      .filter(category => !categoriesFoundTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      categoriesTitlesToAdd.map(title => ({ title })),
    );

    await categoriesRepository.save(newCategories);

    const allCategories = [...newCategories, ...categoriesFound];

    const newTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(newTransactions);

    return newTransactions;
  }
}

export default ImportTransactionsService;
