/* ============================================================
   SCRIPT.JS — Site de Convite
   Máquina de estados simples e linear. Sem lógica redundante.
   ============================================================

   ESTADOS:
   ┌─────────────┐
   │   'start'   │  Tela inicial: "Quer sair comigo?"
   └──────┬──────┘
          │ NÃO
   ┌──────▼──────┐
   │   'no-1'    │  "Tem certeza? 🥺"
   └──────┬──────┘
          │ NÃO
   ┌──────▼──────┐
   │   'no-2'    │  Mensagem engraçada (pode repetir/variar)
   └──────┬──────┘
          │ SIM (de qualquer estado acima)
   ┌──────▼──────┐
   │   'done'    │  MENSAGEM FINAL. Sem botões. FIM.
   └─────────────┘

   Em qualquer estado, SIM leva direto a 'done'.
   O estado 'done' não tem botões e não tem transições.
   ============================================================ */

'use strict';

/* ─────────────────────────────────────────────────────────────
   1. REFERÊNCIAS AO DOM
   Um único ponto de referência para cada elemento.
───────────────────────────────────────────────────────────── */
const card           = document.getElementById('main-card');
const cardEmoji      = document.getElementById('card-emoji');
const cardTitle      = document.getElementById('card-title');
const cardSubtitle   = document.getElementById('card-subtitle');
const cardNote       = document.getElementById('card-note');
const buttonsArea    = document.getElementById('buttons-area');
const btnYes         = document.getElementById('btn-yes');
const btnNo          = document.getElementById('btn-no');
const confettiCanvas = document.getElementById('confetti-canvas');

/* ─────────────────────────────────────────────────────────────
   2. ESTADO ATUAL
   Uma única variável controla em qual estado estamos.
───────────────────────────────────────────────────────────── */
let currentState = 'start';

/* ─────────────────────────────────────────────────────────────
   3. DEFINIÇÃO DOS ESTADOS
   Cada estado descreve exatamente o que mostrar.
   showYes / showNo controlam a visibilidade dos botões.
───────────────────────────────────────────────────────────── */
const STATES = {

  start: {
    emoji:   '💌',
    title:   'Tenho uma pergunta<br>importante pra te fazer...&nbsp;👀',
    subtitle: 'Quer sair comigo?',
    note:    '',
    showYes: true,
    showNo:  true,
  },

  'no-1': {
    emoji:   '🥺',
    title:   'Tem certeza?',
    subtitle: 'Pode pensar melhor antes de tomar essa decisão...',
    note:    '',
    showYes: true,
    showNo:  true,
  },

  'no-2': {
    emoji:   '😭',
    title:   'É sério que tu vai escolher o NÃO?',
    subtitle: 'O SIM tá bem ali, olha só...',
    note:    '(vai lá, clica no SIM, eu sei que você quer kkk)',
    showYes: true,
    showNo:  true,
  },

  // Estados 'no-3' em diante: ficam em 'no-2' infinitamente
  // (o handler de NÃO não avança além de 'no-2')

  done: {
    emoji:   '🎉',
    title:   'AGORA SIM KKKKK ❤️',
    subtitle: 'Agora volta a falar com Matheus\npra vocês decidirem pra onde ir 😂',
    note:    '',
    showYes: false,  // ← SEM BOTÃO SIM
    showNo:  false,  // ← SEM BOTÃO NÃO
  },

};

/* ─────────────────────────────────────────────────────────────
   4. FUNÇÃO ÚNICA DE ATUALIZAÇÃO DA INTERFACE
   Toda mudança de tela passa por aqui.
───────────────────────────────────────────────────────────── */

/**
 * Aplica um fade-out → muda conteúdo → fade-in.
 * @param {string} stateKey - Chave de STATES a aplicar.
 */
function goToState(stateKey) {
  const state = STATES[stateKey];
  if (!state) return;

  currentState = stateKey;

  // Fade out
  card.classList.remove('entering');
  card.classList.add('transitioning');

  setTimeout(() => {
    card.classList.remove('transitioning');

    // ── Atualiza conteúdo ──────────────────────────────────

    // Emoji
    cardEmoji.textContent = state.emoji;

    // Título (aceita HTML para <br>)
    cardTitle.innerHTML = state.title;

    // Subtítulo (suporte a \n)
    cardSubtitle.textContent = state.subtitle;
    cardSubtitle.style.whiteSpace = state.subtitle.includes('\n') ? 'pre-line' : '';

    // Nota extra
    if (state.note) {
      cardNote.classList.remove('hidden');
      cardNote.textContent = state.note;
      // Double rAF garante que a transição CSS de opacidade funcione
      requestAnimationFrame(() => {
        requestAnimationFrame(() => cardNote.classList.add('visible'));
      });
    } else {
      cardNote.classList.remove('visible');
      cardNote.classList.add('hidden');
    }

    // Botões — texto sempre restaurado ao padrão
    btnYes.textContent = 'SIM ❤️';
    btnNo.textContent  = 'NÃO 😭';

    // Visibilidade dos botões
    btnYes.classList.toggle('hidden', !state.showYes);
    btnNo.classList.toggle('hidden',  !state.showNo);

    // ── Fade in ────────────────────────────────────────────
    card.classList.add('entering');
    setTimeout(() => card.classList.remove('entering'), 400);

  }, 260); // tempo do fade-out
}

/* ─────────────────────────────────────────────────────────────
   5. HANDLERS DOS BOTÕES
   Cada handler só decide para qual estado ir.
───────────────────────────────────────────────────────────── */

