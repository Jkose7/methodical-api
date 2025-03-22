import { defineEventHandler, readBody, createError } from 'h3'
import { z } from 'zod'
import { PassThrough } from 'stream'
import axios from 'axios'
// own of project
import { processResponse } from '../../utils/process'
import { PLANNER_SYSTEM_PROMPT } from '../../constants/prompt'

// Input validation schema
const chatRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.string().optional().default('google/gemini-2.0-pro-exp-02-05:free')
})

// server/routes/api/chat.post.ts
export default defineEventHandler(async (event) => {
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

  // Check if API key is available
  if (!config.openrouterApiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'API key configuration missing'
    })
  }

  // create stream to send response
  const stream = new PassThrough()
  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  sendStream(event, stream)

  try {
    // OpenRouter request
    const { prompt, model } = validationResult.data
    let fullResponse = ''
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        models: ['deepseek/deepseek-r1:free', 'openchat/openchat-7b:free'],
        messages: [
          { role: "system", content: PLANNER_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'HTTP-Referer': config.appUrl || 'http://localhost:3000',
          'X-Title': 'Methodical',
          'Content-Type': 'application/json'
        },
        responseType: 'stream'
      }
    )

    // process response stream
    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim())
      for (const line of lines) {
        const message = line.replace(/^data: /, '')
        if (message === '[DONE]') {
          // Process final response when stream completes
          // const data = line.replace('data:', '').trim()
          // if (data) {
          //   const { explanation, structuredData } = processResponse(data)
          //   if (explanation) {
          //     stream.write(`data: ${explanation}\n\n`)
          //   }
          //   if (structuredData) {
          //     stream.write(`data: ${JSON.stringify(structuredData)}\n\n`)
          //   }
          // }
          const { structuredData, explanation } = processResponse(fullResponse)
          stream.write(`event: structured\ndata: ${JSON.stringify(structuredData)}\n\n`)
          stream.write(`event: explanation\ndata: ${JSON.stringify({content: explanation, complete: true})}\n\n`)
          stream.end()
          return
        }

        try {
          const parsed = JSON.parse(message)
          const content = parsed.choices[0]?.delta?.content || ''
          if (content) {
            fullResponse += content
            stream.write(`event: chunk\ndata: ${JSON.stringify({ content })}\n\n`)
          }
        } catch (err) {
          console.error('Error parsing chunk:', err)
        }
      }
    })

    response.data.on('end', () => {
      if (!fullResponse) {
        stream.write('event: error\ndata: {"message":"Empty response"}\n\n')
        stream.end()
      }
      console.log('Stream ended')
    })

    response.data.on('error', (err: Error) => {
      console.error('Stream error:', err)
      stream.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`)
      stream.end()
    })

    return stream

  } catch (error) {
    console.error('API Error:', error)
    stream.write(`event: error\ndata: ${JSON.stringify({ 
      message: error.message || 'Unknown error'
    })}\n\n`)
    stream.end()

    return stream
  }
}) 