// --- script.js ---
// Animación al hacer clic en COMPRAR AHORA

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("buyBtn");

  btn.addEventListener("click", () => {
    btn.disabled = true;
    const original = btn.textContent;
    btn.innerHTML = '<span class="spinner"></span> Procesando…';

    setTimeout(() => {
      // Scroll hacia la tienda
      document.querySelector("#tienda").scrollIntoView({ behavior: "smooth" });

      // Resetear el botón
      btn.innerHTML = original;
      btn.disabled = false;

      // Confetti con emojis 🎉
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          const e = document.createElement("div");
          e.textContent = "🎉";
          e.style.position = "fixed";
          e.style.left = Math.random() * 100 + "vw";
          e.style.top = "-2rem";
          e.style.fontSize = "1.2rem";
          e.style.animation = "fall 2s linear forwards";
          document.body.appendChild(e);
          setTimeout(() => e.remove(), 2000);
        }, i * 100);
      }
    }, 1000);
  });

  // Año en el footer
  document.getElementById("year").textContent = new Date().getFullYear();

  // Animación de caída
  const style = document.createElement("style");
  style.textContent = `@keyframes fall { to { transform: translateY(100vh); opacity: 0; } }`;
  document.head.appendChild(style);
}); 