function handleYes() {
  // SIM sempre leva para o estado final, independente de onde estamos.
  // Nenhuma confirmação. Nenhum botão extra. Nenhuma tela intermediária.
  goToState('done');
  // Dispara confetes após a transição
  setTimeout(() => startConfetti(), 300);
}

function handleNo() {
  // Avança na sequência de NÃO sem passar de 'no-2'
  if (currentState === 'start') {
    goToState('no-1');
  } else {
    // 'no-1' e qualquer estado além → vai para 'no-2' (e fica lá)
    goToState('no-2');
  }
}

/* ─────────────────────────────────────────────────────────────
   6. EVENT LISTENERS
   Proteção contra double-fire (click + touchend no mobile).
───────────────────────────────────────────────────────────── */

let lastTouchTime = 0;

/**
 * Envolve um handler para evitar que click e touchend disparem juntos.
 * Em dispositivos touch, touchend chega antes de click (~300ms depois).
 * Guardamos o timestamp do último touchend e descartamos
 * qualquer click que chegue dentro de 500ms.
 */
function safeTouchHandler(fn) {
  return function onEvent(e) {
    if (e.type === 'touchend') {
      e.preventDefault();          // evita o click sintético
      lastTouchTime = Date.now();
      fn();
      return;
    }
    // É um click: só executa se não veio de um touchend recente
    if (Date.now() - lastTouchTime < 500) return;
    fn();
  };
}

btnYes.addEventListener('touchend', safeTouchHandler(handleYes));
btnYes.addEventListener('click',    safeTouchHandler(handleYes));

btnNo.addEventListener('touchend', safeTouchHandler(handleNo));
btnNo.addEventListener('click',    safeTouchHandler(handleNo));

/* ─────────────────────────────────────────────────────────────
   7. SISTEMA DE CONFETES
   Partículas coloridas caem pelo canvas quando SIM é clicado.
───────────────────────────────────────────────────────────── */

let confettiAnimId    = null;
let confettiParticles = [];

const CONFETTI_COLORS = [
  '#ec4899', '#f472b6', '#c084fc',
  '#fb7185', '#fbbf24', '#34d399', '#60a5fa',
];
const CONFETTI_EMOJIS = ['❤️', '✨', '💕', '⭐', '💫', '🎉', '💖'];

function createConfettiParticle() {
  const useEmoji = Math.random() < 0.25;
  return {
    x:         Math.random() * confettiCanvas.width,
    y:         -10,
    vx:        (Math.random() - 0.5) * 3,
    vy:        Math.random() * 3 + 2,
    rotation:  Math.random() * 360,
    rotSpeed:  (Math.random() - 0.5) * 8,
    size:      useEmoji ? Math.random() * 10 + 12 : Math.random() * 8 + 5,
    color:     CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    isEmoji:   useEmoji,
    emoji:     CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
    shape:     Math.random() < 0.5 ? 'rect' : 'circle',
    opacity:   1,
    fadeDelay: Math.random() * 120 + 60,
    frame:     0,
  };
}

function startConfetti() {
  // Para qualquer confete anterior
  stopConfetti();

  const canvas = confettiCanvas;
  const ctx    = canvas.getContext('2d');

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  canvas.classList.add('active');

  // Partículas iniciais distribuídas pela metade superior da tela
  confettiParticles = [];
  for (let i = 0; i < 80; i++) {
    const p = createConfettiParticle();
    p.y = Math.random() * canvas.height * 0.5;
    confettiParticles.push(p);
  }

  let spawnTimer = 0;

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn contínuo de partículas
    spawnTimer++;
    if (spawnTimer >= 3 && confettiParticles.length < 150) {
      confettiParticles.push(createConfettiParticle());
      spawnTimer = 0;
    }

    // Remove partículas invisíveis
    confettiParticles = confettiParticles.filter(p => p.opacity > 0.01);

    confettiParticles.forEach(p => {
      p.frame++;
      p.x        += p.vx;
      p.y        += p.vy;
      p.vy       += 0.05; // gravidade suave
      p.rotation += p.rotSpeed;

      if (p.frame > p.fadeDelay) p.opacity -= 0.008;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);

      if (p.isEmoji) {
        ctx.font         = `${p.size}px serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
      } else if (p.shape === 'rect') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });

    confettiAnimId = requestAnimationFrame(animate);
  }

  animate();

  // Para automaticamente após 5 segundos
  setTimeout(stopConfetti, 5000);
}

function stopConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  confettiParticles = [];

  const ctx = confettiCanvas.getContext('2d');
  ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  confettiCanvas.classList.remove('active');
}

/* ─────────────────────────────────────────────────────────────
   8. AJUSTE DO CANVAS AO REDIMENSIONAR
───────────────────────────────────────────────────────────── */
window.addEventListener('resize', () => {
  if (confettiAnimId) {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }
});

/* ─────────────────────────────────────────────────────────────
   9. PREVENÇÃO DE SCROLL INDESEJADO NO MOBILE
───────────────────────────────────────────────────────────── */
document.addEventListener('touchmove', (e) => {
  if (e.target.closest('.card') || e.target === confettiCanvas) {
    e.preventDefault();
  }
}, { passive: false });

/* ─────────────────────────────────────────────────────────────
   10. INICIALIZAÇÃO
───────────────────────────────────────────────────────────── */
(function init() {
  // Aplica o estado inicial sem animação (página acabou de carregar)
  currentState = 'start';
  console.log('💌 Site iniciado. Boa sorte, Matheus!');
})();
