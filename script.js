// ================= 상태 =================
let addedCount = 0;
let pourLv = 0;
let pourTimer = null;
let bakeInterval = null;
let bakeTime = 0;
let targetTime = 0;
let bakingStarted = false;

let pourDone = false;
let pourTarget = 0;
let pourSuccess = false;

let bakeTargetTime = 0;
let bakeElapsed = 0;
let bakeRAF = null;
let bakeStartTS = null;
let bakePulled = false;

// 결과 판정용
let mixSuccess = true;
let pourGrade = ""; // "good" | "less" | "over"
let bakeGrade = ""; // "good" | "under" | "over"

const CORRECT = ["설탕", "밀가루", "계란", "버터", "바닐라 에센스", "우유"];
let selected = [];

// ================= 재료 배치 =================
const INGREDIENT_POSITIONS = {
  계란: { left: "30%", top: "40%" },
  밀가루: { left: "50%", top: "68%" },
  버터: { left: "48%", top: "18%" },
  "바닐라 에센스": { left: "72%", top: "22%" },
  우유: { left: "40%", top: "82%" },
  물: { left: "90%", top: "45%" },
  김치: { left: "62%", top: "48%" },
  설탕: { left: "20%", top: "65%" },
  사탕: { left: "80%", top: "80%" },
  감자칩: { left: "60%", top: "80%" },

};

const INGREDIENT_SIZES = {
  밀가루: "650px",
};

const INGREDIENT_ZINDEX = {
  밀가루: 1,
  우유: 9,
  계란: 6,
  버터: 2,
  설탕: 7,
  "바닐라 에센스": 3,
  김치: 5,
  사탕: 10,
  물: 4,
  감자칩:8,
};

function addIngredient(btn, name, imgSrc) {
  if (btn.disabled) return;
  btn.disabled = true;

  selected.push(name);
  if (!CORRECT.includes(name)) mixSuccess = false;

  const container = document.getElementById("bowl-contents");
  const pos = INGREDIENT_POSITIONS[name] || { left: "50%", top: "50%" };
  const size = INGREDIENT_SIZES[name] || "150px";
  const zIndex = INGREDIENT_ZINDEX[name] || 5;

  const img = document.createElement("img");
  img.src = imgSrc;
  img.alt = name;
  img.style.cssText = `
    position: absolute;
    left: ${pos.left};
    top: ${pos.top};
    width: ${size};
    height: ${size};
    object-fit: contain;
    transform: translate(-50%, -50%);
    animation: dropIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
    z-index: ${zIndex};
  `;

  container.appendChild(img);

  if (container.children.length >= 6) {
    CORRECT.forEach((i) => {
      if (!selected.includes(i)) mixSuccess = false;
    });
    document.getElementById("btn-to-pour").disabled = false;
  }
}

// ================= STEP 이동 =================
function goStep(n) {
  document
    .querySelectorAll(".screen")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById("s" + n).classList.add("active");

  animateTitle("s" + n);

  if (n === 3) {
    document.body.classList.remove("bg-dining");
    document.body.classList.add("bg-oven");
    initBake();
  }
  if (n === 4) {
    showFinal();
  }
}

// ================= 타이틀 애니 =================
function animateTitle(id) {
  const t = document.querySelector(`#${id} .screen-title`);
  if (!t) return;

  t.classList.remove("show", "shrink");
  void t.offsetWidth;

  t.classList.add("show");

  setTimeout(() => {
    t.classList.add("shrink");
  }, 1200);
}

