import { SensorsAnalytics } from '../src/sensors-analytics'
import _test, { TestInterface } from 'ava'

import _ = require('lodash')
import * as Bluebird from 'bluebird'
import { MockSubmitter } from './helper'

const distinctId = 'user-id'

const test = _test as TestInterface<{ sa: SensorsAnalytics; submitter: MockSubmitter }>

test.beforeEach(t => {
  t.context.sa = new SensorsAnalytics('http://localhost:3000', { mode: 'debug' })
  t.context.submitter = new MockSubmitter()
  t.context.sa.submitter = t.context.submitter
})

test('should complete event', async t => {
  const { sa, submitter } = t.context
  t.true(sa.track(distinctId, 'a', {}))
  t.true(sa.track(distinctId, 'b', {}))
  t.true(sa.track(distinctId, 'c', {}))
  t.true(sa.track(distinctId, 'd', {}))
  await Bluebird.delay(1000)
  const values = _.flatten(submitter.data)
  t.is(values.length, 4)
  t.snapshot(values.map(msg => _.omit(msg, 'time')))
})

test('should snakenizeKeys property name by default', async t => {
  const { sa, submitter } = t.context

  sa.track(distinctId, 'a', {
    $appVersion: '1.0.8',
  })
  sa.registerSuperProperties({
    $appVersion: '1.0.8',
  })
  sa.profileSet(distinctId, {
    test: 'test',
  })
  await Bluebird.delay(100)
  const values = _.flatten(submitter.data)

  t.is(values[0].lib.$app_version, '1.0.8')
  t.is(values[0].properties.$appVersion, '1.0.8')

  t.is(values[1].lib.$app_version, '1.0.8')
  t.falsy(values[1].properties.$appVersion)
})

test('should batch compose event', async t => {
  const sa = new SensorsAnalytics('', {
    debug: false,
    buffCount: 2,
    buffTimeSecs: 3,
  })
  const submitter = new MockSubmitter()
  sa.submitter = submitter

  sa.track(distinctId, 'a', {})
  sa.track(distinctId, 'a', {})

  sa.track(distinctId, 'b', {})
  sa.track(distinctId, 'b', {})

  sa.track(distinctId, 'c', {})
  await Bluebird.delay(100)
  const values = submitter.data
  t.is(values[0].length, 2)
  t.is(values[1].length, 2)
  t.is(values.length, 2)
  await Bluebird.delay(3000)
  t.is(values[2].length, 1)
})

test('should flush data in batch when close', async t => {
  const sa = new SensorsAnalytics('', {
    debug: false,
    buffCount: 2,
    buffTimeSecs: 50,
  })
  const submitter = new MockSubmitter()
  sa.submitter = submitter

  sa.track(distinctId, 'a', {})
  sa.track(distinctId, 'b', {})
  sa.track(distinctId, 'c', {})

  await sa.close()

  const values = _.flatten(submitter.data).map(e => e.event)
  t.deepEqual(values, ['a', 'b', 'c'])
})
