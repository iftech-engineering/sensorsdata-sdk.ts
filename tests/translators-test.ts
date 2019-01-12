import test from 'ava'

import {
  snakenizeKeys,
  translateTimeStamp,
  extractTimestamp,
  parseCallInfo,
  extractCodeProperties,
} from '../src/translators'

test('should convert to snake case', t => {
  const translated = snakenizeKeys({ $time: 'time', $superMan: 'clark', man: 1, manPower: 100 })

  t.deepEqual(translated, { $time: 'time', $super_man: 'clark', man: 1, man_power: 100 })
})

test('extract timestamp', t => {
  const properties = { $time: '2016-07-29T00:00:00+08:00' }
  const timestamp = extractTimestamp(properties)

  t.is(timestamp, 1469721600000)
  t.falsy(properties.$time)
})

test('should convert date', t => {
  const timestamp = translateTimeStamp(new Date('2015-01-28T00:00:00+08:00'))
  t.is(timestamp, 1422374400000)
})

test('should support moment like object', t => {
  const timestamp = translateTimeStamp({
    toDate() {
      return new Date('2015-01-28T00:00:00+08:00')
    },
  })
  t.is(timestamp, 1422374400000)
})

test('should support direct number', t => {
  const timestamp = translateTimeStamp(1422374400000)
  t.is(timestamp, 1422374400000)
})

test('should support string', t => {
  const timestamp = translateTimeStamp('2015-01-28T00:00:00+08:00')
  t.is(timestamp, 1422374400000)
})

test('should handle null and undefined', t => {
  const timestamp = translateTimeStamp(null)
  t.true(Number.isFinite(timestamp))
})

test('should extract code properties', t => {
  const properties = extractCodeProperties(2)

  t.is(properties.$libMethod, 'code')
  t.truthy(properties.$libDetail)
  t.regex(properties.$libDetail, /ava_1##default\.t##.*translators-test\.ts##\d+,\d+/)
})

test('should parse anonymous call', t => {
  const callInfo = parseCallInfo(
    '   at /Users/timnew/Workspace/apricot_forest/sa-sdk-node/test.js:23:2',
  )

  t.truthy(callInfo)
  t.is(callInfo!.fileName, '/Users/timnew/Workspace/apricot_forest/sa-sdk-node/test.js')
  t.is(callInfo!.lineNumber, '23')
  t.is(callInfo!.columnNumber, '2')
  t.falsy(callInfo!.className)
  t.falsy(callInfo!.functionName)
})

test('should parse function call', t => {
  const callInfo = parseCallInfo('    at extractCodeProperties (translators.js:78:22)')

  t.truthy(callInfo)
  t.is(callInfo!.fileName, 'translators.js')
  t.is(callInfo!.lineNumber, '78')
  t.is(callInfo!.columnNumber, '22')
  t.is(callInfo!.functionName, 'extractCodeProperties')
  t.falsy(callInfo!.className)
})

test('should parse named method call', t => {
  const callInfo = parseCallInfo(
    '    at SensorsAnalytics.superizeProperties (SensorsAnalytics.js:56:28)',
  )

  t.is(callInfo!.fileName, 'SensorsAnalytics.js')
  t.is(callInfo!.lineNumber, '56')
  t.is(callInfo!.columnNumber, '28')
  t.is(callInfo!.functionName, 'superizeProperties')
  t.is(callInfo!.className, 'SensorsAnalytics')
})

test('should parse anonymouse method call', t => {
  const callInfo = parseCallInfo('     at Context.<anonymous> (SensorsAnalyticsSpec.js:17:8)')

  t.is(callInfo!.fileName, 'SensorsAnalyticsSpec.js')
  t.is(callInfo!.lineNumber, '17')
  t.is(callInfo!.columnNumber, '8')
  t.is(callInfo!.functionName, '<anonymous>')
  t.is(callInfo!.className, 'Context')
})

test('should parse native call', t => {
  const callInfo = parseCallInfo('    at undefined.next (native)')

  t.is(callInfo!.fileName, 'native')
  t.falsy(callInfo!.lineNumber)
  t.falsy(callInfo!.columnNumber)
  t.is(callInfo!.functionName, 'next')
  t.is(callInfo!.className, 'undefined')
})
