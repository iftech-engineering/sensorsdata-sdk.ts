import * as URL from 'url'
import * as Debug from 'debug'
import { Writable, WritableOptions } from 'stream'

import 'reflect-metadata'
import {
  checkPattern,
  checkProperties,
  checkValueType,
  validate,
  required,
  patternChecked,
  propertiesChecked,
} from './validator'
import { extractCodeProperties, snakenizeKeys, extractTimestamp } from './translators'
import { version as PACKAGE_VERSION } from './read-package-info'
import _ = require('lodash')
import { Submitter, SASubmitter } from './submitter'
import { SAOptions } from './options'

const debug = Debug('ruguoapp:sensorsdata-sdk')
const SDK_PROPERTIES = {
  $lib: 'Node',
  $libVersion: PACKAGE_VERSION,
}

function composeDebugUrl(url: string) {
  return URL.format({ ...URL.parse(url), pathname: '/debug' })
}

export class SensorsAnalytics extends Writable {
  private dataQueue = [] as object[]
  nextSubmitTime: number
  superProperties: any = {}
  allowReNameOption = false
  submitter: Submitter
  options: SAOptions
  private debug = false
  private timer: NodeJS.Timeout | undefined

  constructor(
    private url: string,
    options: Partial<SAOptions> = {},
    streamOptions: WritableOptions = { highWaterMark: 200 },
  ) {
    super({ ...streamOptions, objectMode: true })
    const optionsWithDefault = {
      ...{
        timeout: 5000,
        gzip: true,
        dryRun: false,
        debug: false,
        mode: 'track',
        buffCount: 1,
        buffTimeSecs: 5,
      },
      ...options,
    }

    this.options = optionsWithDefault
    this.debug = this.options.debug
    if (optionsWithDefault.mode === 'debug') {
      this.debug = true
      this.url = composeDebugUrl(this.url)
    }
    this.nextSubmitTime = Date.now() + optionsWithDefault.buffTimeSecs * 1000
    this.submitter = new SASubmitter(this.url, optionsWithDefault)
  }

  registerSuperProperties(values = {}) {
    debug('registerSuperProperties(%j)', values)
    checkProperties(values, checkPattern)
    checkProperties(values, checkValueType)

    return (this.superProperties = { ...this.superProperties, ...values })
  }

  clearSuperProperties() {
    debug('clearSuperProperties()')

    this.superProperties = {}

    return this.superProperties
  }

  private popAllData() {
    const dataBatch = this.dataQueue
    this.dataQueue = []
    return dataBatch
  }

  async _write(
    obj: {
      type: string
      event: string
      distinctId: string
      originalId?: string
      properties: any
      lib?: _.Dictionary<string | undefined>
    },
    _encoding: string,
    callback: Function,
  ) {
    const superize = this.superizeProperties(obj.properties)
    if (['profile_set', 'profile_set_once'].includes(obj.type)) {
      superize.properties = _.omit(superize.properties, '$app_version', '$appVersion')
    }

    let properties = obj.properties

    const { type, distinctId, originalId } = obj
    let { event } = obj
    if (this.allowReNameOption) {
      properties = snakenizeKeys(obj)
      event = _.snakeCase(obj.event)
    }

    const envelope = snakenizeKeys({
      type,
      event,
      time: extractTimestamp(properties),
      distinctId,
      originalId,
      properties: checkProperties(properties, checkPattern),
      lib: obj.lib,
    })

    debug('envelope: %j', envelope)

    this.dataQueue.push(envelope)
    const now = Date.now()
    if (
      this.debug ||
      this.dataQueue.length >= this.options.buffCount ||
      now >= this.nextSubmitTime
    ) {
      if (this.timer) {
        clearTimeout(this.timer)
      }
      await this.flush()
    } else {
      if (this.timer) {
        clearTimeout(this.timer)
      }
      this.timer = setTimeout(() => this.flush(), this.nextSubmitTime - now)
    }
    callback()
  }

  async submit(messages: object[]) {
    this.nextSubmitTime = Date.now() + this.options.buffTimeSecs * 1000
    return this.submitter.submit(messages)
  }
  getCodeProperties(properties = {} as any, callIndex?: number) {
    const codeProperties = callIndex ? extractCodeProperties(callIndex) : {}

    return {
      lib: snakenizeKeys({
        ...SDK_PROPERTIES,
        ...codeProperties,
        ...{
          $app_version:
            this.superProperties.$app_version ||
            this.superProperties.$appVersion ||
            properties.$app_version ||
            properties.$appVersion,
        },
      }),
    }
  }
  superizeProperties(properties = {} as any) {
    // 合并公共属性
    return {
      properties: {
        ...snakenizeKeys(SDK_PROPERTIES),
        ...this.superProperties,
        ...properties,
      },
    }
  }

  @validate
  track<T extends object>(
    @required('distinctId') distinctId: string,
    @patternChecked('event') event: string,
    @propertiesChecked('eventProperties') eventProperties: T,
  ) {
    debug('track(%j)', { distinctId, event, eventProperties })
    const { lib } = this.getCodeProperties(eventProperties, 3)

    return this.write({
      type: 'track',
      event,
      distinctId,
      properties: eventProperties,
      lib,
    })
  }

  @validate
  trackSignup<T extends object>(
    @required('distinctId') distinctId: string,
    @required('originalId') originalId: string,
    @propertiesChecked('eventProperties') eventProperties: T,
  ) {
    debug('trackSignup(%j)', { distinctId, originalId, eventProperties })

    const { lib } = this.getCodeProperties(eventProperties, 3)

    return this.write({
      type: 'track_signup',
      event: '$SignUp',
      distinctId,
      originalId,
      properties: eventProperties,
      lib,
    })
  }

  @validate
  profileSet<T extends object>(
    @required('distinctId') distinctId: string,
    @propertiesChecked('properties') properties: T,
  ) {
    debug('profileSet(%j)', { distinctId, properties })

    const { lib } = this.getCodeProperties(properties, 3)

    return this.write({
      type: 'profile_set',
      distinctId,
      properties,
      lib,
    })
  }

  @validate
  profileSetOnce<T extends object>(
    @required('distinctId') distinctId: string,
    @propertiesChecked('properties') properties: T,
  ) {
    debug('profileSetOnce(%j)', { distinctId, properties })

    const { lib } = this.getCodeProperties(properties, 3)

    return this.write({
      type: 'profile_set_once',
      distinctId,
      properties,
      lib,
    })
  }

  async flush() {
    await this.submit(this.popAllData())
  }
  async close() {
    await new Promise(resolve => {
      super.end(() => resolve())
    })
    await this.flush()
  }
}
