import {
  Balances_Insert_Input,
  Tokens_Insert_Input,
} from '@chaingraph.io/hasura-client/dist/generated/hasura-graphql'
import pAll from 'p-all'
import { rpc } from '../utils/eosio'
import { hasura } from '../hasura'
import { asset } from 'eos-common'
import { LoaderBuffer } from './../whitelists/loader'

const populateToken = async (token_contract: string) => {
  const { rows } = await rpc.get_table_by_scope({
    code: token_contract,
    table: 'stat',
    limit: 10000000,
  })

  const statsRequests = rows.map(({ scope }: { scope: string }) => {
    return async () => {
      const { rows: rows2 } = await rpc.get_table_rows({
        code: token_contract,
        table: 'stat',
        scope,
      })
      return rows2
    }
  })

  type Stat = {
    supply: string
    max_supply: string
    issuer: string
  }

  const stats = (await (
    await pAll(statsRequests, { concurrency: 50 })
  ).flat()) as Stat[]

  const insertStatRequests = stats.map((stat) => {
    const { symbol } = asset(stat.supply)

    const tokenObj: Tokens_Insert_Input = {
      chain_id:
        'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      contract: token_contract,
      symbol: symbol.code().toString(),
      precision: symbol.precision(),
      ...stat,
    }
    return async () => hasura.query.upsert_token({ object: tokenObj })
  })

  await pAll(insertStatRequests, { concurrency: 50 })
}

const populateBalances = async (token_contract: string) => {
  const { rows: scopes } = await rpc.get_table_by_scope({
    code: token_contract,
    table: 'accounts',
    limit: 10000000,
  })

  const table_rows_requests = scopes.map(({ scope }: { scope: string }) => {
    return async () => {
      const { rows } = await rpc.get_table_rows({
        code: token_contract,
        table: 'accounts',
        scope,
      })

      const balancesData = rows.map(({ balance }: { balance: string }) => {
        return {
          chain_id:
            'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
          contract: token_contract,
          account: scope,
          symbol: balance.split(' ')[1],
          balance,
        }
      })
      return balancesData
    }
  })

  const balances = (await (
    await pAll(table_rows_requests, { concurrency: 50 })
  ).flat()) as Balances_Insert_Input[]

  hasura.query.upsert_balances({ objects: balances })
}

export const populateTokens = async (whitelistReader: LoaderBuffer) => {
  // TODO:R comment
  console.log('---------chaingraph_token_registry---------')
  console.dir(whitelistReader.chaingraph_token_registry(), { depth: null })
  //TODO: R remove any
  whitelistReader
    .chaingraph_token_registry()
    .forEach(async (token_contract: any) => {
      try {
        console.log('populateTokens A')
        await populateToken(token_contract)
        console.log('populateTokens B')
        await populateBalances(token_contract)
        console.log('populateTokens C')
      } catch (error) {
        console.log(JSON.stringify(error, null, 2))
        // throw new Error('Error populating tokens')
      }
    })
}
