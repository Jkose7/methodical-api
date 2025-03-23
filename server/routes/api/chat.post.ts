import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import axios from 'axios'
// own of project
import { PLANNER_SYSTEM_PROMPT } from '../../constants/prompt'

// Input validation schema
const chatRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.string().optional().default('google/gemini-2.0-pro-exp-02-05:free')
})

// server/routes/api/chat.post.ts
export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig()
    const body = await readBody(event)
    const validationResult = chatRequestSchema.safeParse(body)
    if (!validationResult.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request',
        data: validationResult.error.format()
      })
    }
    const { prompt, model } = validationResult.data
    // Check if API key is available
    if (!config.openrouterApiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: 'API key configuration missing'
      })
    }
    // OpenRouter request
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        models: ['deepseek/deepseek-r1:free', 'openchat/openchat-7b:free'],
        messages: [
          {
            role: "system",
            content: PLANNER_SYSTEM_PROMPT
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        stream: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'HTTP-Referer': config.appUrl || 'http://localhost:3000',
          'X-Title': 'Methodical',
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        responseType: 'stream'
      }
    )
    // headers for stream
    event.node.res.setHeader('Content-Type', 'text/event-stream')
    event.node.res.setHeader('Cache-Control', 'no-cache')
    event.node.res.setHeader('Connection', 'keep-alive')
    event.node.res.flushHeaders()

    await new Promise((resolve, reject) => {
      response.data.pipe(event.node.res)
      response.data.on('end', () => {
        event.node.res.end()
        resolve(true)
      })
      response.data.on('error', (err: Error) => {
        event.node.res.end()
        reject(err)
      })
    })
  } catch (error) {
    console.error('API Error:', error.name, error.message)
  }
}) 