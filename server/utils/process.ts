// helper to process response and extract both JSON and explanation
export const processResponse = (responseText: string) => {
  console.log(responseText)
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
  let structuredData = null
  let explanation = responseText
  if (jsonMatch && jsonMatch[1]) {
    try {
      structuredData = JSON.parse(jsonMatch[1].trim())
      explanation = responseText.replace(/```(?:json)?\s*[\s\S]*?```/, '').trim()
    } catch (e) {
      structuredData = { error: 'Invalid JSON structure' }
    }
    explanation = explanation.replace(/\\boxed\{[\s\S]*?\}/g, '').replace(/^\s*|\s*$/g, '')
    if (!explanation || explanation.trim() === '') {
      explanation = "Task organization complete. Review the structured data for details.";
    }
  } else {
    try {
      const possibleJson = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/)
      if (possibleJson) {
        structuredData = JSON.parse(possibleJson[0])
        explanation = responseText.replace(possibleJson[0], '').trim()
      }
    } catch (e) {
      structuredData = { error: 'No valid JSON found', rawResponse: responseText }
    }
  }
  return { structuredData, explanation }
}