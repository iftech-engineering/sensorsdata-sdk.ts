import * as Debug from 'debug'
import * as moment from 'moment'

const debug = Debug('ruguoapp:sensorsdata-sdk:validator')
const KEY_PATTERN = /^((?!^distinct_id$|^original_id$|^time$|^properties$|^id$|^first_id$|^second_id$|^users$|^events$|^event$|^user_id$|^date$|^datetime$)[a-zA-Z_$][a-zA-Z\d_$]{0,99})$/

export function checkExists(value: any, name = 'value') {
  debug('checkExists: %s => %j', name, value)

  if (typeof value !== 'string') {
    throw new Error(`${name} must be a string`)
  }

  if (value.length === 0) {
    throw new Error(`${name} is empty`)
  }

  if (value.length > 255) {
    throw new Error(`${name} is too long`)
  }

  return value
}

export function checkPattern(value: any, name = 'value') {
  debug('checkPattern: %s', value)

  checkExists(value, name)

  if (!KEY_PATTERN.exec(value)) {
    throw new Error(`${name} is invalid`)
  }

  return value
}

function checkDateTimeValueType(value: any) {
  const type = typeof value

  switch (type) {
    case 'number':
    case 'string':
    case 'object':
      if (value instanceof Date) {
        return
      }
      if (typeof value.toDate === 'function') {
        return
      }
      throw new Error('Invalid time object')
    default:
      throw new Error('Invalid time object')
  }
}

export const checkValueType = (obj: any) => (key: string) => {
  debug('checkValyeType: this[%s]', key)

  const value = obj[key]

  if (key === '$time') {
    // Bypass normal check
    checkDateTimeValueType(value)
    return
  }
  const type = typeof value
  switch (type) {
    case 'number':
    case 'string':
    case 'boolean':
    case 'symbol':
      return
    case 'object':
      if (Array.isArray(value)) {
        return
      }
      if (value instanceof Date) {
        obj[key] = moment(value).format('YYYY-MM-DD HH:mm:ss.SSS')
        return
      }
      break
    default:
      throw new Error(`Property ${key} is invalid: ${value}`)
  }
}
export function checkProperties(obj: any, checker: Function) {
  debug('checkProperties: %j', obj)
  Object.keys(obj).forEach(key => checker(key, key))
  return obj
}

interface ParameterItem {
  index: number
  name: string
}
const requiredMetadataKey = Symbol('required')
const patternCheckedMetadataKey = Symbol('patternChecked')
const propertiesCheckedMetadataKey = Symbol('propertiesChecked')

function addParameterValidator(
  name: string,
  metaKey: symbol,
  target: Object,
  propertyKey: string | symbol,
  parameterIndex: number,
) {
  const existingParameters: ParameterItem[] =
    Reflect.getOwnMetadata(metaKey, target, propertyKey) || []
  existingParameters.push({ index: parameterIndex, name })
  Reflect.defineMetadata(metaKey, existingParameters, target, propertyKey)
}

export const required = (name: string) => (...args: [Object, string | symbol, number]) => {
  addParameterValidator(name, requiredMetadataKey, ...args)
}

export const patternChecked = (name: string) => (...args: [Object, string | symbol, number]) => {
  addParameterValidator(name, patternCheckedMetadataKey, ...args)
}

export const propertiesChecked = (name: string) => (...args: [Object, string | symbol, number]) => {
  addParameterValidator(name, propertiesCheckedMetadataKey, ...args)
}

export function doValidate(
  validator: (value: any, parameterName: string) => void,
  args: any[],
  parameters?: ParameterItem[],
) {
  if (!parameters || !parameters.length) {
    return
  }
  for (const parameter of parameters) {
    validator(args[parameter.index], parameter.name)
  }
}

export function validate(
  target: any,
  propertyName: string,
  descriptor: TypedPropertyDescriptor<(...params: any[]) => any>,
) {
  const method = descriptor.value
  descriptor.value = function(...args: any[]) {
    // Required
    doValidate(
      (value, name) => {
        if (!value) {
          throw new Error(`Missing required argument: ${name}.`)
        }
      },
      args,
      Reflect.getOwnMetadata(requiredMetadataKey, target, propertyName),
    )
    // PatternChecked
    doValidate(
      checkPattern,
      args,
      Reflect.getOwnMetadata(patternCheckedMetadataKey, target, propertyName),
    )
    doValidate(
      (value: any) => checkProperties(value, checkValueType),
      args,
      Reflect.getOwnMetadata(propertiesCheckedMetadataKey, target, propertyName),
    )
    return method!.apply(this, args)
  }
}
