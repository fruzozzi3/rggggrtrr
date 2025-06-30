const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

let userBalance = 0;
let userInventory = [];
let currentCase = null;
let isSpinning = false;
let isFreeCaseCodeUsed = false;

// Mapping prize icons to actual image files
const prizeImages = {
    '🔮': 'images/crystal.png',
    '🌸': 'images/sakura.png',
    '💎': 'images/ring.png',
    '🏆': 'images/ringo.png',
    '⭐': 'images/bear.png',
    '🎯': 'images/happy.png',
    '🎪': 'images/love.png',
    '🎨': 'images/pani.png'
};

const cases = {
    free: {
        title: 'Бесплатный кейс',
        cost: 0,
        prizes: [
            { name: 'Crystal Ball', icon: '🔮', price: 9.28 },
            { name: 'Flow Sakura', icon: '🌸', price: 5.46 },
            { name: 'Signet Ring', icon: '💎', price: 34.81 },
            { name: 'Diamond Ring', icon: '🏆', price: 19.49 },
            { name: 'Toy Bear', icon: '⭐', price: 25.86 },
            { name: 'Happy Birthday', icon: '🎯', price: 2.2 },
            { name: 'Love Potition', icon: '🎪', price: 10.68 },
            { name: 'Jelly Bunny', icon: '🎨', price: 4.34 }
        ],
        needsCode: true
    }
};

// <-- ОБНОВЛЕНО: Добавлено сворачивание приложения и изменен стиль оповещения -->
function initiateWithdrawal() {
    if (userInventory.length === 0) {
        showErrorModal('Инвентарь пуст', 'У вас нет подарков для вывода.', 'Сначала выиграйте что-нибудь, открыв кейс!');
        return;
    }
    const botUsername = 'CaseRoulette_bot';
    const commandPayload = 'with';
    const url = `https://t.me/${botUsername}?start=${commandPayload}`;
    tg.openTelegramLink(url);
    tg.close(); // <-- Эта команда сворачивает мини-приложение
}

function updateWithdrawButtonState() {
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (userInventory.length > 0) {
        withdrawBtn.disabled = false;
        withdrawBtn.textContent = `Вывести подарки (${userInventory.length} шт.)`;
    } else {
        withdrawBtn.disabled = true;
        withdrawBtn.textContent = 'Нет подарков для вывода';
    }
}

function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    if (viewId === 'homeView') {
        document.getElementById('navHome').classList.add('active');
    } else if (viewId === 'profileView') {
        document.getElementById('navProfile').classList.add('active');
    }
}

function renderInventory() {
    const inventoryGrid = document.getElementById('inventoryGrid');
    inventoryGrid.innerHTML = '';
    if (userInventory.length === 0) {
        inventoryGrid.innerHTML = '<div class="inventory-placeholder">Тут пока пусто. Откройте кейс, чтобы выиграть свой первый подарок!</div>';
    } else {
        userInventory.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'inventory-item';
            const prizeImageSrc = prizeImages[item.icon] || '';
            itemDiv.innerHTML = `
                <img src="${prizeImageSrc}" alt="${item.name}" class="inventory-item-image">
                <div class="inventory-item-name">${item.name}</div>
            `;
            inventoryGrid.appendChild(itemDiv);
        });
    }
    updateWithdrawButtonState();
}

function loadUserProfile() {
    const user = tg.initDataUnsafe?.user;
    if (user) {
        const avatarEl = document.getElementById('userAvatar');
        if (user.photo_url) {
            avatarEl.src = user.photo_url;
        }
        const nameEl = document.getElementById('userName');
        const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
        nameEl.textContent = fullName || user.username || 'Пользователь';
        const idEl = document.getElementById('userId');
        idEl.textContent = `ID: ${user.id}`;
    }
}

function showErrorModal(title, notice, subtext) {
    document.getElementById('disabledTitle').textContent = title;
    document.getElementById('disabledNoticeText').innerHTML = notice;
    document.getElementById('disabledSubText').textContent = subtext;
    document.getElementById('disabledModal').style.display = 'flex';
}

function connectWallet() {
    showErrorModal(
        'Функция недоступна',
        '⚠️ Подключение кошелька находится в разработке',
        'Эта возможность появится после завершения бета-тестирования. Спасибо за ваше терпение!'
    );
}

function showDisabledNotice(caseTitle) {
    showErrorModal(
        caseTitle,
        '⚠️ Данный кейс временно не работает',
        'Мы работаем над добавлением новых кейсов. Скоро они станут доступными!'
    );
}

function closeDisabledModal() {
    document.getElementById('disabledModal').style.display = 'none';
}

function renderPrizeIcon(icon) {
    const imageUrl = prizeImages[icon];
    if (imageUrl) {
        return `<img src="${imageUrl}" alt="Prize">`;
    }
    return icon;
}

