// server/routes/api/chat.post.ts
import { defineEventHandler, readBody, createError } from 'h3' 
import { z } from 'zod' 
import axios from 'axios' 
// own of project
import { processResponse } from '../../utils/process' 
import { PLANNER_SYSTEM_PROMPT } from '../../constants/prompt' 

// Input validation schema
const chatRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  model: z.string().optional().default('google/gemini-2.0-pro-exp-02-05:free')
}) 

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
      },
      {
        headers: {
          'Authorization': `Bearer ${config.openrouterApiKey}`,
          'HTTP-Referer': config.appUrl || 'http://localhost:3000',
          'X-Title': 'Methodical',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    ) 
    const responseText = response.data.choices[0].message.content     
    const { structuredData, explanation } = processResponse(responseText) 
    return {
      data: structuredData,
      explanation: explanation,
      model: response.data.model,
      creditsUsed: response.data.usage.total_tokens
    } 
  } catch (error) {
    console.error('API Error:', error.name, error.message) 
    if (error.response) {
      throw createError({
        statusCode: error.response.status,
        statusMessage: 'External API error',
        data: error.response.data
      }) 
    } else if (error.request) {
      throw createError({
        statusCode: 504,
        statusMessage: 'Gateway timeout',
        data: 'No response received from external API'
      }) 
    } else {
      throw createError({
        statusCode: 500,
        statusMessage: 'Internal server error',
        data: error.message
      }) 
    }
  }
}) 