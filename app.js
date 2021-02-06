const axios = require('axios')
const fs = require('fs')
const moment = require('moment')
const readline = require('readline-sync')
const FormData = require('form-data')
require('dotenv').config()

const MONZO_API_CLIENT_ID = process.env.MONZO_API_CLIENT_ID
const MONZO_API_CLIENT_SECRET = process.env.MONZO_API_CLIENT_SECRET

let MonzoAPI

// get accounts
const getAccounts = async (type) => {
    let accounts
    try {
        accounts = await MonzoAPI.get(`/accounts${type ? `?account_type=${type}` : ''}`).then(e => e.data)
    } catch (error) {
        console.log('Failed "getAccounts"', error)
        process.exit(1)
    }
    return accounts
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

    return await MonzoAPI.get(`/transactions?${options}&expand[]=merchant`).then(e => e.data)
}

const getBalance = async (account) => {
    return await MonzoAPI.get(`/balance?account_id=${account.id}`).then(e => e.data)
}

const streamTransactionsToFile = async (fileName, transactions, current_balance) => {
    const writer = fs.createWriteStream(`output/${fileName}`)

    // 0 Amount transactions happen for Active Card Checks, Crunch doesn't like this
    const t = transactions.filter(a => a.amount !== 0).filter(a => !a.decline_reason)

    const transactionCount = t.length;
    t.forEach((_tr, i) => {
        if (i === 0) {
            writer.write('"Date","Reference","Paid In","Paid Out","Balance"\n')
        }
        writer.write(`"${moment(_tr.created).format('DD/MM/YYYY')}","${_tr.merchant ? _tr.merchant.name : 'Merchant'}_${_tr.description}","${_tr.amount > 0 ? _tr.amount / 100 : ''}","${_tr.amount < 0 ? Math.abs(_tr.amount) / 100 : ''}","${i === (transactionCount - 1) ? current_balance : ''}"\n`)
    })
}

const getToken = async () => {
    console.log('Trying to get existing API token')
    const existing = await existingToken()

    if (existing.refresh_token) {
        console.log('Found a refresh token; trying to get a new access token...')

        console.log()
        console.log()

        const token = await renewToken(existing.refresh_token)

        console.log()
        console.log()

        console.log('Using token:', token.substr(0, 4), '...', token.substr(-4))

        return token
    }

    return renewToken()
}

const existingToken = async () => {
    return new Promise((resolve) => {
        fs.readFile('./token.txt', (err, data) => {
            if (err) return resolve({})

            return resolve(JSON.parse(data))
        })
    })
}

const renewToken = (refresh) => {
    if (refresh) {
        console.log('Trying to refresh token')
        const fd = new FormData()

        console.log()
        console.log()

        fd.append('grant_type', 'refresh_token')
        fd.append('client_id', MONZO_API_CLIENT_ID)
        fd.append('client_secret', MONZO_API_CLIENT_SECRET)
        fd.append('refresh_token', refresh)

        return axios({
            method: 'post',
            url: 'https://api.monzo.com/oauth2/token',
            data: fd,
            headers: fd.getHeaders()
        }).then(e => {
            if (e.status === 200) {
                console.log('Got a new access token, using that.')
                fs.writeFileSync('token.txt', JSON.stringify(e.data))
                return e.data.access_token
            }

            console.log('Refresh token isn\'t valid. Restart the app to reauthorise.')
            process.exit(1)
        }).catch(e => {
            // console.error(e)
            fs.unlinkSync('./token.txt')
            console.log('Refresh token isn\'t valid. Restart the app to reauthorise.')
            process.exit(1)
        })
    }

    console.log(`https://auth.monzo.com/?client_id=${MONZO_API_CLIENT_ID}&redirect_uri=https://printto.page/&response_type=code`)

    console.log()
    console.log()

    const token = readline.question('What was the token response?\n\nToken: ')

    if (fs.existsSync('./token.txt')) fs.unlinkSync('./token.txt')

    const fd = new FormData()
    fd.append('grant_type', 'authorization_code')
    fd.append('client_id', MONZO_API_CLIENT_ID)
    fd.append('client_secret', MONZO_API_CLIENT_SECRET)
    fd.append('redirect_uri', 'https://printto.page/')
    fd.append('code', token)

    return axios.post('https://api.monzo.com/oauth2/token', fd, { headers: fd.getHeaders() }).then(e => {
        if (e.status === 200) {
            fs.writeFileSync('token.txt', JSON.stringify(e.data))
            console.log()
            console.log()
            console.log('Approve this application in the Monzo app before use.')
            console.log()
            console.log()
            process.exit(0)
    }

        process.exit(0)
    }).catch((err) => {
        console.error(err.response)
        process.exit(0)
    })
}

const main = async () => {
    console.log()
    console.log()
    console.log()
    console.log()

    const api_token = await getToken()

    console.log()
    console.log()

    MonzoAPI = axios.default.create({
        baseURL: 'https://api.monzo.com',
        headers: {
            Authorization: `Bearer ${api_token}`
        }
    })

    let startDate = readline.question('Gather transactions starting from...\n\nDate (DD/MM/YYYY): ')

    if (!startDate) {
        console.log('You must provide a start date!')
        process.exit(1)
    }

    console.log()
    console.log()

    startDate = moment(startDate, 'DD/MM/YYYY').toISOString(false)

    let endDate = readline.question('Gather transactions ending...\n\nDate (DD/MM/YYYY) (Optional): ')

    console.log()
    console.log()

    if (endDate) endDate = moment(endDate, 'DD/MM/YYYY').toISOString(false)

    console.log('The selected starting date is', startDate)
    if (endDate) console.log('The selected ending date is', endDate)

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

    const transactions = (await getTransactions(account.id, startDate, endDate)).transactions
    const balance = (await getBalance(account)).balance / 100

    console.log(`Got ${transactions.length} transactions for this month.`)
    console.log()
    console.log()

    streamTransactionsToFile(`${startDate} - ${endDate || moment().toISOString(false)}.csv`, transactions, balance)


    console.log('Write transactions to file')
    console.log()
    console.log()
    console.log()
    console.log()
}

main()