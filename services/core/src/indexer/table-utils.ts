import { LoaderBuffer } from '../whitelists/loader'
import { EosioReaderTableRowsStreamData } from '@blockmatic/eosio-ship-reader'

export const getTableRegistry = (
  row: EosioReaderTableRowsStreamData,
  whitelistReader: LoaderBuffer,
) => {
  const table_registry = whitelistReader
    .chaingraph_table_registry()
    .find(({ code, scope, table }) => {
      return (
        code === row.code &&
        (scope ? scope === row.scope : true) &&
        table === row.table
      )
    })
  if (!table_registry) {
    throw new Error('No table registry found, something is not right')
  }
  return table_registry
}

export const getPrimaryKey = (
  row: EosioReaderTableRowsStreamData,
  whitelistReader: LoaderBuffer,
) => {
  const table_registry = getTableRegistry(row, whitelistReader)

  let primary_key: string

  switch (table_registry.table_key) {
    case 'singleton':
      primary_key = 'singleton'
      break

    case 'standard_token':
      primary_key = row.value.balance.split(' ')[1]
      break

    default:
      if (table_registry.table_key.includes('-asset-symbol')) {
        primary_key =
          row.value[
            table_registry.table_key.replace('-asset-symbol', '')
          ].split(' ')[1]
      } else if (table_registry.table_key.includes('-token-symbol')) {
        primary_key =
          row.value[
            table_registry.table_key.replace('-token-symbol', '')
          ].split(',')[1]
      } else {
        primary_key = row.value[table_registry.table_key]
      }
      break
  }

  return primary_key
}

export const getChainGraphTableRowData = (
  row: EosioReaderTableRowsStreamData,
  whitelistReader: LoaderBuffer,
) => {
  const variables = {
    chain_id: row.chain_id,
    contract: row.code,
    table: row.table,
    scope: row.scope,
    primary_key: getPrimaryKey(row, whitelistReader),
    data: row.value,
  }

  return variables
}
