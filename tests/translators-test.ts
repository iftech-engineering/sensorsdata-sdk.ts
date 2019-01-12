import test from 'ava'

import {
  snakenizeKeys,
  translateTimeStamp,
  extractTimestamp,
  parseCallInfo,
  extractCodeProperties,
  parseUserAgent,
  translateUserAgent,
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

test('should translate user agent', t => {
  const properties = {
    value: 100,
    $userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2783.5 Safari/537.36',
  }

  const translatedProps = translateUserAgent(properties)

  t.is(translatedProps!.$os, 'Mac')
  t.is(translatedProps!.$model, '')
  t.is(translatedProps!._browser_engine, 'Blink')
  t.is(translatedProps!.$os_version, '10.11')
  t.is(translatedProps!.$browser, 'Chrome')
  t.is(translatedProps!.$browser_version, '53.0')

  t.is(translatedProps!.value, 100)
  t.falsy(translatedProps.$userAgent)
})

test('should parse Desktop', t => {
  const userAgentInfo = parseUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2783.5 Safari/537.36',
  )

  t.is(userAgentInfo!.$os, 'Mac')
  t.is(userAgentInfo!.$manufacturer, 'Apple')
  t.is(userAgentInfo!.$model, '')
  t.is(userAgentInfo!._browser_engine, 'Blink')
  t.is(userAgentInfo!.$os_version, '10.11')
  t.is(userAgentInfo!.$browser, 'Chrome')
  t.is(userAgentInfo!.$browser_version, '53.0')
})

test('should parse iOS', t => {
  const userAgentInfo = parseUserAgent(
    'Mozilla/5.0 (iPhone; CPU iOS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
  )

  t.is(userAgentInfo!.$os, 'iOS')
  t.is(userAgentInfo!.$model, 'iPhone')
  t.is(userAgentInfo!._browser_engine, 'WebKit')
  t.is(userAgentInfo!.$os_version, '9.1')
  t.is(userAgentInfo!.$browser, 'Mobile Safari')
  t.is(userAgentInfo!.$browser_version, '9.0')
})

test('should parse iPad', t => {
  const userAgentInfo = parseUserAgent(
    'Mozilla/5.0 (iPad; CPU OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
  )

  t.is(userAgentInfo!.$os, 'iOS')
  t.is(userAgentInfo!.$model, 'iPad')
  t.is(userAgentInfo!._browser_engine, 'WebKit')
  t.is(userAgentInfo!.$os_version, '9.1')
  t.is(userAgentInfo!.$browser, 'Mobile Safari')
  t.is(userAgentInfo!.$browser_version, '9.0')
})

test('should parse Android', t => {
  const userAgentInfo = parseUserAgent(
    'Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.23 Mobile Safari/537.36',
  )

  t.is(userAgentInfo!.$os, 'Android')
  t.is(userAgentInfo!.$manufacturer, 'Samsung')
  t.is(userAgentInfo!.$model, 'GALAXY S5')
  t.is(userAgentInfo!._browser_engine, 'Blink')
  t.is(userAgentInfo!.$os_version, '5.0')
  t.is(userAgentInfo!.$browser, 'Chrome Mobile')
  t.is(userAgentInfo!.$browser_version, '48.0')
})
