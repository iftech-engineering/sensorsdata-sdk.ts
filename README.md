# SDK for Sensorsdata

## Features

- Function `close` for graceful shutdown
- Backpressure by Nodejs Stream
- Disable `allowReNameOption` by default

## Usage

### Server side tracking

```
const sa = new SensorsAnalytics(URL, {
    mode: 'track',
    timeout: 5000
    buffCount: 20,
    buffTimeSecs: 5,
})

sa.track(DISTINCT_ID, EVENT, {})
sa.profileSet(DISTINCT_ID, {})

// shut down
await sa.close()
```

### Streaming style

```
const stream = new Readable({
    objectMode: true,
    _read(){}
})
stream.pipe(sa)

stream.push({
    type: 'track',
    event: 'a',
    distinctId: DISTINCT_ID,
    properties: {}
})
stream.push({
    type: 'track_sign_up',
    event: '$SignUp',
    distinctId: DISTINCT_ID,
    originalId: DEVICE_ID,
    properties: {}
})
```
