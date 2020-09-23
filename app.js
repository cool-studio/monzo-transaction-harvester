const axios = require('axios')
const fs = require('fs')
const moment = require('moment')

const MonzoAPI = axios.default.create({
    baseURL: 'https://api.monzo.com',
    headers: {
        Authorization: `Bearer ${process.env.API_TOKEN}`
    }
})

// get accounts
const getAccounts = async (type) => {
    return await MonzoAPI.get(`/accounts${type ? `?account_type=${type}` : ''}`).then(e => e.data)
}

const getAccount = async (type = 'uk_business') => {
    const accounts = (await getAccounts(type)).accounts

    if (accounts.length > 0) {
        return accounts[0]
    }

    return null
}

const getTransactions = async (account, since, before) => {
    let options = {}

    options.account_id = account;

    if (since) options.since = since
    if (before) options.before = before

    options = new URLSearchParams(options).toString()

    return await MonzoAPI.get(`/transactions?${options}`).then(e => e.data)
}

const getBalance = async (account) => {
    return await MonzoAPI.get(`/balance?account_id=${account.id}`).then(e => e.data)
}

const streamTransactionsToFile = async (fileName, transactions, current_balance) => {
    const writer = fs.createWriteStream(`output/${fileName}`)

    const transactionCount = transactions.length;
    transactions.forEach((_tr, i) => {
        if (i === 0) {
            writer.write('"Date","Reference","Paid In","Paid Out","Balance"\n')
        }

        writer.write(`"${moment(_tr.created).format('DD/MM/YYYY')}","${_tr.description}","${_tr.amount > 0 ? _tr.amount / 100 : ''}","${_tr.amount < 0 ? Math.abs(_tr.amount) / 100 : ''}","${i === (transactionCount - 1) ? current_balance : ''}"\n`)
    })
}

const main = async () => {
    console.log()
    console.log()
    console.log()
    console.log()

    const current_month_start = moment().subtract(moment().date() - 1, 'days')
                                        .subtract(moment().hours(), 'hours')
                                        .subtract(moment().minutes(), 'minutes')
                                        .subtract(moment().seconds(), 'seconds')
                                        .toISOString(false)

    console.log('The current month starting is', current_month_start)
    console.log()
    console.log()


    const account = await getAccount(process.env.ACCOUNT_TYPE);

    if (account) {
        console.log(`Found account "${account.description}" (${account.id})`);
        console.log()
        console.log()
    } else {
        console.log('Count not find account');
        process.exit(0);
    }
    const transactions = (await getTransactions(account.id, current_month_start)).transactions
    const balance = (await getBalance(account)).balance / 100

    console.log(`Got ${transactions.length} transactions for this month.`)
    console.log()
    console.log()

    streamTransactionsToFile(current_month_start + '.csv', transactions, balance)


    console.log('Write transactions to file')
    console.log()
    console.log()
    console.log()
    console.log()
}

main()