// --- script.js ESTABLE — MathJax + math.js + fetch + filtro ---

// 🔐 Config
const API_KEY = "AIzaSyDGOEA2AtjXUCKmO45RLr3t535438aFFsk";
const MODEL = "gemini-2.5-flash";

// 🌐 Elementos del DOM (compat: #chat-box o #respuesta)
const chatBox = document.getElementById("chat-box") || document.getElementById("respuesta");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("enviar");

// ——————— UI helpers ———————
function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = `message ${sender}`;

  // opcional: burbuja simple; usa tu CSS existente .message.user/.message.bot
  msg.textContent = text;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  // Render LaTeX en este mensaje (MathJax v3)
  if (window.MathJax?.typesetPromise) {
    MathJax.typesetPromise([msg]).catch(() => {});
  }
}

function addLoader() {
  const msg = document.createElement("div");
  msg.className = "message bot";
  msg.textContent = "Escribiendo…";
  msg.style.opacity = "0.7";
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

// ——————— Filtro preguntas prohibidas ———————
const bannedPhrases = [
  "quien te creo","quién te creó","quien te creó","quien te hizo","quién te hizo",
  "qué eres","que eres","eres humano","eres una ia","eres real",
  "cual es tu modelo","qué modelo eres","que modelo eres"
];

function esPreguntaBaneada(texto) {
  const t = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return bannedPhrases.some(frase => t.includes(frase));
}

// ——————— Evaluador con math.js ———————
// Activación solo con prefijo: "= ..." o "/calc ..."
function esCalculo(s) {
  const t = s.trim();
  return t.startsWith("=") || t.startsWith("/calc ");
}

function evaluarConMathJS(entrada) {
  // limpia prefijo
  let expr = entrada.trim();
  if (expr.startsWith("/calc ")) expr = expr.slice(6).trim();
  if (expr.startsWith("=")) expr = expr.slice(1).trim();

  if (!expr) throw new Error("Expresión vacía");

  const node = math.parse(expr);
  const result = node.evaluate();

  const exprTex = node.toTex({ parenthesis: "keep", implicit: "show" });

  let resultTex;
  if (math.typeOf(result) === "Matrix") {
    const arr = result.toArray();
    const filas = arr.map(row => (Array.isArray(row) ? row.join(" & ") : row)).join(" \\\\ ");
    resultTex = `\\begin{bmatrix}${filas}\\end{bmatrix}`;
  } else {
    // intenta latex del resultado; si falla, usa string
    try {
      resultTex = math.parse(String(math.format(result, { precision: 14 }))).toTex({ parenthesis: "keep" });
    } catch {
      resultTex = String(result).replace(/_/g, "\\_");
    }
  }

  return `$$${exprTex} = ${resultTex}$$`;
}

// ——————— Normalizador LaTeX para MathJax ———————
function normalizarLatexParaMathJax(texto) {
  let t = texto || "";

  // bloques ```latex ...``` o ``` ...``` -> $$ ... $$
  t = t.replace(/```(?:latex|math)?\s*([\s\S]*?)```/gi, (_, body) => `\n$$${body.trim()}$$\n`);

  // si detecta comandos LaTeX sin $$, envuelve la última línea "matemática"
  if (!/\$\$[\s\S]*\$\$/.test(t) && /\\(frac|sqrt|sum|int|lim|alpha|beta|gamma|theta)/.test(t)) {
    const lineas = t.split(/\r?\n/);
    for (let i = lineas.length - 1; i >= 0; i--) {
      const L = lineas[i].trim();
      if (!L) continue;
      if (L.includes("\\frac") || L.includes("\\sqrt") || /\\[a-zA-Z]+/.test(L)) {
        lineas[i] = `$$${L}$$`;
        t = lineas.join("\n");
        break;
      }
    }
  }
  return t;
}

// ——————— Envío ———————
async function enviar() {
  const pregunta = (input.value || "").trim();
  if (!pregunta) return;

  addMessage(pregunta, "user");
  input.value = "";

  // 0) filtro
  if (esPreguntaBaneada(pregunta)) {
    addMessage("🤖 Prefiero no responder a esa pregunta.", "bot");
    return;
  }

  // 1) cálculo local
  if (esCalculo(pregunta)) {
    try {
      const latex = evaluarConMathJS(pregunta);
      addMessage(latex, "bot");
    } catch (e) {
      console.error(e);
      addMessage("❌ Error al evaluar la expresión. Revisa la sintaxis.", "bot");
    }
    return;
  }

  // 2) llamada a Gemini (REST con fetch)
  const loader = addLoader();
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: pregunta }] }] })
      }
    );

    const data = await resp.json();

    let texto = data?.candidates?.[0]?.content?.parts?.[0]?.text
              || data?.candidates?.[0]?.content?.parts?.[0]?.text?.[0]
              || "⚠️ No se pudo generar respuesta.";

    texto = normalizarLatexParaMathJax(texto);

    loader.remove();
    addMessage(texto, "bot");
  } catch (e) {
    console.error(e);
    loader.textContent = "❌ Error al conectar con la API.";
  }
}

// ——————— Listeners ———————
sendBtn?.addEventListener("click", enviar);
input?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviar();
  }
});
