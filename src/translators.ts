// import * as DeviceDetector from 'device-detector-js'
import * as createDebug from 'debug'
import * as _ from 'lodash'
const debug = createDebug('ruguoapp:sensorsdata-sdk:translators')
// const detector = new DeviceDetector()

export const snakenizeKeys = (obj: any) =>
  _.mapKeys(obj, (_v, k: string) => {
    // keep leading $
    if (k.startsWith('$')) {
      return `$${_.snakeCase(k)}`
    }
    return _.snakeCase(k)
  })

export function translateTimeStamp(timestamp: any) {
  if (!timestamp) {
    return Date.now()
  }

  if (typeof timestamp === 'number') {
    return timestamp
  }

  if (typeof timestamp === 'string') {
    return Date.parse(timestamp)
  }

  if (timestamp instanceof Date) {
    return timestamp.valueOf()
  }

  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().valueOf() // Support moment.js
  }

  throw new Error('Invalid timestamp')
}
export function extractTimestamp(properties: any) {
  const time = translateTimeStamp(properties.$time)
  delete properties.$time // Remove the key if exists
  return time
}

const CALL_INFO_REGEX = /^\s*at ((((\w+)\.)?([\w\.]+|<anonymous>) \(((.+):(\d+):(\d+)|(native))\))|(.+):(\d+):(\d+))$/
export function parseCallInfo(text: string) {
  debug('parseCallInfo: %s', text)

  const matches = CALL_INFO_REGEX.exec(text)

  if (!matches) {
    return null
  }

  return {
    fileName: matches[7] || matches[10] || matches[11],
    lineNumber: matches[8] || matches[12],
    columnNumber: matches[9] || matches[13],
    className: matches[4],
    functionName: matches[5],
  }
}
export function extractCodeProperties(callerIndex: number) {
  const codeProperties = {
    $libMethod: 'code',
  } as {
    $libMethod: string
    $libDetail: string
  }

  const callerInfo = new Error()
  const stack = callerInfo.stack!.split('\n', callerIndex + 1)
  debug('extractCodeProperties: %j', stack)

  const callInfo = parseCallInfo(stack[callerIndex])

  if (callInfo !== null) {
    debug('Call info: %j', callInfo)
    const { className, functionName, fileName, lineNumber, columnNumber } = callInfo
    codeProperties.$libDetail = `${className}##${functionName}##${fileName}##${lineNumber},${columnNumber}`
  } else {
    debug('Call info not parsed')
  }

  return codeProperties
}
