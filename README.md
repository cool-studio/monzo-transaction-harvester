# monzo-transaction-harvester

## This is not a supported project.

We have released this tool for use by anyone that could find it useful.

## Purpose

This tool will grab all transactions for the current month from a Monzo account and export those transactions into a CSV, using the column structure required by [crunch.co.uk](https://crunch.co.uk/referrals/?c2c=CoolStud2)*.

We're using this tool in place of Crunch's Open Banking support.

## Environment Variables

* ACCOUNT_TYPE (default: uk_business)
    * A valid account type. Check "List accounts" in the [API playground](https://docs.monzo.com/#list-accounts).
* MONZO_API_CLIENT_ID
    * Acquired from the [developer portal](https://developers.monzo.com) by creating a client.
* MONZO_API_CLIENT_SECRET
    * Acquired from the [developer portal](https://developers.monzo.com) by creating a client.

## License

Check the LICENSE file.

* We are a Crunch customer and get a kickback for anyone that uses our code to join their service.
