const spreadPositions = [
    { position: 1, header: "The Present", explanation: "The current situation or the querent's current state." },
    { position: 2, header: "The Challenge", explanation: "The obstacle or challenge currently facing the querent." },
    { position: 3, header: "The Past", explanation: "Influences from the past that are affecting the present situation." },
    { position: 4, header: "The Future", explanation: "The immediate future or upcoming influences." },
    { position: 5, header: "Above", explanation: "The querent's goals, aspirations, or highest potential in the situation." },
    { position: 6, header: "Below", explanation: "Subconscious influences or underlying factors." },
    { position: 7, header: "Advice", explanation: "The querent's approach or attitude toward the situation." },
    { position: 8, header: "External Influences", explanation: "How others or external factors are affecting the situation." },
    { position: 9, header: "Hopes and Fears", explanation: "The querent's hopes, fears, or hidden emotions." },
    { position: 10, header: "Outcome", explanation: "The potential outcome or resolution of the situation." }
];

const base62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const cardMap = {};
const reverseCardMap = {};

function initializeCardMap() {
    let index = 0;
    deck.forEach(card => {
        const id = encodeBase62(index);
        cardMap[card.name] = id;
        reverseCardMap[id] = card.name;
        index++;
    });
}

function encodeBase62(number) {
    let encoded = '';
    do {
        encoded = base62[number % 62] + encoded;
        number = Math.floor(number / 62);
    } while (number > 0);
    return encoded.padStart(2, '0'); // Ensure two-character encoding
}

function decodeBase62(string) {
    return string.split('').reverse().reduce((acc, char, index) => {
        return acc + base62.indexOf(char) * Math.pow(62, index);
    }, 0);
}

function encodeSpreadState(spreadState) {
    const significatorId = cardMap[spreadState.significator];
    if (!significatorId) {
        console.error(`Significator "${spreadState.significator}" not found in cardMap.`);
        return '';
    }
    const drawnCardsIds = spreadState.drawnCards.map(card => {
        const cardId = cardMap[card.name];
        if (!cardId) {
            console.error(`Card "${card.name}" not found in cardMap.`);
            return '';
        }
        const orientationId = card.orientation === 'Upright' ? 'U' : 'R';
        return cardId + orientationId;
    }).join('');
    return significatorId + drawnCardsIds;
}

function decodeSpreadState(encodedState) {
    const significatorId = encodedState.substring(0, 2);
    const significator = reverseCardMap[significatorId];
    if (!significator) {
        console.error(`Significator ID "${significatorId}" not found in reverseCardMap.`);
        return { significator: null, drawnCards: [] };
    }
    const drawnCards = [];
    for (let i = 2; i < encodedState.length; i += 3) {
        const cardId = encodedState.substring(i, i + 2);
        const orientationId = encodedState.charAt(i + 2);
        const cardName = reverseCardMap[cardId];
        if (!cardName) {
            console.error(`Card ID "${cardId}" not found in reverseCardMap.`);
            continue;
        }
        const orientation = orientationId === 'U' ? 'Upright' : 'Reversed';
        drawnCards.push({ name: cardName, orientation });
    }
    return { significator, drawnCards };
}

let deck = [];
let drawnCards = [];
let currentCardIndex = 0;
let significator = null;

async function fetchDeck() {
    const response = await fetch('tarot_deck.json');
    deck = await response.json();
    initializeCardMap();
    populateSignificatorDropdown();
    checkForSavedSpread();
}

function populateSignificatorDropdown() {
    const dropdown = document.getElementById('significator');
    const magicianAndHighPriestess = deck.filter(card => card.name === "The Magician" || card.name === "The High Priestess");
    const otherCards = deck.filter(card => card.name !== "The Magician" && card.name !== "The High Priestess");

    const sortedDeck = [...magicianAndHighPriestess, ...otherCards];

    sortedDeck.forEach(card => {
        const option = document.createElement('option');
        option.value = card.name;
        option.textContent = card.name;
        dropdown.appendChild(option);
    });
}

function selectSignificator() {
    const dropdown = document.getElementById('significator');
    const selectedCardName = dropdown.value;
    if (!selectedCardName) return;

    significator = deck.find(card => card.name === selectedCardName);
    deck = deck.filter(card => card.name !== selectedCardName);

    const cardElement = document.getElementById('card1');
    cardElement.innerHTML = `<div class="card-name">${significator.name}</div>`;
    cardElement.style.display = 'flex';

    const descriptionElement = document.getElementById('description');
    descriptionElement.innerHTML = `
        <h3>Significator</h3>
        <p><strong>This card represents the significator, setting the stage for the reading.</strong></p>
        <p><strong>${significator.name}</strong>: ${significator.meaning_upright}</p>
    `;

    document.getElementById('draw-button').disabled = false;
    document.getElementById('reset-button').style.display = 'inline-block';
}

