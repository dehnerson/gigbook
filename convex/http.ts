import { httpRouter } from 'convex/server'
import { uploadAvatar, uploadAvatarOptions } from './avatarHttp'

const http = httpRouter()

http.route({
  path: '/avatar',
  method: 'POST',
  handler: uploadAvatar,
})

http.route({
  path: '/avatar',
  method: 'OPTIONS',
  handler: uploadAvatarOptions,
})

export default http
