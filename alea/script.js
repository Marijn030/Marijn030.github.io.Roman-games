document.addEventListener('DOMContentLoaded', () => {
  const tableScene = document.getElementById('tableScene');
  const rollBtn = document.getElementById('rollBtn');
  const resetBtn = document.getElementById('resetBtn');
  const dieTrigger = document.getElementById('dieTrigger');
  const resultSummary = document.getElementById('resultSummary');
  const totalValue = document.getElementById('totalValue');
  const dieSlots = Array.from(document.querySelectorAll('.die-slot'));

  if (
    !tableScene ||
    !rollBtn ||
    !resetBtn ||
    !dieTrigger ||
    !resultSummary ||
    !totalValue ||
    dieSlots.length === 0
  ) {
    console.error('Missing required dice game elements.');
    return;
  }

  let rolling = false;

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function createRoll() {
    return Array.from({ length: 5 }, () => randomInt(1, 6));
  }

  function updateSummary(values) {
    const total = values.reduce((sum, value) => sum + value, 0);
    resultSummary.textContent = values.join(' - ');
    totalValue.textContent = String(total);
  }

  function hideResults() {
    dieSlots.forEach((slot) => {
      slot.classList.remove('visible');
    });
  }

  function resetDieImages() {
    dieSlots.forEach((slot, index) => {
      const img = slot.querySelector('.result-die');
      if (img) {
        img.src = `dice${Math.min(index + 1, 5)}.png`;
        img.style.transform = 'translate(-50%, 0) rotate(0deg)';
      }
    });
  }

  function randomizeDicePositions() {
    // 5 fixed zones so dice don't overlap
    const zones = [
      { left: 18, bottom: 8, rotate: -12 },
      { left: 34, bottom: 4, rotate: 9 },
      { left: 50, bottom: 10, rotate: -6 },
      { left: 66, bottom: 5, rotate: 11 },
      { left: 82, bottom: 9, rotate: -10 }
    ];

    const shuffledZones = [...zones].sort(() => Math.random() - 0.5);

    dieSlots.forEach((slot, index) => {
      const img = slot.querySelector('.result-die');
      const zone = shuffledZones[index];

      const leftJitter = randomInt(-2, 2);
      const bottomJitter = randomInt(-2, 2);
      const rotateJitter = randomInt(-5, 5);

      slot.style.left = `${zone.left + leftJitter}%`;
      slot.style.bottom = `${zone.bottom + bottomJitter}%`;

      if (img) {
        img.style.transform = `translate(-50%, 0) rotate(${zone.rotate + rotateJitter}deg)`;
      }
    });
  }

  function showResults(values) {
    randomizeDicePositions();

    dieSlots.forEach((slot, index) => {
      const img = slot.querySelector('.result-die');

      if (img) {
        img.src = `dice${values[index]}.png`;
      }

      setTimeout(() => {
        slot.classList.add('visible');
      }, index * 90);
    });

    updateSummary(values);
  }

  function rollDice() {
    if (rolling) return;

    rolling = true;
    tableScene.classList.add('rolling');
    hideResults();

    resultSummary.textContent = 'Dobbelstenen rollen...';
    totalValue.textContent = '...';

    const values = createRoll();

    setTimeout(() => {
      tableScene.classList.remove('rolling');
      showResults(values);
      rolling = false;
    }, 900);
  }

  function resetGame() {
    rolling = false;
    tableScene.classList.remove('rolling');
    hideResults();
    resetDieImages();
    randomizeDicePositions();
    resultSummary.textContent = 'Nog niet gegooid';
    totalValue.textContent = '0';
  }

  rollBtn.addEventListener('click', rollDice);
  dieTrigger.addEventListener('click', rollDice);
  resetBtn.addEventListener('click', resetGame);

  resetGame();
});
