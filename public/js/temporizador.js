// Cuenta regresiva de la compensación. El botón "Finalizar" se habilita al llegar a 00:00:00.
(() => {
  const form = document.querySelector(".temporizador");
  const btn = document.getElementById("btnFinalizar");
  const tiempo = document.getElementById("tiempo");

  const inicio = Number(form.dataset.inicio);
  const duracion = Number(form.dataset.duracion);
  // Corrige la diferencia entre el reloj del servidor y el del navegador
  const desfase = Number(form.dataset.ahora) - Date.now();

  const dos = (n) => String(n).padStart(2, "0");

  // Reloj de arena: al terminar se congela con la arena abajo y el reloj derecho
  const reloj = document.getElementById("relojArena");
  const ciclo = Number(reloj?.dataset.ciclo || 0);
  function detenerReloj() {
    if (!reloj?.pauseAnimations) return;
    reloj.pauseAnimations();
    reloj.setCurrentTime(ciclo * 0.82);
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) detenerReloj();

  function actualizar() {
    const restante = Math.max(inicio + duracion - (Date.now() + desfase), 0);
    const s = Math.ceil(restante / 1000);
    tiempo.textContent = `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
    document.title = `${tiempo.textContent} | Compensación en curso`;

    if (restante === 0) {
      btn.disabled = false;
      detenerReloj();
      clearInterval(intervalo);
    }
  }

  const intervalo = setInterval(actualizar, 1000);
  actualizar();

  // Advertir si se intenta cerrar la página antes de finalizar
  let enviando = false;
  window.addEventListener("beforeunload", (e) => { if (!enviando && btn.disabled) e.preventDefault(); });
  form.addEventListener("submit", () => { enviando = true; btn.disabled = true; });
})();