// ================= 휘핑 =================
function startWhipAnimation() {
  const overlay = document.getElementById("whip-overlay");
  const mixingImg = document.getElementById("mixing-img");
  const pasteImg = document.getElementById("mixing-paste-img");

  document.querySelector(".mixing-station").style.display = "none";
  document.querySelector(".controls").style.display = "none";
  document.querySelector("#s1 .screen-title").style.display = "none";
  document.getElementById("btn-to-pour").style.display = "none";

  overlay.classList.add("active");

  pasteImg.classList.remove("visible");
  mixingImg.style.opacity = "1";
  mixingImg.style.position = "absolute";

  const W = window.innerWidth;
  const H = window.innerHeight;
  const cx = W / 2;
  const cy = H / 2;

  // 타원 반지름: 처음엔 작게, 점점 커짐
  const orbitRX_start = Math.min(W, H) * 0.08; // 처음 타원 X반지름
  const orbitRY_start = Math.min(W, H) * 0.05; // 처음 타원 Y반지름

  // 이미지 크기: 처음엔 작게(60px), 점점 커져서 화면 꽉 채움
  const SIZE_START = 60;
  const SIZE_END = Math.max(W, H) * 2.0; // 화면을 꽉 채울 크기

  const TOTAL_DURATION = 2800;
  let startTime = null;
  let rafId = null;
  const angle = -Math.PI / 2; // 12시 방향 시작

  // 초기 위치 세팅
  mixingImg.style.width = SIZE_START + "px";
  mixingImg.style.height = SIZE_START + "px";
  mixingImg.style.left = cx - SIZE_START / 2 + "px";
  mixingImg.style.top = cy - orbitRY_start - SIZE_START / 2 + "px";

  function orbit(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;
    // 0 → 1
    const progress = Math.min(elapsed / TOTAL_DURATION, 1);

    // easeInQuad — 처음엔 천천히, 나중엔 빠르게 커짐
    const ease = progress * progress;

    // 현재 이미지 크기
    const size = SIZE_START + (SIZE_END - SIZE_START) * ease;
    const half = size / 2;

    // 타원 반지름도 점점 커짐 (화면 절반까지)
    const rX = orbitRX_start + (W * 0.5 - orbitRX_start) * ease;
    const rY = orbitRY_start + (H * 0.4 - orbitRY_start) * ease;

    // 총 3바퀴 회전
    const currentAngle = angle + progress * Math.PI * 2 * 3;

    const x = cx + rX * Math.cos(currentAngle);
    const y = cy + rY * Math.sin(currentAngle);

    mixingImg.style.width = size + "px";
    mixingImg.style.height = size + "px";
    mixingImg.style.left = x - half + "px";
    mixingImg.style.top = y - half + "px";
    // 방향은 고정 (원래 방향 유지)
    mixingImg.style.transform = "none";

    if (progress < 1) {
      rafId = requestAnimationFrame(orbit);
    } else {
      // 화면 꽉 찬 상태 → 반죽 페이드인
      mixingImg.style.opacity = "0";
      mixingImg.style.transition = "opacity 0.4s";

      pasteImg.classList.add("visible");

      setTimeout(() => {
        pasteImg.classList.remove("visible");
        overlay.classList.remove("active");

        // 이미지 리셋
        mixingImg.style.transition = "";
        mixingImg.style.width = "";
        mixingImg.style.height = "";
        mixingImg.style.opacity = "1";

        goStep(2);
      }, 1000);
    }
  }

  rafId = requestAnimationFrame(orbit);
}

// ================= 붓기 =================
let pourLevel = 0;
let pourRAF = null;
let pourUsed = false;
let pourPouring = false;
let pourLastTime = null;

const PAN_IMAGES = {
  0: "./img/empty.png",
  10: "./img/10%.png",
  50: "./img/50%.png",
  80: "./img/80%.png",
};

function getPanImage(pct) {
  if (pct >= 80) return PAN_IMAGES[80];
  if (pct >= 50) return PAN_IMAGES[50];
  if (pct >= 10) return PAN_IMAGES[10];
  return PAN_IMAGES[0];
}

function updatePanImage(pct) {
  const img = document.getElementById("pan-img");
  const src = getPanImage(pct);

  if (!img.src.endsWith(src.replace("./", ""))) {
    img.style.transition = "opacity 0.12s";
    img.style.opacity = "0";
    setTimeout(() => {
      img.src = src;
      img.style.opacity = "1";
    }, 120);
  } else {
    img.style.opacity = "1";
  }
}

function startPour() {
  if (pourUsed || pourPouring) return;
  pourPouring = true;
  pourLastTime = null;

  const panImg = document.getElementById("pan-img");
  panImg.style.opacity = "1";
  panImg.style.display = "block";

  function tick(ts) {
    if (!pourPouring) return;

    if (pourLastTime === null) {
      pourLastTime = ts;
      pourRAF = requestAnimationFrame(tick);
      return;
    }

    const elapsed = ts - pourLastTime;
    const speed = 2 + pourLevel * 0.18;
    const delta = (speed * elapsed) / 1000;

    pourLevel = Math.min(pourLevel + delta, 100);
    pourLastTime = ts;

    document.getElementById("pour-percent").textContent = Math.floor(pourLevel);
    updatePanImage(pourLevel);

    if (pourLevel < 100) {
      pourRAF = requestAnimationFrame(tick);
    } else {
      stopPour();
    }
  }

  pourRAF = requestAnimationFrame(tick);
}

