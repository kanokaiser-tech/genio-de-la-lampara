import { getDb } from "./queries/connection";

const DEEPSEEK_API_KEY = "sk-85ef8b9e1ff446d4822407982dbf742e";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

export async function moderateWithDeepSeek(title: string, description: string, category?: string): Promise<{ approved: boolean; reason: string }> {
  const prompt = `
Eres un moderador de un marketplace de revendedores. Solo se permiten productos usados como:
- Celulares, teléfonos, smartphones
- Notebooks, laptops, tablets
- Consolas de videojuegos
- Electrodomésticos pequeños usados

NO se permiten:
- Drogas, alcohol, tabaco, medicamentos (incluyendo lunfardo como "fafa", "merca", "blanca", "flor", "paco", "tusi", "ketamina", "faso", "porro", "churro", "flores", "cogollos", "pasta", "coca", "perico", "falopa", "polvo", "cristal", "tusi", "éxtasis", "lcd", "papel", "acido", "lsd", "maria", "riri", "la blanca", "blanquita", "nieve", "dolly")
- Armas, cuchillos, navajas, machetes
- Productos que ya vende la tienda oficial (si el nombre coincide con productos del catálogo)
- Productos ilegales o prohibidos por ley
- Billetes, moneda extranjera, dólares

Analiza este producto:
Título: "${title}"
Descripción: "${description || 'Sin descripción'}"
Categoría: "${category || 'Sin categoría'}"

Responde SOLO con un JSON: {"approved": true/false, "reason": "motivo breve"}
`;

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    return { approved: result.approved, reason: result.reason };
  } catch (error) {
    console.error("Error en DeepSeek:", error);
    return { approved: false, reason: "Error en moderación automática, requiere revisión manual" };
  }
}