function drawNextCard() {
    if (currentCardIndex >= 10) {
        alert("All cards have been drawn.");
        return;
    }

    if (currentCardIndex === 0) {
        document.getElementById('significator').disabled = true;
    }

    const cardIndex = Math.floor(Math.random() * deck.length);
    const card = deck.splice(cardIndex, 1)[0];
    const isReversed = Math.random() < 0.5;
    const orientation = isReversed ? 'Reversed' : 'Upright';

    drawnCards.push({ ...card, orientation });

    const position = currentCardIndex + 1;
    const cardElement = document.getElementById(`card${position}`);
    cardElement.innerHTML = `<div class="card-name${isReversed ? ' reversed' : ''}">${card.name}</div>`;
    cardElement.style.display = 'flex';

    showDescription(card, isReversed, position);
    currentCardIndex++;

    if (currentCardIndex >= 10) {
        document.getElementById('share-button').style.display = 'inline-block';
    }
}

function showDescription(card, isReversed, position) {
    const descriptionElement = document.getElementById("description");
    const meaning = isReversed ? card.meaning_reversed : card.meaning_upright;
    const spreadInfo = spreadPositions.find(sp => sp.position === position);

    descriptionElement.innerHTML += `
        <h3>${position}. ${spreadInfo.header}</h3>
        <p><strong>${spreadInfo.explanation}</strong></p>
        <p><strong>${card.name}</strong>${isReversed ? ' (Reversed)' : ''}: ${meaning}</p>
    `;
}

function generateShareableURL() {
    const spreadState = {
        significator: significator.name,
        drawnCards: drawnCards.map(card => ({
            name: card.name,
            orientation: card.orientation
        }))
    };
    const encodedSpread = encodeSpreadState(spreadState);
    if (encodedSpread) {
        const shareableURL = `${window.location.origin}${window.location.pathname}#${encodedSpread}`;
        navigator.clipboard.writeText(shareableURL).then(() => {
            alert("Shareable URL copied to clipboard!");
        }).catch(err => {
            console.error("Failed to copy URL: ", err);
            alert("Failed to copy URL. Please try again.");
        });
    } else {
        alert("Error generating shareable URL. Please try again.");
    }
}

function checkForSavedSpread() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const spreadState = decodeSpreadState(hash);
        recreateSpread(spreadState);
    }
}

// Add a hash change listener to reload the page if the hash changes
window.addEventListener('hashchange', () => {
    checkForSavedSpread();
    window.location.reload();
});

function recreateSpread(spreadState) {
    if (!spreadState.significator) {
        console.error("Invalid significator in saved spread state.");
        return;
    }
    significator = deck.find(card => card.name === spreadState.significator);
    deck = deck.filter(card => card.name !== spreadState.significator);
    drawnCards = spreadState.drawnCards.map(card => {
        const foundCard = deck.find(deckCard => deckCard.name === card.name);
        if (!foundCard) {
            console.error(`Card "${card.name}" not found in deck.`);
            return null;
        }
        deck = deck.filter(deckCard => deckCard.name !== card.name);
        return { ...foundCard, orientation: card.orientation };
    }).filter(card => card !== null);
    currentCardIndex = drawnCards.length;

    const dropdown = document.getElementById('significator');
    dropdown.value = significator.name;
    dropdown.disabled = true;

    const cardElement = document.getElementById('card1');
    cardElement.innerHTML = `<div class="card-name">${significator.name}</div>`;
    cardElement.style.display = 'flex';

    const descriptionElement = document.getElementById('description');
    descriptionElement.innerHTML = `
        <h3>Significator</h3>
        <p><strong>This card represents the significator, setting the stage for the reading.</strong></p>
        <p><strong>${significator.name}</strong>: ${significator.meaning_upright}</p>
    `;

    drawnCards.forEach((card, index) => {
        const position = index + 1;
        const cardElement = document.getElementById(`card${position}`);
        cardElement.innerHTML = `<div class="card-name${card.orientation === 'Reversed' ? ' reversed' : ''}">${card.name}</div>`;
        cardElement.style.display = 'flex';
        showDescription(card, card.orientation === 'Reversed', position);
    });

    document.getElementById('draw-button').disabled = true;
    document.getElementById('share-button').style.display = 'inline-block';
    document.getElementById('reset-button').style.display = 'inline-block';
}

// Function to reset the spread (optional)
function resetSpread() {
    drawnCards = [];
    currentCardIndex = 0;
    significator = null;
    document.getElementById("description").innerHTML = "";
    document.getElementById("significator").value = "";
    document.getElementById("significator").disabled = false;
    document.getElementById("draw-button").disabled = true;
    document.getElementById("share-button").style.display = 'none';
    document.getElementById("reset-button").style.display = 'none';
    window.location.hash = '';

    for (let i = 1; i <= 10; i++) {
        const cardElement = document.getElementById(`card${i}`);
        cardElement.innerHTML = "";
        cardElement.style.display = 'none';
    }

    fetchDeck(); // Reload the deck with all cards (optional)
}

// Fetch the deck when the page loads
window.onload = fetchDeck;