function stopPour() {
  if (!pourPouring) return;
  pourPouring = false;
  if (pourRAF) {
    cancelAnimationFrame(pourRAF);
    pourRAF = null;
  }

  const btn = document.getElementById("pour-btn");
  btn.disabled = true;
  btn.style.opacity = "0.4";
  btn.style.cursor = "default";
  pourUsed = true;

  const pct = Math.floor(pourLevel);

  if (pct >= 80 && pct <= 85) {
    pourGrade = "good";
  } else if (pct < 80) {
    pourGrade = "less";
  } else {
    pourGrade = "over";
  }

  document.getElementById("btn-to-bake").disabled = false;
}

// ================= 굽기 =================
function initBake() {
  bakePulled = false;
  bakeElapsed = 0;
  bakeStartTS = null;

  bakeTargetTime = Math.floor(Math.random() * 11) * 0.5 + 20;

  document.getElementById("bake-result").textContent = "";
  document.getElementById("pull-btn").disabled = false;

  const targetS = Math.floor(bakeTargetTime % 60);
  const targetMs = bakeTargetTime % 1 === 0.5 ? "5" : "0";
  document.getElementById("bake-target-display").textContent =
    `목표: ${String(targetS).padStart(2, "0")}.${targetMs}`;

  updateTimerDisplay(0);

  function tick(ts) {
    if (bakePulled) return;
    if (!bakeStartTS) bakeStartTS = ts;

    bakeElapsed = (ts - bakeStartTS) / 1000;
    updateTimerDisplay(bakeElapsed);

    if (bakeElapsed > bakeTargetTime + 5) {
      pullCake();
      return;
    }

    bakeRAF = requestAnimationFrame(tick);
  }

  bakeRAF = requestAnimationFrame(tick);
}

function updateTimerDisplay(sec) {
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec % 1) * 10);

  document.getElementById("timer-sec").textContent =
    String(s).padStart(2, "0") + "." + ms;
}

function pullCake() {
  if (bakePulled) return;
  bakePulled = true;

  cancelAnimationFrame(bakeRAF);
  document.getElementById("pull-btn").disabled = true;

  const diff = bakeElapsed - bakeTargetTime;

  if (Math.abs(diff) <= 0.5) {
    bakeGrade = "good";
  } else if (diff < -0.5) {
    bakeGrade = "under";
  } else {
    bakeGrade = "over";
  }

  goStep(4);
}

