import { env } from '@/config/env'
import type { StudyBotApi } from './api/contract'
import { httpStudyBotApi } from './api/studybot.http'
import { mockStudyBotApi } from './mocks/studybot.mock'

export const api: StudyBotApi = env.useMocks ? mockStudyBotApi : httpStudyBotApi

export { ApiError } from './api/http'
export type { StudyBotApi } from './api/contract'
