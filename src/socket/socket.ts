import http from 'http'
import { Socket as RawSocket } from 'net'

export default class SocketClient {
    raw = new RawSocket()
    private events = new Map()
    connected = false
    url 
    options: { [key: string]: any }

    constructor(url: string, options = {}) {
        this.url = url
        this.options = options
    }
   
    connect(): Promise<this> {
        const headers = {
            ...this.options?.headers,
            Connection: 'Upgrade',
            upgrade: 'websocket'
        }

        const req = http.request(this.url, { headers })
        req.end()

        return new Promise((resolve, reject) => {
            req.on("error", reject)

            req.once("upgrade", (res, socket) => {
                this.raw = socket
                this.connected = true
                this.attachEvents()
                resolve(this)
            })
        })
    }

    private attachEvents() {
        this.raw.on("data", (data) => {
            data
                .toString()
                .split("\n")
                .filter(line => !!line)
                .map(d => JSON.parse(d))
                .map(({ event, message }) => {
                    const eventFn = this.events.get(event) || function () { }
                    eventFn(...message)
                })
        })

        this.raw.on("error", (err: any) => {
            if (err.code === 'ECONNRESET') {
                this.connected = false
                this.raw.destroy()
                this.reconnect()
            }

            console.error(err)
        })

        this.raw.on("end", () => {
            this.connected = false
        })
    }

    private reconnect() {
        const reconnectTimer = setTimeout(async () => {
            await this.connect()

            if (this.connected) {
                clearTimeout(reconnectTimer)
            }
        }, 3000)
    }

    /**
     * Handle a event
     */
    on(event: string, fn: (...args: any[]) => void) {
        this.events.set(event, fn)
        return this
    }

    /**
     * Handle a event once time
     */
    once(event: string, fn: (...args: any[]) => void) {
        this.events.set(event, (...args: any[]) => {
            fn(...args)
            this.events.delete(event)
        })

        return this
    }

    /**
     * Emit a event to the server
     * @param {string} event 
     */
    emit(event: string, ...args: any[]) {
        // This allows callback functions between the client and server
        args = args.map((m, i) => {
            if (typeof m == 'function') {
                const callbackEvent = `${event}::callback:${i}`
                this.once(callbackEvent, (message) => { m(message) })
                return callbackEvent
            }            
            return m
        })

        this.raw.write(`${JSON.stringify({ event, message: args })}\n`)
        return this
    }

    /**
     * Disconnect from the server
     */
    disconnect() {
        this.raw.end()
        this.raw.destroy()
        return this
    }
}
