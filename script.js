    import { GoogleGenAI } from "https://esm.run/@google/genai";

// 🔑 API Key (solo para pruebas, nunca en producción)
const ai = new GoogleGenAI({
  apiKey: "AIzaSyDGOEA2AtjXUCKmO45RLr3t535438aFFsk"
});

// 📌 Frases prohibidas
const bannedPhrases = [
  "quien te creo",
  "quién te creó",
  "quien te creó",
  "quien te hizo",
  "quién te hizo",
  "qué eres",
  "que eres",
  "eres humano",
  "eres una ia",
  "eres real",
  "cual es tu modelo",
  "qué modelo eres",
  "que modelo eres"
];

function esPreguntaBaneada(texto) {
  const t = texto.toLowerCase()
                 .normalize("NFD")
                 .replace(/[\u0300-\u036f]/g, ""); // elimina tildes
  return bannedPhrases.some(frase => t.includes(frase));
}

// 📌 Detección de cálculo matemático
function esCalculo(texto) {
  return /[0-9+\-*/^=()]/.test(texto);
}

// 📌 Evaluador con math.js
function evaluarConMathJS(expr) {
  try {
    const node = math.parse(expr);
    const result = node.evaluate();
    const latex = `\\( ${node.toTex()} = ${math.format(result)} \\)`;
    return { latex, result };
  } catch (err) {
    throw new Error("Expresión inválida");
  }
}

// 📌 Agregar mensajes al chat
function addMessage(texto, sender = "bot") {
  const chat = document.getElementById("chat");
  const msg = document.createElement("div");
  msg.className = `msg ${sender}`;

  if (sender === "bot") {
    // render con KaTeX si hay fórmula
    if (texto.includes("\\(") || texto.includes("\\[")) {
      renderMathInElement(msg, {
        delimiters: [
          { left: "\\(", right: "\\)", display: false },
          { left: "\\[", right: "\\]", display: true }
        ]
      });
      msg.innerHTML = texto;
    } else {
      msg.textContent = texto;
    }
  } else {
    msg.textContent = texto;
  }

  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

// 📌 Loader mientras responde la API
function addLoader() {
  const chat = document.getElementById("chat");
  const loader = document.createElement("div");
  loader.className = "msg bot loading";
  loader.innerHTML = "<span class='dot'></span><span class='dot'></span><span class='dot'></span>";
  chat.appendChild(loader);
  chat.scrollTop = chat.scrollHeight;
  return loader;
}

// 📌 Enviar mensaje
async function enviar() {
  const input = document.getElementById("prompt");
  const pregunta = input.value.trim();
  if (!pregunta) return;

  addMessage(pregunta, "user");
  input.value = "";

  // 🚫 Pregunta prohibida
  if (esPreguntaBaneada(pregunta)) {
    addMessage("🤖 Prefiero no responder a esa pregunta.", "bot");
    return;
  }

  // ➗ Pregunta matemática local
  if (esCalculo(pregunta)) {
    try {
      const { latex } = evaluarConMathJS(pregunta);
      addMessage(latex, "bot");
    } catch {
      addMessage("❌ Error al evaluar la expresión.", "bot");
    }
    return;
  }

  // 🌐 Consulta a la API
  const loader = addLoader();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: pregunta,
    });

    let texto = response.text || "⚠️ No se pudo generar respuesta.";
    // convertir bloques de latex en delimitadores KaTeX
    texto = texto.replace(/```(?:latex|math)?\s*([\s\S]*?)```/gi, (_, body) => `\n\\[${body.trim()}\\]\n`);

    loader.remove();
    addMessage(texto, "bot");
  } catch (e) {
    console.error(e);
    loader.querySelector(".loading").textContent = "❌ Error al conectar con la API.";
  }
}

// 📌 Listener
document.getElementById("enviar").addEventListener("click", enviar);
