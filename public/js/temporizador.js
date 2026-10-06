// Cuenta regresiva hasta la hora fija de fin (finProgramado). Al llegar se habilita
// "Finalizar"; después del límite (fin + gracia) el plazo vence y se deshabilita.
(() => {
  const form = document.querySelector(".temporizador");
  const btn = document.getElementById("btnFinalizar");
  const tiempo = document.getElementById("tiempo");
  const nota = document.getElementById("nota");
  const volver = document.getElementById("volver");

  const fin = Number(form.dataset.fin);
  const limite = Number(form.dataset.limite);
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

  let fase = "";
  function cambiarFase(nueva) {
    if (fase === nueva) return;
    fase = nueva;
    nota.textContent = nota.dataset[nueva];
    if (nueva === "listo") {
      btn.disabled = false;
      detenerReloj();
    }
    if (nueva === "vencido") {
      btn.disabled = true;
      detenerReloj();
      volver.hidden = false;
      clearInterval(intervalo);
    }
  }

  function actualizar() {
    const ahora = Date.now() + desfase;
    const restante = Math.max(fin - ahora, 0);
    const s = Math.ceil(restante / 1000);
    tiempo.textContent = `${dos(Math.floor(s / 3600))}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}`;
    document.title = `${tiempo.textContent} | Compensación en curso`;

    if (ahora > limite) cambiarFase("vencido");
    else if (restante === 0) cambiarFase("listo");
    else cambiarFase("espera");
  }

  const intervalo = setInterval(actualizar, 1000);
  actualizar();

  // Advertir si se intenta cerrar la página antes de finalizar
  let enviando = false;
  window.addEventListener("beforeunload", (e) => {
    if (!enviando && fase !== "vencido") e.preventDefault();
  });
  form.addEventListener("submit", () => { enviando = true; btn.disabled = true; });
})();
