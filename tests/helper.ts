import { Submitter } from '../src/submitter'

export class MockSubmitter implements Submitter {
  data: any[] = []
  async submit(messages: any[]) {
    this.data.push(messages)
  }
}
