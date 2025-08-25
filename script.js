import { GoogleGenAI } from "https://esm.run/@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyDGOEA2AtjXUCKmO45RLr3t535438aFFsk"
});

const chatBox = document.getElementById("chat-box");
const input = document.getElementById("prompt");
const sendBtn = document.getElementById("enviar");

// Cargar historial de localStorage
window.addEventListener("load", () => {
  const historial = JSON.parse(localStorage.getItem("chatHistorial")) || [];
  historial.forEach(msg => addMessage(msg.text, msg.sender, false));
  if (window.MathJax) MathJax.typesetPromise();
});

// Guardar historial
function guardarHistorial() {
  const mensajes = [...chatBox.querySelectorAll(".message")].map(m => ({
    sender: m.classList.contains("user") ? "user" : "bot",
    text: m.querySelector(".bubble").textContent
  }));
  localStorage.setItem("chatHistorial", JSON.stringify(mensajes));
}

function addMessage(text, sender, guardar = true) {
  const msg = document.createElement("div");
  msg.classList.add("message", sender);

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = sender === "user" ? "👨" : "🤖";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble");
  bubble.textContent = text;

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;

  if (guardar) guardarHistorial();

  if (window.MathJax) MathJax.typesetPromise();
}

function addLoader() {
  const msg = document.createElement("div");
  msg.classList.add("message", "bot");

  const avatar = document.createElement("div");
  avatar.classList.add("avatar");
  avatar.textContent = "🤖";

  const bubble = document.createElement("div");
  bubble.classList.add("bubble", "loader");
  bubble.textContent = "Escribiendo...";

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight;
  return msg;
}

async function enviarMensaje() {
  const pregunta = input.value.trim();
  if (!pregunta) return;

  addMessage(pregunta, "user");
  input.value = "";

  const loader = addLoader();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: pregunta,
    });

    const output = response.text || "⚠️ No se pudo generar respuesta.";

    loader.remove();
    addMessage(output, "bot");

  } catch (error) {
    console.error("Error con la API:", error);
    loader.querySelector(".bubble").textContent = "❌ Error al conectar con la API.";
  }
}

sendBtn.addEventListener("click", enviarMensaje);

// Enter para enviar, Shift+Enter para nueva línea
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    enviarMensaje();
  }
}); 
