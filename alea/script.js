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
    dieSlots.length !== 5
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
      slot.classList.remove('visible', 'launching');
      slot.style.opacity = '0';
    });
  }

  function resetDieImages() {
    dieSlots.forEach((slot, index) => {
      const img = slot.querySelector('.result-die');
      if (img) {
        img.src = `dice${(index % 5) + 1}.png`;
        img.style.transform = 'translate(-50%, 0) rotate(0deg)';
      }
    });
  }

  function randomizeDicePositions() {
    const isPhone = window.innerWidth <= 640;

    const placed = [];

    // how far dice must be apart (bigger on phone)
    const minDistance = isPhone ? 18 : 14;

    dieSlots.forEach((slot, index) => {
        let tries = 0;
        let pos;

        do {
        pos = {
            left: randomInt(20, 80),
            bottom: isPhone
            ? randomInt(12, 32)   // more vertical space on phone
            : randomInt(10, 26)
        };

        tries++;

        // stop infinite loop just in case
        if (tries > 50) break;

        } while (
        placed.some(p => {
            const dx = p.left - pos.left;
            const dy = p.bottom - pos.bottom;
            return Math.sqrt(dx * dx + dy * dy) < minDistance;
        })
        );

        placed.push(pos);

        const img = slot.querySelector('.result-die');

        const rot = randomInt(-18, 18);

        slot.style.left = `${pos.left}%`;
        slot.style.bottom = `${pos.bottom}%`;

        if (img) {
        img.style.transform = `translate(-50%, 0) rotate(${rot}deg)`;
        }
    });
  }

  function launchDiceFromTower(values) {
    randomizeDicePositions();

    dieSlots.forEach((slot, index) => {
      const img = slot.querySelector('.result-die');

      if (img) {
        img.src = `dice${values[index]}.png`;
      }

      slot.classList.remove('visible', 'launching');

      // start near tower exit
      slot.style.opacity = '0';
      slot.style.transform = 'translate(-50%, -180px) scale(0.45)';

      setTimeout(() => {
        slot.classList.add('launching');
      }, 60 * index);

      setTimeout(() => {
        slot.classList.remove('launching');
        slot.classList.add('visible');
        slot.style.opacity = '1';
        slot.style.transform = 'translate(-50%, 0) scale(1)';
      }, 220 + (90 * index));
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
      launchDiceFromTower(values);
      rolling = false;
    }, 950);
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
  resetBtn.addEventListener('click', resetGame);
  dieTrigger.addEventListener('click', rollDice);

  resetGame();
});
