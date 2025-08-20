declare module 'phoenix' {
  export class Channel {
    constructor(topic: string, params?: any, socket?: Socket)
    join(timeout?: number): { receive: (status: string, callback: (resp: any) => void) => any }
    leave(timeout?: number): Promise<any>
    on(event: string, callback: (payload: any) => void): void
    push(event: string, payload?: any, timeout?: number): { receive: (status: string, cb: (resp: any) => void) => any }
  }

  export class Socket {
    constructor(endpoint: string, opts?: any)
    connect(): void
    disconnect(code?: number, reason?: string, wasClean?: boolean): void
    onOpen(callback: () => void): void
    onClose(callback: () => void): void
    onError(callback: (error: any) => void): void
    channel(topic: string, params?: any): Channel
  }
}
