import * as fs from 'fs'
import * as pathUtil from 'path'

const packageInfoText = fs.readFileSync(pathUtil.resolve(__dirname, '../../package.json'), {
  encoding: 'utf8',
})
const packageInfo = JSON.parse(packageInfoText)

export const version = packageInfo.version
