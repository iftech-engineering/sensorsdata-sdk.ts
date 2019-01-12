import * as nock from 'nock'
import * as zlib from 'zlib'
import * as Bluebird from 'bluebird'
import test from 'ava'
import _ = require('lodash')
import { SensorsAnalytics } from '../src/sensors-analytics'

const gunzip = Bluebird.promisify(zlib.gunzip)

test('should submit', async t => {
  const sa = new SensorsAnalytics('http://localhost:3000', { mode: 'debug' })
  t.plan(1)
  const messages = [
    { distinctId: 'user1', event: 'eventa', properties: { foo: 1 } },
    { distinctId: 'user2', event: 'eventa', properties: { foo: 'bar' } },
  ]
  nock('http://localhost:3000')
    .post('/debug')
    .reply(async (_url, body) => {
      const extractedData = _.chain(body)
        .split('&')
        .map(part => part.split('='))
        .fromPairs()
        .value()

      const result = (await gunzip(
        new Buffer(decodeURIComponent(extractedData.data_list), 'base64'),
      )) as Buffer

      t.deepEqual(JSON.parse(result.toString()), messages)
      return [200, 'success']
    })
  await sa.submit(messages)
})
