import * as zlib from 'zlib'
import * as Bluebird from 'bluebird'
import encodeForm from 'form-urlencoded'
import * as requestDefault from 'request-promise-native'
import { SAOptions } from './options'
import * as Debug from 'debug'

const debug = Debug('ruguoapp:sensorsdata-sdk:submitter')
const gzipCompress = Bluebird.promisify(zlib.gzip)
const request = requestDefault.defaults({ forever: true })

export interface Submitter {
  submit(messages: object[]): Promise<any>
}

export class SASubmitter implements Submitter {
  private debug = false
  constructor(private url: string, private options: SAOptions) {
    this.debug = options.debug || options.mode === 'debug'
  }

  async submit(messages: object[]) {
    const payloadText = new Buffer(JSON.stringify(messages), 'utf8')
    const dataListBuffer = (await (this.options.gzip
      ? gzipCompress(payloadText)
      : payloadText)) as Buffer
    const body = encodeForm({
      data_list: dataListBuffer.toString('base64'),
      gzip: this.options.gzip ? 1 : 0,
    })

    const headers = {
      'User-Agent': 'SensorsAnalytics Node SDK',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Dry-Run': this.options.dryRun ? 'true' : undefined,
    }

    debug('Post to %s', this.url)
    debug('Headers: %o', headers)
    debug('Body: %o', body)

    debug('Posting...')
    const response = await request(this.url, {
      method: 'POST',
      headers,
      body,
      timeout: this.options.timeout,
      resolveWithFullResponse: true,
    })
    debug('Post complete')
    if (response.statusCode < 300) {
      debug('Suceeded: %d', response.statusCode)
      return
    }

    debug('Error: %s', response.statusCode)

    if (this.debug && messages.length > 1 && response.statusCode === 400) {
      debug('Batch mode is not supported in debug')
      throw new Error('Batch mode is not supported in Debug')
    }

    const errorMessage = response.body
    throw new Error(errorMessage)
  }
}
