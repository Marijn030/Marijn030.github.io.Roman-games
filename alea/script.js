// 3D dice click + random roll

const dice = document.getElementById("dice3d");
const resultContainer = document.getElementById("results");

// make sure 5 dice exist
function createDiceSlots() {
  resultContainer.innerHTML = "";

  for (let i = 0; i < 5; i++) {
    const img = document.createElement("img");
    img.className = "result-dice";
    img.src = "dice1.png"; // default
    resultContainer.appendChild(img);
  }
}

createDiceSlots();

// random number 1–6
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// animate + roll
dice.addEventListener("click", () => {
  dice.classList.add("rolling");

  setTimeout(() => {
    dice.classList.remove("rolling");

    const diceImages = document.querySelectorAll(".result-dice");

    diceImages.forEach((img) => {
      const value = rollDice();
      img.src = `dice${value}.png`;
    });

  }, 1000); // animation duration
});