// ================= 최종 결과 (s4) =================
function showFinal() {
  // 반죽
  let mixIcon, mixMsg;
  if (mixSuccess) {
    mixIcon = "✅";
    mixMsg = "재료를 완벽하게 넣었어요! 최고의 반죽이 완성됐어요~ 👏";
  } else {
    mixIcon = "❌";
    mixMsg = "반죽에 이상한 재료가 들어갔어요! 반죽이 좀 이상해~ 😅";
  }

  // 붓기
  let pourIcon, pourMsg;
  if (pourGrade === "good") {
    pourIcon = "✅";
    pourMsg = "반죽을 딱 알맞게 부었어요! 양이 정말 좋았어요~ 👍";
  } else if (pourGrade === "less") {
    pourIcon = "⚠️";
    pourMsg = "반죽량이 조금 부족했어요. 다음엔 좀 더 부어봐요!";
  } else {
    pourIcon = "⚠️";
    pourMsg = "반죽이 너무 많았어요! 흘러넘칠 뻔 했어요~ 😨";
  }

  // 굽기
  let bakeIcon, bakeMsg;
  if (bakeGrade === "good") {
    bakeIcon = "✅";
    bakeMsg = "굽기도 딱 완벽했어요! 황금빛 케이크가 완성됐어요~ 🌟";
  } else if (bakeGrade === "under") {
    bakeIcon = "⚠️";
    bakeMsg = "아직 좀 더 구워야 했어요. 속이 덜 익었을 수도 있어요!";
  } else {
    bakeIcon = "⚠️";
    bakeMsg = "조금 오래 구웠어요! 다음엔 더 빨리 꺼내봐요~ 🔥";
  }

  // 케이크 이모지
  const allGood = mixSuccess && pourGrade === "good" && bakeGrade === "good";
const goodCount = [
  mixSuccess,
  pourGrade === "good",
  bakeGrade === "good",
].filter(Boolean).length;

const s4 = document.getElementById("s4");
if (goodCount === 3) {
  s4.style.backgroundImage = "url('./img/perfect.png')";
} else if (goodCount === 2) {
  s4.style.backgroundImage = "url('./img/normal.png')";
} else {
  s4.style.backgroundImage = "url('./img/fail.png')";
}

  // 카드 렌더링
  const cards = document.getElementById("result-cards");
  if (cards) {
    cards.innerHTML = `
      <div class="result-card">
        <span class="result-card-icon">${mixIcon}</span>
        <div class="result-card-content">
          <strong>반죽</strong>
          <p>${mixMsg}</p>
        </div>
      </div>
      <div class="result-card">
        <span class="result-card-icon">${pourIcon}</span>
        <div class="result-card-content">
          <strong>반죽 붓기</strong>
          <p>${pourMsg}</p>
        </div>
      </div>
      <div class="result-card">
        <span class="result-card-icon">${bakeIcon}</span>
        <div class="result-card-content">
          <strong>굽기</strong>
          <p>${bakeMsg}</p>
        </div>
      </div>
    `;
  }

  // 총평
  const totalEl = document.getElementById("result-total");
  if (totalEl) {
    const goodCount = [
      mixSuccess,
      pourGrade === "good",
      bakeGrade === "good",
    ].filter(Boolean).length;
    if (allGood) {
      totalEl.textContent = "🏆 완벽한 케이크 완성! 정말 대단해요!";
      totalEl.className = "result-total perfect";
    } else if (goodCount === 2) {
      totalEl.textContent =
        "😊 거의 다 잘 했어요! 조금만 더 연습하면 완벽해질 거예요~";
      totalEl.className = "result-total";
    } else if (goodCount === 1) {
      totalEl.textContent = "💪 아직 더 연습이 필요해요! 다시 도전해봐요!";
      totalEl.className = "result-total";
    } else {
      totalEl.textContent = "😢 많이 아쉬웠어요... 다음엔 꼭 성공할 수 있어요!";
      totalEl.className = "result-total";
    }
  }
}

// ================= 다시 시작 =================
function restartGame() {
  // 상태 초기화
  selected = [];
  mixSuccess = true;
  pourLevel = 0;
  pourGrade = "";
  pourUsed = false;
  pourPouring = false;
  bakeGrade = "";
  bakeElapsed = 0;
  bakeStartTS = null;
  bakePulled = false;

  if (bakeRAF) cancelAnimationFrame(bakeRAF);

  // UI 초기화
  document.getElementById("s4").style.backgroundImage = "";
  document.getElementById("bowl-contents").innerHTML = "";
  document.getElementById("btn-to-pour").disabled = true;
  document.getElementById("btn-to-bake").disabled = true;
  document.getElementById("pour-percent").textContent = "0";

  const pourBtn = document.getElementById("pour-btn");
  if (pourBtn) {
    pourBtn.disabled = false;
    pourBtn.style.opacity = "1";
    pourBtn.style.cursor = "pointer";
  }

  updatePanImage(0);

  document.querySelectorAll("#s1 .controls button").forEach((btn) => {
    btn.disabled = false;
  });

  // s1 숨겨진 요소 복구
  document.querySelector(".mixing-station").style.display = "";
  document.querySelector(".controls").style.display = "";
  document.querySelector("#s1 .screen-title").style.display = "";
  document.getElementById("btn-to-pour").style.display = "";

  document.body.classList.remove("bg-oven");
  document.body.classList.add("bg-dining");

  goStep(1);
}

window.addEventListener("load", () => {
  const bgm = document.getElementById("bgm");
  bgm.volume = 0.4;
  bgm.play().catch(() => {
    document.addEventListener("click", () => bgm.play(), { once: true });
  });
  animateTitle("s1");
});