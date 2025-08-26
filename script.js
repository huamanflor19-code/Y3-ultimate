// === CONFIG ===
const API_KEY = "AIzaSyDGOEA2AtjXUCKmO45RLr3t535438aFFsk";            // <- pega tu key
const MODEL   = "gemini-2.5-flash";           // modelo

// === DOM ===
const chatBox = document.getElementById("chat-box");
const input   = document.getElementById("prompt");
const sendBtn = document.getElementById("enviar");

// === Filtro de preguntas prohibidas ===
const bannedPhrases = [
  "quien te creo","quién te creó","quien te creó",
  "quien te hizo","quién te hizo",
  "qué eres","que eres","eres humano","eres una ia","eres real",
  "cual es tu modelo","qué modelo eres","que modelo eres"
];
function esPreguntaBaneada(texto) {
  const t = (texto||"").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return bannedPhrases.some(fr => t.includes(fr));
}

// === Cálculo local con math.js: activar con "= ..." o "/calc ..." ===
function esCalculo(s) {
  const t = (s||"").trim();
  return t.startsWith("=") || t.startsWith("/calc ");
}
function evaluarConMathJS(entrada) {
  let expr = entrada.trim();
  if (expr.startsWith("/calc ")) expr = expr.slice(6).trim();
  if (expr.startsWith("="))     expr = expr.slice(1).trim();
  if (!expr) throw new Error("Expresión vacía");

  const node   = math.parse(expr);
  const result = node.evaluate();

  // Resultado en texto legible (sin LaTeX)
  const resultStr = Array.isArray(result)
    ? JSON.stringify(result)
    : (math.typeOf(result) === "Matrix" ? JSON.stringify(result.toArray())
       : String(math.format(result, { precision: 14 })));

  return `${expr} = ${resultStr}`;
}

// === UI helpers ===
function addMessage(text, who="bot") {
  const div = document.createElement("div");
  div.className = `message ${who}`;
  // usamos monospace para que las fórmulas ASCII queden prolijas
  div.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}
function addLoader() {
  const div = document.createElement("div");
  div.className = "message bot loader";
  div.textContent = "Escribiendo…";
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
  return div;
}

// === Conversor simple LaTeX -> Texto legible (sin MathJax) ===
function latexToPlain(input) {
  if (!input) return "";

  let s = String(input);

  // quitar delimitadores $$...$$ y $...$
  s = s.replace(/\$\$?/g, "");

  // bloques ```latex ...``` o ``` ... ```
  s = s.replace(/```(?:latex|math)?\s*([\s\S]*?)```/gi, (_, body) => body.trim());

  // \left \right (se quitan)
  s = s.replace(/\\left|\\right/g, "");

  // \frac{a}{b} -> (a)/(b) (aplica varias veces por si hay anidados simples)
  const frac = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
  for (let i=0; i<10; i++) { // hasta 10 pasadas para casos comunes
    if (!frac.test(s)) break;
    s = s.replace(frac, "($1)/($2)");
  }

  // \sqrt[n]{x} y \sqrt{x}
  s = s.replace(/\\sqrt\[(.+?)\]\{(.+?)\}/g, "root($1)($2)");
  s = s.replace(/\\sqrt\{(.+?)\}/g, "sqrt($1)");

  // potencias y subíndices {…}
  s = s.replace(/\^\{([^{}]+)\}/g, "^($1)");
  s = s.replace(/_\{([^{}]+)\}/g, "_($1)");
  // potencias simples ^x dejan igual
  // signos y símbolos frecuentes
  const map = {
    "\\cdot": "*", "\\times": "×", "\\div": "÷",
    "\\pm": "±", "\\mp": "∓",
    "\\leq": "≤", "\\geq": "≥", "\\neq": "≠", "\\approx": "≈",
    "\\infty": "∞", "\\pi": "π", "\\theta": "θ", "\\alpha": "α",
    "\\beta": "β", "\\gamma": "γ", "\\Delta": "Δ", "\\delta": "δ"
  };
  for (const k in map) {
    s = s.replace(new RegExp(k, "g"), map[k]);
  }

  // espacios LaTeX
  s = s.replace(/\\[,;! ]/g, " ");

  // limpiar múltiples espacios
  s = s.replace(/[ \t]+/g, " ").trim();

  return s;
}

// === Envío principal ===
async function enviar() {
  const pregunta = (input.value || "").trim();
  if (!pregunta) return;

  addMessage(pregunta, "user");
  input.value = "";

  // 0) Filtro de preguntas prohibidas
  if (esPreguntaBaneada(pregunta)) {
    addMessage("🤖 Prefiero no responder a esa pregunta.", "bot");
    return;
  }

  // 1) Cálculo local
  if (esCalculo(pregunta)) {
    try {
      const out = evaluarConMathJS(pregunta);
      addMessage(out, "bot");
    } catch (e) {
      console.error(e);
      addMessage("❌ Error al evaluar la expresión. Revisa la sintaxis.", "bot");
    }
    return;
  }

  // 2) Llamada a Gemini (REST con fetch)
  const loader = addLoader();
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: pregunta + "\n\nResponde con fórmulas en texto plano legible (usa sqrt(), ^, y fracciones como (a)/(b)). Evita LaTeX." }] }]
        })
      }
    );
    const data = await resp.json();

    let texto = data?.candidates?.[0]?.content?.parts?.[0]?.text
             || "⚠️ No se pudo generar respuesta.";

    // Si igual vino en LaTeX, lo convertimos a texto
    texto = latexToPlain(texto);

    loader.remove();
    addMessage(texto, "bot");
  } catch (e) {
    console.error(e);
    loader.textContent = "❌ Error al conectar con la API.";
  }
}

// Listeners
sendBtn?.addEventListener("click", enviar);
input?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviar();
  }
});
