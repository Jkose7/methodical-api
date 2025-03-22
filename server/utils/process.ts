// helper to process response and extract both JSON and explanation
export const processResponse = (responseText: string) => {
  console.log('Raw response:', responseText)  
  let structuredData = null
  let explanation = ""
  try {
    const parts = responseText.split(/PART \d+:/i);    
    if (parts.length > 1) {
      explanation = parts[1] || '';
      explanation = explanation.trim();      
      let jsonText = parts[2] || '';
      jsonText = jsonText.trim();      
      const jsonMatch = jsonText.match(/\[.*\]/s);
      if (jsonMatch) {
        structuredData = JSON.parse(jsonMatch[0]);
      } else {
        const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          structuredData = JSON.parse(codeBlockMatch[1]);
        }
      }
    } 
    // Fallback para otros formatos de respuesta
    else {
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch && jsonMatch[1]) {
        structuredData = JSON.parse(jsonMatch[1]);
        explanation = responseText.replace(/```(?:json)?\s*[\s\S]*?```/, '').trim();
      } 
      else {
        const possibleJson = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (possibleJson) {
          structuredData = JSON.parse(possibleJson[0]);
          explanation = responseText.replace(possibleJson[0], '').trim();
        } else {
          structuredData = { error: 'No valid JSON found' };
          explanation = responseText;
        }
      }
    }
    explanation = explanation
      .replace(/\\boxed\{[\s\S]*?\}/g, '')
      .replace(/^\s*|\s*$/g, '')
      .replace(/^explanation:/i, '')
      .trim();
    if (!explanation || explanation === '') {
      explanation = "Task organization complete. Review the structured data for details.";
    }
  } catch (e) {
    console.error('Error processing response:', e);
    structuredData = { error: `Processing error: ${e.message}`, rawResponse: responseText };
    explanation = "There was an error processing the response. Please try again.";
  }
  return { explanation, structuredData };
}