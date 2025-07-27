document.addEventListener('DOMContentLoaded', function() {
  // Инициализация элементов
  const paymentTypeSelect = document.getElementById('paymentType');
  const daysGroup = document.getElementById('daysGroup');
  const calculateBtn = document.getElementById('calculateBtn');
  const resultDiv = document.getElementById('result');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');

  // Автоматическая вставка двоеточия
  function formatTimeInput(input) {
    let value = input.value.replace(/[^\d]/g, '');
    
    if (value.length > 2) {
      value = value.substring(0, 2) + ':' + value.substring(2, 4);
    }
    
    if (value.length > 5) {
      value = value.substring(0, 5);
    }
    
    input.value = value;
  }

  // Обработчики событий для полей времени
  startTimeInput.addEventListener('input', function() {
    formatTimeInput(this);
  });

  endTimeInput.addEventListener('input', function() {
    formatTimeInput(this);
  });

  // Упрощенные данные тарифов (только будни, 3 временных интервала)
  const priceData = {
    '8:00 - 18:00': { разовое: 2500, абонемент: 2000, код: 5 },
    '18:00 - 22:00': { разовое: 2800, абонемент: 2500, код: 2 },
    '22:00 - 8:00': { разовое: 2200, абонемент: 1800, код: 1 }
  };

  // Обработчик изменения типа оплаты
  paymentTypeSelect.addEventListener('change', function() {
    daysGroup.style.display = this.value === 'абонемент' ? 'block' : 'none';
  });

  // Обработчик нажатия кнопки расчета
  calculateBtn.addEventListener('click', calculatePrice);

  function timeToMinutes(time) {
    if (time.indexOf(':') === -1 && time.length > 0) {
      time = time + ':00';
    }
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  function getRateForTime(minutes) {
    // Особый случай для ночного времени (22:00-8:00)
    if (minutes >= 22*60 || minutes < 8*60) {
      return priceData['22:00 - 8:00'];
    }
    
    for (const [range, rate] of Object.entries(priceData)) {
      if (range === '22:00 - 8:00') continue; // уже обработали
      
      const [start, end] = range.split(' - ').map(timeToMinutes);
      if (minutes >= start && minutes < end) return rate;
    }

    return null;
  }

  function calculateBookingCost(startTime, endTime, paymentType, days = 1) {
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    
    if (startMinutes >= endMinutes) {
      return 'Некорректный временной интервал';
    }

    let totalCost = 0;
    let currentMinute = startMinutes;

    while (currentMinute < endMinutes) {
      const rate = getRateForTime(currentMinute);
      if (!rate) return 'Часть бронирования вне рабочего времени';

      let periodEnd;
      
      // Определяем конец текущего тарифного периода
      if (currentMinute >= 22*60 || currentMinute < 8*60) {
        // Ночной тариф
        periodEnd = Math.min(
          endMinutes,
          currentMinute < 8*60 ? 8*60 : 24*60, // до 8 утра или до конца суток
          currentMinute + (24*60 - currentMinute) // переход через полночь
        );
      } else {
        // Дневной или вечерний тариф
        for (const [range] of Object.entries(priceData)) {
          if (range === '22:00 - 8:00') continue;
          
          const [start, end] = range.split(' - ').map(timeToMinutes);
          if (currentMinute >= start && currentMinute < end) {
            periodEnd = Math.min(end, endMinutes);
            break;
          }
        }
      }

      const durationHours = (periodEnd - currentMinute) / 60;
      totalCost += durationHours * rate[paymentType];
      currentMinute = periodEnd;
      
      // Если перешли через полночь, сбрасываем счетчик
      if (currentMinute >= 24*60) {
        currentMinute = 0;
      }
    }

    if (paymentType === 'абонемент') {
      totalCost *= days;
    }

    return Math.round(totalCost);
  }

  function calculatePrice() {
    const normalizeTime = (time) => {
      if (!time.includes(':') && time.length > 0) {
        return time + ':00';
      }
      return time;
    };

    const startTime = normalizeTime(startTimeInput.value);
    const endTime = normalizeTime(endTimeInput.value);
    const paymentType = document.getElementById('paymentType').value;
    const days = paymentType === 'абонемент' ? parseInt(document.getElementById('days').value) : 1;

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime)) {
      showResult('Ошибка: неверный формат времени начала (используйте ЧЧ:ММ)', true);
      return;
    }

    if (!timeRegex.test(endTime)) {
      showResult('Ошибка: неверный формат времени окончания (используйте ЧЧ:ММ)', true);
      return;
    }

    const cost = calculateBookingCost(startTime, endTime, paymentType, days);

    if (typeof cost === 'string') {
      showResult(cost, true);
    } else {
      let message = `Стоимость бронирования: ${cost} рублей`;
      if (paymentType === 'абонемент' && days > 1) {
        message += ` (за ${days} дней)`;
      }
      showResult(message, false);
    }
  }

  function showResult(message, isError) {
    resultDiv.textContent = message;
    resultDiv.className = isError ? 'result error' : 'result success';
    resultDiv.style.display = 'block';
  }
});