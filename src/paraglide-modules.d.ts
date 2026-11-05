type Message = (params?: Record<string, string | number>) => string

declare module '@/paraglide/messages' {
  export const m: Record<string, Message>
}

declare module '@/paraglide/runtime' {
  export function getLocale(): string
}

declare module '@/paraglide/server' {
  export function paraglideMiddleware(
    request: Request,
    resolve: (args: {
      request: Request
      locale: string
    }) => Response | Promise<Response>,
  ): Promise<Response>
}
