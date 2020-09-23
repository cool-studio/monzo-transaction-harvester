# monzo-transaction-harvester

## This is not a supported project.

We have released this tool for use by anyone that could find it useful.

## Purpose

This tool will grab all transactions for the current month from a Monzo account and export those transactions into a CSV, using the column structure required by [crunch.co.uk](https://crunch.co.uk/referrals/?c2c=CoolStud2)*.

This tool will only be required by us until Crunch support Open Banking for Monzo.

## Environment Variables

* API_TOKEN
    * An access token retrieved from [the Monzo API Playground](https://developers.monzo.com/api/playground).
* ACCOUNT_TYPE (default: uk_business)
    * A valid account type. Check "List accounts" in the API playground.

## License

Check the LICENSE file.