import { GoogleGenAI } from "https://esm.run/@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyDGOEA2AtjXUCKmO45RLr3t535438aFFsk"
});

const chatBox = document.getElementById("chat-box") || document.getElementById("respuesta");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("enviar");

// ——— Helpers ———
function addMessage(text, sender) {
  // mostramos como texto; MathJax leerá los $$...$$
  const container = document.createElement("div");
  container.classList.add("message", sender);

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = sender === "user" ? "👨" : "🤖";

  if (sender === "user") {
    container.appendChild(avatar);
    container.appendChild(bubble);
    container.classList.add("user");
  } else {
    container.appendChild(avatar);
    container.appendChild(bubble);
    container.classList.add("bot");
  }

  chatBox.appendChild(container);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Render LaTeX si existe
  if (window.MathJax) MathJax.typesetPromise();
}

function addLoader() {
  const m = document.createElement("div");
  m.classList.add("message", "bot");
  const a = document.createElement("div");
  a.classList.add("avatar");
  a.textContent = "🤖";
  const b = document.createElement("div");
  b.classList.add("bubble");
  b.textContent = "Escribiendo…";
  b.classList.add("loader");
  m.appendChild(a); m.appendChild(b);
  chatBox.appendChild(m);
  chatBox.scrollTop = chatBox.scrollHeight;
  return m;
}

// 1) Pide SIEMPRE fórmulas en LaTeX delimitadas
const REGLAS_LATEX = `
FORMATO OBLIGATORIO:
- Cuando incluyas una fórmula, agrega también una versión en LaTeX en BLOQUE, delimitada por $$ ... $$, en una línea aparte.
- No uses bloques de código para LaTeX.
- Ejemplo de bloque: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$
`;

// 2) Normaliza el texto para MathJax
function normalizarParaMathJax(texto) {
  let t = texto;

  // Convertir bloques ```latex ...``` o ``` ...``` a $$ ... $$
  t = t.replace(/```(?:latex|math)?\s*([\s\S]*?)```/gi, (_, body) => {
    const limpio = body.trim();
    return `\n$$${limpio}$$\n`;
  });

  // Si hay comandos LaTeX pero sin $$, envuelve la última línea “tipo ecuación”
  if (!/\$\$[\s\S]*\$\$/.test(t) && /\\(frac|sqrt|sum|int|lim|alpha|beta|gamma|theta)/.test(t)) {
    const lineas = t.split(/\r?\n/);
    for (let i = lineas.length - 1; i >= 0; i--) {
      const L = lineas[i].trim();
      if (L && (L.includes("\\frac") || L.includes("\\sqrt") || /\\[a-zA-Z]+/.test(L)) ) {
        lineas[i] = `$$${L}$$`;
        t = lineas.join("\n");
        break;
      }
    }
  }

  return t;
}

async function enviar() {
  const pregunta = input.value.trim();
  if (!pregunta) return;

  addMessage(pregunta, "user");
  input.value = "";

  const loader = addLoader();

  try {
    const promptFinal = `${pregunta}\n\n${REGLAS_LATEX}`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptFinal,
    });

    let texto = response.text || "⚠️ No se pudo generar respuesta.";
    texto = normalizarParaMathJax(texto);

    loader.remove();
    addMessage(texto, "bot");

  } catch (e) {
    console.error(e);
    loader.querySelector(".bubble").textContent = "❌ Error al conectar con la API.";
  }
}

sendBtn.addEventListener("click", enviar);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviar();
  }
});