function generateRouletteItems(prizes) {
    const track = document.getElementById('rouletteTrack');
    track.innerHTML = '';
    track.style.transform = 'translateX(0)';
    const extendedPrizes = [];
    for (let i = 0; i < 10; i++) {
        extendedPrizes.push(...prizes);
    }
    extendedPrizes.forEach((prize) => {
        const item = document.createElement('div');
        item.className = 'roulette-item';
        item.innerHTML = `
            <span class="prize-icon">${renderPrizeIcon(prize.icon)}</span>
            <div class="prize-value">${prize.name}</div>
            <div class="prize-price-tag">${prize.price} TON</div>
        `;
        track.appendChild(item);
    });
}

function openCase(caseType, title) {
    if (isSpinning) return;
    currentCase = cases[caseType];
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('caseModal').style.display = 'flex';
    const codeInput = document.getElementById('secretCode');
    codeInput.style.display = currentCase.needsCode ? 'block' : 'none';
    generateRouletteItems(currentCase.prizes);
}

function closeModal() {
    if (isSpinning) return;
    document.getElementById('caseModal').style.display = 'none';
    currentCase = null;
}

// <-- ОБНОВЛЕНО: Изменен заголовок и подзаголовок в окне выигрыша -->
function showWinModal(wonPrize) {
    const prizeImageSrc = prizeImages[wonPrize.icon] || '';
    document.getElementById('winModalImage').src = prizeImageSrc;
    document.getElementById('winModalTitle').textContent = `Вы выиграли: ${wonPrize.name}`;
    document.getElementById('winModalSubText').textContent = 'Чтобы забрать свой приз, перейдите во вкладку "Профиль" и нажмите "Вывести подарки".';
    document.getElementById('winModal').style.display = 'flex';
}

function closeWinModal() {
    document.getElementById('winModal').style.display = 'none';
    const spinButton = document.getElementById('spinButton');
    isSpinning = false;
    spinButton.disabled = false;
    spinButton.textContent = 'Крутить';
    document.getElementById('secretCode').value = '';
    closeModal();
}

function spinRoulette() {
    if (isSpinning || !currentCase) return;

    if (currentCase.needsCode) {
        const secretCode = document.getElementById('secretCode').value;

        if (!secretCode) {
            showErrorModal('Ошибка', '❌ Введите секретный код!', 'Поле для ввода кода не может быть пустым.');
            return;
        }

        if (isFreeCaseCodeUsed) {
            showErrorModal('Код использован', '❌ Этот код уже был использован!', 'Вы можете использовать этот код только один раз.');
            return;
        }

        if (secretCode.toLowerCase() !== 'case') {
            showErrorModal('Ошибка кода', '❌ Неверный секретный код!', 'Пожалуйста, проверьте правильность ввода и попробуйте снова.');
            return;
        }

        isFreeCaseCodeUsed = true;
    }

    if (!currentCase.needsCode && userBalance < currentCase.cost) {
        showErrorModal('Ошибка', '❌ Недостаточно средств!', `На вашем балансе ${userBalance} TON, а требуется ${currentCase.cost} TON.`);
        return;
    }

    isSpinning = true;
    const spinButton = document.getElementById('spinButton');
    spinButton.disabled = true;
    spinButton.textContent = 'Крутим...';
    document.querySelectorAll('.roulette-item').forEach(item => {
        item.classList.remove('winner');
    });
    const wonPrizeIndex = Math.floor(Math.random() * currentCase.prizes.length);
    const wonPrize = currentCase.prizes[wonPrizeIndex];
    const track = document.getElementById('rouletteTrack');
    const items = track.children;
    const itemWidth = items[0].offsetWidth;
    const itemMargin = parseInt(window.getComputedStyle(items[0]).marginRight) * 2;
    const totalItemWidth = itemWidth + itemMargin;
    const middleOfReel = Math.floor(items.length / 2);
    const targetItemIndex = middleOfReel - (middleOfReel % currentCase.prizes.length) + wonPrizeIndex;
    const targetItem = items[targetItemIndex];
    const rouletteContainer = document.getElementById('rouletteContainer');
    const containerCenter = rouletteContainer.offsetWidth / 2;
    const targetItemCenter = targetItem.offsetLeft + (totalItemWidth / 2);
    const finalTranslateX = containerCenter - targetItemCenter;
    track.style.transform = `translateX(${finalTranslateX}px)`;
    setTimeout(() => {
        targetItem.classList.add('winner');
        userInventory.push(wonPrize);
        renderInventory();
        setTimeout(() => {
            showWinModal(wonPrize);
        }, 1000);
    }, 5000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    showView('homeView');
    renderInventory();
});

window.onclick = function(event) {
    const caseModal = document.getElementById('caseModal');
    const disabledModal = document.getElementById('disabledModal');
    if (event.target === caseModal) {
        closeModal();
    }
    if (event.target === disabledModal) {
        closeDisabledModal();
    }
}
