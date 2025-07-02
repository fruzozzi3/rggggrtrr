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
    '🎨': 'images/pani.png',
    '💨': 'images/nothing.png' // Иконка для "Ничего" (можно создать пустое изображение)
};

const cases = {
    free: {
        title: 'Бесплатный кейс',
        cost: 0,
        prizes: [
            // <-- ОБНОВЛЕНО: Добавлен приз "Ничего" -->
            { name: 'Ничего', icon: '💨', price: 0 },
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

function initiateWithdrawal() {
    if (userInventory.length === 0) {
        showErrorModal('Инвентарь пуст', 'У вас нет подарков для вывода.', 'Сначала выиграйте что-нибудь, открыв кейс!');
        return;
    }
    const botUsername = 'CaseRoulette_bot';
    const commandPayload = 'with';
    const url = `https://t.me/${botUsername}?start=${commandPayload}`;
    tg.openTelegramLink(url);
    tg.close();
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

// <-- ОБНОВЛЕНО: Логика для добавления "Ничего" в 4 раза чаще -->
function generateRouletteItems(prizes) {
    const track = document.getElementById('rouletteTrack');
    track.innerHTML = '';
    track.style.transition = 'none'; // Сброс анимации
    track.style.transform = 'translateX(0)';

    // Создаем визуальный список, где "Ничего" встречается в 4 раза чаще
    const visualPrizes = [];
    prizes.forEach(prize => {
        if (prize.name === 'Ничего') {
            // Добавляем "Ничего" четыре раза
            visualPrizes.push(prize, prize, prize, prize);
        } else {
            // Остальные призы добавляем один раз
            visualPrizes.push(prize);
        }
    });

    // Перемешиваем для случайного порядка
    visualPrizes.sort(() => Math.random() - 0.5);

    const extendedPrizes = [];
    for (let i = 0; i < 15; i++) {
        extendedPrizes.push(...visualPrizes);
    }

    extendedPrizes.forEach((prize) => {
        const item = document.createElement('div');
        item.className = 'roulette-item';
        item.innerHTML = `
            <span class="prize-icon">${renderPrizeIcon(prize.icon)}</span>
            <div class="prize-value">${prize.name}</div>
            <div class="prize-price-tag">${prize.price > 0 ? prize.price + ' TON' : ''}</div>
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

// <-- ОБНОВЛЕНО: Полностью переработана логика вращения для плавности и гарантированного выигрыша -->
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
    document.querySelectorAll('.roulette-item').forEach(item => item.classList.remove('winner'));

    // 1. Отфильтровываем "Ничего", чтобы пользователь всегда выигрывал реальный приз
    const actualPrizes = currentCase.prizes.filter(p => p.name !== 'Ничего');
    const wonPrize = actualPrizes[Math.floor(Math.random() * actualPrizes.length)];

    const track = document.getElementById('rouletteTrack');
    const items = Array.from(track.children);
    const itemWidth = items[0].offsetWidth;
    const itemMargin = parseInt(window.getComputedStyle(items[0]).marginRight) * 2;
    const totalItemWidth = itemWidth + itemMargin;

    // 2. Находим выигрышный предмет в середине ленты для плавной остановки
    // Ищем подальше от начала, чтобы анимация была длинной
    const middleIndex = Math.floor(items.length / 2);
    let targetItemIndex = -1;
    for (let i = middleIndex; i < items.length; i++) {
        if (items[i].querySelector('.prize-value').textContent === wonPrize.name) {
            targetItemIndex = i;
            break;
        }
    }
    // Если вдруг не нашли (маловероятно), ищем с начала
    if (targetItemIndex === -1) {
        for (let i = 0; i < middleIndex; i++) {
            if (items[i].querySelector('.prize-value').textContent === wonPrize.name) {
                targetItemIndex = i;
                break;
            }
        }
    }

    const targetItem = items[targetItemIndex];
    
    // 3. Вычисляем позицию для остановки
    const rouletteContainer = document.getElementById('rouletteContainer');
    const containerCenter = rouletteContainer.offsetWidth / 2;
    // Добавляем небольшое случайное смещение для большей естественности
    const randomOffset = (Math.random() - 0.5) * (itemWidth * 0.6);
    const targetPosition = targetItem.offsetLeft + (totalItemWidth / 2) - containerCenter + randomOffset;
    
    // 4. Запускаем плавную и долгую анимацию
    const spinDuration = 7000; // 7 секунд
    track.style.transition = `transform ${spinDuration}ms cubic-bezier(0.1, 0.5, 0.2, 1)`; // Плавное затухание
    track.style.transform = `translateX(-${targetPosition}px)`;

    // 5. По завершении анимации показываем результат
    setTimeout(() => {
        targetItem.classList.add('winner');
        userInventory.push(wonPrize);
        renderInventory();
        setTimeout(() => {
            showWinModal(wonPrize);
        }, 1000); // Показать модальное окно через 1 сек после остановки
    }, spinDuration);
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
        if (!isSpinning) closeModal();
    }
    if (event.target === disabledModal) {
        closeDisabledModal();
    }
}
